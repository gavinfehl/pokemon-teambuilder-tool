'use client';
import React, { useState } from 'react';
import {
  calculate,
  Pokemon as CalcPokemon,
  Move    as CalcMove,
  type GenerationNum,
} from '@smogon/calc';

// ── Types ────────────────────────────────────────────────────────────────────

interface StatBlock {
  hp: number; atk: number; def: number; spa: number; spd: number; spe: number;
}

interface HitResult {
  label:      string;
  moveName:   string;
  spreadDesc: string;
  fullDesc:   string;
  koN:        number;
  koChance:   number;
  koText:     string;
  minPct:     number;
  maxPct:     number;
}

interface MoveAlt {
  result:       HitResult;
  coverageNote: 'gap' | 'tradeoff' | 'snipe';
  usage:        number;  // attacker's smogon move usage (0–1)
}

interface AttackerGroup {
  species:      string;
  usage:        number;
  atkSpeed:     number;   // attacker's calculated Speed stat
  outspeeds:    boolean;  // attacker moves before the player
  moveName:     string;
  moveCat:      'Physical' | 'Special' | 'Status';
  vsYours:      HitResult;         // their top set vs your current spread
  vsNoInvest:   HitResult | null;  // their top set vs 0 EVs Hardy
  vsMaxDef:     HitResult | null;  // their top set vs 252 HP / 252 Def Bold
  vsMaxSpD:     HitResult | null;  // their top set vs 252 HP / 252 SpD Calm
  vsMaxThreat:  HitResult | null;  // their 252+ CB/CS vs your current spread
  moveAlts:     MoveAlt[];         // other smogon-tracked moves that would threaten you more
  coverageNote: 'gap' | 'tradeoff' | 'snipe' | null;
  isBreakpoint: boolean;  // your spread is at the KO roll threshold
  isDanger:     boolean;  // they can OHKO you on your current spread
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STAT_KEYS: (keyof StatBlock)[] = ['hp','atk','def','spa','spd','spe'];
const STAT_LABEL: Record<keyof StatBlock, string> = {
  hp:'HP', atk:'Atk', def:'Def', spa:'SpA', spd:'SpD', spe:'Spe',
};
const NATURES = [
  'Hardy','Lonely','Brave','Adamant','Naughty',
  'Bold','Docile','Relaxed','Impish','Lax',
  'Timid','Hasty','Serious','Jolly','Naive',
  'Modest','Mild','Quiet','Bashful','Rash',
  'Calm','Gentle','Sassy','Careful','Quirky',
];
const DEFAULT_EVS: StatBlock = { hp:252, atk:0, def:0, spa:0, spd:252, spe:4 };
const DEFAULT_IVS: StatBlock = { hp:31, atk:31, def:31, spa:31, spd:31, spe:31 };
const ZERO_EVS:    StatBlock = { hp:0, atk:0, def:0, spa:0, spd:0, spe:0 };
const MEANINGFUL_MOVE_THRESHOLD = 0.05;

// ── Helpers ───────────────────────────────────────────────────────────────────

function getGenNum(format: string): GenerationNum {
  const n = parseInt(format.match(/gen(\d)/i)?.[1] ?? '9');
  return Math.min(Math.max(n, 1), 9) as GenerationNum;
}

function parseSpread(s: string): { nature: string; evs: StatBlock } {
  const [nature, evStr = '0/0/0/0/0/0'] = s.split(':');
  const [hp, atk, def, spa, spd, spe] = evStr.split('/').map(Number);
  return { nature, evs: { hp, atk, def, spa, spd, spe } };
}

function formatEvs(evs: StatBlock, nature: string): string {
  const parts = STAT_KEYS.filter(k => evs[k] > 0).map(k => `${evs[k]} ${STAT_LABEL[k]}`);
  return parts.length ? `${parts.join(' / ')} ${nature}` : nature;
}

function koTier(n: number, chance: number): number {
  if (chance <= 0) return 99;
  return Math.min(n, 4);
}

// True if `alt` is a meaningful improvement over `current`:
//   - better KO tier, OR same tier (≤2) with ≥10% higher KO probability
function isBetterAlt(alt: HitResult, current: HitResult): boolean {
  const at = koTier(alt.koN, alt.koChance);
  const ct = koTier(current.koN, current.koChance);
  if (at < ct) return true;
  if (at === ct && at <= 2 && (alt.koChance - current.koChance) >= 0.10) return true;
  return false;
}

function koColor(n: number, chance: number): string {
  if (chance <= 0) return 'text-slate-500';
  if (n === 1)     return 'text-red-400 font-semibold';
  if (n === 2)     return 'text-orange-400';
  if (n === 3)     return 'text-yellow-400';
  return 'text-slate-500';
}

function barColor(maxPct: number): string {
  if (maxPct >= 100) return 'bg-red-500';
  if (maxPct >= 67)  return 'bg-orange-500';
  if (maxPct >= 50)  return 'bg-yellow-500';
  return 'bg-sky-500';
}

// ── Calc helpers ──────────────────────────────────────────────────────────────

/** Calculate damage from a built attacker CalcPokemon into a built defender CalcPokemon. */
function runHit(
  genNum:    GenerationNum,
  attacker:  CalcPokemon,
  moveName:  string,
  defender:  CalcPokemon,
  label:     string,
  spreadDesc: string,
): HitResult | null {
  try {
    const result = calculate(genNum, attacker, defender, new CalcMove(genNum, moveName as any));
    const [min, max] = result.range();
    if (max === 0) return null;
    const defHP = result.defender.stats.hp;
    const ko    = result.kochance();
    return {
      label, moveName, spreadDesc,
      fullDesc:  result.fullDesc(),
      koN:       ko.n,
      koChance:  ko.chance ?? 0,
      koText:    ko.text,
      minPct:    parseFloat((min / defHP * 100).toFixed(1)),
      maxPct:    parseFloat((max / defHP * 100).toFixed(1)),
    };
  } catch { return null; }
}

/** Try a list of move names from the given attacker against the given defender; return best (most damaging). */
function runBestHit(
  genNum:    GenerationNum,
  attacker:  CalcPokemon,
  moveNames: string[],
  defender:  CalcPokemon,
  label:     string,
  spreadDesc: string,
): HitResult | null {
  let best: HitResult | null = null;
  for (const moveName of moveNames) {
    const r = runHit(genNum, attacker, moveName, defender, label, spreadDesc);
    if (r && (!best || r.maxPct > best.maxPct)) best = r;
  }
  return best;
}

// ── UI primitives ─────────────────────────────────────────────────────────────

function Panel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-800/60 border border-white/5 rounded-xl p-4 space-y-3">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</h3>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-slate-500">{label}</label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <input
      type="text"
      className="w-full bg-slate-700/60 border border-white/5 rounded-lg px-3 py-1.5 text-sm
                 focus:outline-none focus:border-sky-500/50 placeholder:text-slate-600"
      value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
    />
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BulkPage() {
  // Load phase
  const [speciesInput, setSpeciesInput] = useState('');
  const [format,       setFormat]       = useState('gen9ou');
  const [dexData,      setDexData]      = useState<any>(null);
  const [tierStats,    setTierStats]    = useState<any>(null);
  const [dataLoading,  setDataLoading]  = useState(false);
  const [loadError,    setLoadError]    = useState<string | null>(null);

  // Defender config (the player's Pokémon)
  const [selectedAbility,   setSelectedAbility]   = useState('');
  const [selectedSpreadKey, setSelectedSpreadKey] = useState<string>('__custom__');
  const [nature,    setNature]    = useState('Calm');
  const [evs,       setEvs]       = useState<StatBlock>(DEFAULT_EVS);
  const [ivs,       setIvs]       = useState<StatBlock>(DEFAULT_IVS);
  const [item,      setItem]      = useState('');
  const [teraType,  setTeraType]  = useState('');
  const [showIvs,   setShowIvs]   = useState(false);
  const [threshold, setThreshold] = useState(1);

  // Calc phase
  const [groups,      setGroups]      = useState<AttackerGroup[]>([]);
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcError,   setCalcError]   = useState<string | null>(null);

  const isLoaded = !!dexData && !!tierStats;

  // ── Load dex + tier data ──────────────────────────────────────────────────

  async function loadData() {
    const s = speciesInput.trim();
    if (!s) return;
    setDataLoading(true);
    setLoadError(null);
    setGroups([]);
    try {
      const genNum = getGenNum(format);
      const [dexRes, statsRes] = await Promise.all([
        fetch(`http://localhost:3001/dex/${genNum}/${encodeURIComponent(s)}`),
        fetch(`https://pkmn.github.io/smogon/data/stats/${format}.json`),
      ]);
      if (!dexRes.ok) throw new Error(`Pokémon "${s}" not found`);
      const dex   = await dexRes.json();
      const stats = await statsRes.json();
      setDexData(dex);
      setTierStats(stats);

      // Default ability to most-used from tier stats
      const monData = stats.pokemon?.[s];
      const topAbility = monData?.abilities
        ? (Object.entries(monData.abilities) as [string, number][])
            .sort((a, b) => b[1] - a[1])[0]?.[0]
        : null;
      setSelectedAbility(topAbility ?? dex.abilities?.base ?? '');

      // Default spread to most-used from tier stats, or Calm 252/252
      if (monData?.spreads) {
        const topSpreadStr = (Object.entries(monData.spreads) as [string, number][])
          .sort((a, b) => b[1] - a[1])[0]?.[0];
        if (topSpreadStr) {
          const { nature: n, evs: e } = parseSpread(topSpreadStr);
          setNature(n);
          setEvs(e);
          setSelectedSpreadKey(topSpreadStr);
        }
      }
    } catch (e: any) {
      setLoadError(e?.message ?? 'Failed to load data');
    } finally {
      setDataLoading(false);
    }
  }

  // ── Spread preset options ────────────────────────────────────────────────

  const spreadOptions = React.useMemo(() => {
    if (!tierStats || !speciesInput.trim()) return [];
    const monData = tierStats.pokemon?.[speciesInput.trim()];
    if (!monData?.spreads) return [];
    return (Object.entries(monData.spreads) as [string, number][])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([key, pct]) => {
        const { nature: n, evs: e } = parseSpread(key);
        return { key, label: `${formatEvs(e, n)} · ${(pct * 100).toFixed(0)}%` };
      });
  }, [tierStats, speciesInput]);

  function handleSpreadSelect(key: string) {
    setSelectedSpreadKey(key);
    if (key === '__custom__') return;
    const { nature: n, evs: e } = parseSpread(key);
    setNature(n);
    setEvs(e);
  }

  function handleEvSlider(stat: keyof StatBlock, val: string) {
    setEvs(prev => ({ ...prev, [stat]: parseInt(val) }));
    setSelectedSpreadKey('__custom__');
  }

  // ── Calculate ─────────────────────────────────────────────────────────────

  async function runCalc() {
    if (!isLoaded) return;
    setCalcLoading(true);
    setCalcError(null);
    setGroups([]);

    await new Promise(r => setTimeout(r, 0));

    try {
      const genNum = getGenNum(format);
      const threshDecimal = threshold / 100;

      // Build the player's defender at various spreads (built once, reused for all attackers)
      const yourSpreadDesc = formatEvs(evs, nature);

      const buildDef = (defNature: string, defEvs: StatBlock, defIvs: StatBlock) =>
        new CalcPokemon(genNum, speciesInput.trim() as any, {
          nature:  defNature   as any,
          evs:     defEvs,
          ivs:     defIvs,
          item:    item           ? item           as any : undefined,
          ability: selectedAbility ? selectedAbility as any : undefined,
          teraType: teraType      ? teraType        as any : undefined,
        });

      const playerYours    = buildDef(nature, evs, ivs);
      const playerNoInvest = buildDef('Hardy', ZERO_EVS, DEFAULT_IVS);
      const playerMaxDef   = buildDef('Bold',  { ...ZERO_EVS, hp: 252, def: 252 }, DEFAULT_IVS);
      const playerMaxSpD   = buildDef('Calm',  { ...ZERO_EVS, hp: 252, spd: 252 }, DEFAULT_IVS);
      const playerSpeed    = playerYours.stats.spe;

      const resultGroups: AttackerGroup[] = [];

      for (const [atkSpecies, monData] of Object.entries(tierStats.pokemon) as [string, any][]) {
        const usage = monData.usage?.real ?? 0;
        if (usage < threshDecimal) continue;

        const spreadEntries = (Object.entries(monData.spreads ?? {}) as [string, number][])
          .sort((a, b) => b[1] - a[1]);
        const topSpreadStr = spreadEntries[0]?.[0] ?? 'Hardy:0/0/0/0/0/0';
        const topItem      = (Object.entries(monData.items    ?? {}) as [string, number][]).sort((a,b)=>b[1]-a[1])[0]?.[0] ?? '';
        const topAbility   = (Object.entries(monData.abilities?? {}) as [string, number][]).sort((a,b)=>b[1]-a[1])[0]?.[0] ?? '';
        const { nature: atkNature, evs: atkEvs } = parseSpread(topSpreadStr);

        // Get their top offensive moves (skip status moves)
        const atkMoveNames = (Object.entries(monData.moves ?? {} as Record<string, number>) as [string, number][])
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([name]) => name)
          .filter(name => {
            try { return new CalcMove(genNum, name as any).category !== 'Status'; }
            catch { return false; }
          });

        if (!atkMoveNames.length) continue;

        // Build their standard attacker
        const atkCalc = new CalcPokemon(genNum, atkSpecies as any, {
          nature:  atkNature  as any,
          evs:     atkEvs,
          item:    topItem    ? topItem    as any : undefined,
          ability: topAbility ? topAbility as any : undefined,
        });
        const atkSpeed  = atkCalc.stats.spe;
        const outspeeds = atkSpeed > playerSpeed;

        // Find their best move against your current spread
        const vsYours = runBestHit(genNum, atkCalc, atkMoveNames, playerYours,
          'Your spread', yourSpreadDesc);
        if (!vsYours) continue;

        const moveName = vsYours.moveName;

        // Determine move category and type of their best move
        let moveCat: 'Physical' | 'Special' | 'Status' = 'Physical';
        let bestMoveType: string | null = null;
        try {
          const cm = new CalcMove(genNum, moveName as any);
          moveCat      = cm.category;
          bestMoveType = cm.type;
        } catch {}

        // ── scan all their smogon-tracked moves for alts that threaten you more ──
        // gap      = different type from their best move + meaningful usage (≥5%)
        // tradeoff = same type, more reliable KO (e.g. Surf 40% → Hydro Pump 90%)
        // snipe    = <5% attacker usage — niche but notable
        const allAtkMoves = (Object.entries(monData.moves ?? {} as Record<string, number>) as [string, number][])
          .sort((a, b) => b[1] - a[1])
          .map(([name, usage]) => ({ name, usage }));

        const moveAlts: MoveAlt[] = [];
        for (const { name: altName, usage: altUsage } of allAtkMoves) {
          if (altName === moveName) continue;
          let altCat: string = 'Status';
          let altType: string | null = null;
          try {
            const cm = new CalcMove(genNum, altName as any);
            altCat  = cm.category;
            altType = cm.type;
          } catch { continue; }
          if (altCat === 'Status') continue;

          const r = runHit(genNum, atkCalc, altName, playerYours, 'Alt', yourSpreadDesc);
          if (!r || !isBetterAlt(r, vsYours)) continue;

          const isMeaningful = altUsage >= MEANINGFUL_MOVE_THRESHOLD;
          const isSameType   = altType !== null && altType === bestMoveType;
          const note: MoveAlt['coverageNote'] =
            !isMeaningful ? 'snipe' : isSameType ? 'tradeoff' : 'gap';
          moveAlts.push({ result: r, coverageNote: note, usage: altUsage });
        }

        // Sort: gaps first, then tradeoffs, then snipes; within category by usage desc
        const noteRank = { gap: 0, tradeoff: 1, snipe: 2 };
        moveAlts.sort((a, b) => {
          const nr = noteRank[a.coverageNote] - noteRank[b.coverageNote];
          if (nr !== 0) return nr;
          if (a.usage !== b.usage) return b.usage - a.usage;
          return b.result.koChance - a.result.koChance;
        });

        const coverageNote = moveAlts[0]?.coverageNote ?? null;

        // Run the same move vs other player spreads
        const vsNoInvest = runHit(genNum, atkCalc, moveName, playerNoInvest,
          'No investment', '0 EVs Hardy');
        const vsMaxDef   = runHit(genNum, atkCalc, moveName, playerMaxDef,
          'Max Def', '252 HP / 252 Def Bold');
        const vsMaxSpD   = runHit(genNum, atkCalc, moveName, playerMaxSpD,
          'Max SpD', '252 HP / 252 SpD Calm');

        // Build their max-threat version (252+ Atk/SpA + CB/CS) for worst-case
        const isPhysical   = moveCat === 'Physical';
        const maxThreatEvs = isPhysical
          ? { ...ZERO_EVS, atk: 252 }
          : { ...ZERO_EVS, spa: 252 };
        const maxThreatNature = isPhysical ? 'Adamant' : 'Modest';
        const maxThreatItem   = isPhysical ? 'Choice Band' : 'Choice Specs';
        const atkMaxThreat    = new CalcPokemon(genNum, atkSpecies as any, {
          nature:  maxThreatNature as any,
          evs:     maxThreatEvs,
          item:    maxThreatItem   as any,
          ability: topAbility      ? topAbility as any : undefined,
        });
        const vsMaxThreat = runHit(genNum, atkMaxThreat, moveName, playerYours,
          'Max threat', `252+ ${isPhysical ? 'Atk' : 'SpA'} ${isPhysical ? 'CB' : 'CS'}`);

        // ── breakpoint: your spread is literally at a KO roll threshold ──
        //   1. Some rolls OHKO or 2HKO you, some don't
        //   2. Your EVs specifically save you: they'd OHKO you without investment but not with
        const isBreakpoint =
          (vsYours.koChance > 0 && vsYours.koChance < 1 && vsYours.koN <= 2) ||
          (vsNoInvest !== null && vsNoInvest.koN === 1 && vsYours.koN > 1);

        // ── danger: they can OHKO you on your current spread ──
        const isDanger = vsYours.koN === 1 && vsYours.koChance > 0;

        resultGroups.push({
          species: atkSpecies, usage, atkSpeed, outspeeds,
          moveName, moveCat,
          vsYours, vsNoInvest, vsMaxDef, vsMaxSpD, vsMaxThreat,
          moveAlts, coverageNote,
          isBreakpoint, isDanger,
        });
      }

      // Sort: dangers → breakpoints → gaps → 2HKO → tradeoffs → snipes → rest
      // Within dangers: outspeeding (moves first) > underspeeding (player attacks first)
      const noteOrder = { gap: 2, tradeoff: 4, snipe: 5, null: 6 } as const;
      resultGroups.sort((a, b) => {
        const rank = (g: AttackerGroup) =>
          g.isDanger      ? 0 :
          g.isBreakpoint  ? 1 :
          g.coverageNote  ? noteOrder[g.coverageNote] :
          g.vsYours.koN === 2 ? 3 : 6;
        const dr = rank(a) - rank(b);
        if (dr !== 0) return dr;
        // Within dangers: faster attackers (outspeeding player) rank first
        if (a.isDanger && b.isDanger) {
          const aOut = a.atkSpeed > playerSpeed;
          const bOut = b.atkSpeed > playerSpeed;
          if (aOut !== bOut) return aOut ? -1 : 1;
          // Both outspeed or both underweight: sort by speed descending (fastest first)
          return b.atkSpeed - a.atkSpeed;
        }
        return b.vsYours.maxPct - a.vsYours.maxPct;
      });

      setGroups(resultGroups);
    } catch (err: any) {
      setCalcError(err?.message ?? 'Calculation failed');
    } finally {
      setCalcLoading(false);
    }
  }

  // ── Summary counts ─────────────────────────────────────────────────────────

  const dangerCount     = groups.filter(g => g.isDanger).length;
  const breakpointCount = groups.filter(g => g.isBreakpoint && !g.isDanger).length;
  const twoHKOCount     = groups.filter(g => !g.isDanger && !g.isBreakpoint && g.vsYours.koN === 2).length;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto p-6">

        <div className="mb-6">
          <h1 className="text-2xl font-bold">Defensive Matchups</h1>
          <p className="text-slate-400 text-sm mt-1">
            See which common attackers threaten you and how your spread affects survivability.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 items-start">

          {/* ── Config ──────────────────────────────────────────────────── */}
          <div className="space-y-3 lg:sticky lg:top-6">

            <Panel label="Pokémon & Format">
              <Field label="Species">
                <div className="flex gap-2">
                  <TextInput placeholder="e.g. Clodsire" value={speciesInput} onChange={setSpeciesInput} />
                  <button
                    onClick={loadData}
                    disabled={dataLoading || !speciesInput.trim()}
                    className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40
                               text-sm transition-colors flex-shrink-0">
                    {dataLoading ? '…' : 'Load'}
                  </button>
                </div>
              </Field>
              <Field label="Format">
                <TextInput placeholder="gen9ou" value={format} onChange={setFormat} />
              </Field>
              {loadError && (
                <p className="text-red-400 text-xs">{loadError}</p>
              )}
            </Panel>

            {isLoaded && (
              <Panel label="Your Spread">
                {spreadOptions.length > 0 && (
                  <Field label="Preset spreads">
                    <select
                      className="w-full bg-slate-700/60 border border-white/5 rounded-lg px-2 py-1.5 text-sm
                                 focus:outline-none focus:border-sky-500/50"
                      value={selectedSpreadKey}
                      onChange={e => handleSpreadSelect(e.target.value)}>
                      <option value="__custom__">— custom —</option>
                      {spreadOptions.map(o => (
                        <option key={o.key} value={o.key}>{o.label}</option>
                      ))}
                    </select>
                  </Field>
                )}
                <Field label="Nature">
                  <select
                    className="w-full bg-slate-700/60 border border-white/5 rounded-lg px-2 py-1.5 text-sm
                               focus:outline-none focus:border-sky-500/50"
                    value={nature} onChange={e => { setNature(e.target.value); setSelectedSpreadKey('__custom__'); }}>
                    {NATURES.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </Field>
                <div className="space-y-2">
                  {STAT_KEYS.map(stat => (
                    <div key={stat} className="grid grid-cols-[30px_1fr_36px] items-center gap-2">
                      <span className="text-xs text-slate-400 text-right">{STAT_LABEL[stat]}</span>
                      <input type="range" min={0} max={252} step={4} className="accent-sky-500 w-full"
                        value={evs[stat]} onChange={e => handleEvSlider(stat, e.target.value)} />
                      <span className="text-xs text-slate-300 text-right tabular-nums">{evs[stat]}</span>
                    </div>
                  ))}
                </div>
                <button onClick={() => setShowIvs(v => !v)}
                  className="text-xs text-slate-500 hover:text-slate-300 transition-colors w-full text-left mt-1">
                  {showIvs ? '▾' : '▸'} IVs (default: all 31)
                </button>
                {showIvs && (
                  <div className="space-y-2 mt-2">
                    {STAT_KEYS.map(stat => (
                      <div key={stat} className="grid grid-cols-[30px_1fr_36px] items-center gap-2">
                        <span className="text-xs text-slate-400 text-right">{STAT_LABEL[stat]}</span>
                        <input type="range" min={0} max={31} step={1} className="accent-violet-500 w-full"
                          value={ivs[stat]} onChange={e => setIvs(prev => ({ ...prev, [stat]: parseInt(e.target.value) }))} />
                        <span className="text-xs text-slate-300 text-right tabular-nums">{ivs[stat]}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>
            )}

            {isLoaded && (
              <Panel label="Item & Ability & Tera">
                <Field label="Ability">
                  <TextInput placeholder={dexData?.abilities?.base ?? 'Ability'} value={selectedAbility} onChange={setSelectedAbility} />
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Item">
                    <TextInput placeholder="Leftovers" value={item} onChange={setItem} />
                  </Field>
                  <Field label="Tera Type">
                    <TextInput placeholder="Poison" value={teraType} onChange={setTeraType} />
                  </Field>
                </div>
              </Panel>
            )}

            {isLoaded && (
              <Panel label="Targets">
                <Field label={`Min usage: ${threshold}%`}>
                  <input type="range" min={0.1} max={10} step={0.1} className="w-full accent-sky-500"
                    value={threshold} onChange={e => setThreshold(parseFloat(e.target.value))} />
                </Field>
              </Panel>
            )}

            {isLoaded && (
              <button
                onClick={runCalc}
                disabled={calcLoading}
                className="w-full py-3 rounded-xl bg-sky-600 hover:bg-sky-500 active:bg-sky-700 disabled:opacity-40 font-semibold text-sm transition-colors">
                {calcLoading ? 'Calculating…' : 'Calculate Matchups'}
              </button>
            )}

            {calcError && (
              <p className="text-red-400 text-xs bg-red-500/10 rounded-xl p-3 border border-red-500/20">
                {calcError}
              </p>
            )}
          </div>

          {/* ── Results ─────────────────────────────────────────────────── */}
          <div>
            {groups.length > 0 && (
              <div className="flex gap-4 mb-4 text-sm flex-wrap items-center">
                <span className="text-slate-400">{groups.length} Pokémon</span>
                {dangerCount > 0 && (
                  <span className="text-red-400">{dangerCount} OHKO{dangerCount !== 1 ? 's' : ''} you</span>
                )}
                {breakpointCount > 0 && (
                  <span className="text-amber-400">{breakpointCount} breakpoint{breakpointCount !== 1 ? 's' : ''}</span>
                )}
                {twoHKOCount > 0 && (
                  <span className="text-orange-400">{twoHKOCount} 2HKO{twoHKOCount !== 1 ? 's' : ''}</span>
                )}
                <span className="text-slate-600 text-xs ml-auto">click to expand</span>
              </div>
            )}

            {calcLoading && (
              <div className="flex items-center gap-3 py-16 justify-center text-slate-400 text-sm">
                <div className="w-4 h-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                Calculating…
              </div>
            )}

            {!calcLoading && groups.length === 0 && !isLoaded && (
              <div className="py-24 text-center text-slate-600 text-sm">Load a Pokémon to begin.</div>
            )}
            {!calcLoading && groups.length === 0 && isLoaded && (
              <div className="py-24 text-center text-slate-600 text-sm">Configure your spread and hit Calculate.</div>
            )}

            {!calcLoading && groups.length > 0 && (
              <div className="space-y-1.5">
                {groups.map(g => <AttackerCard key={g.species} group={g} />)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Attacker card ─────────────────────────────────────────────────────────────

function AttackerCard({ group }: { group: AttackerGroup }) {
  const [expanded, setExpanded] = useState(
    group.isDanger || group.isBreakpoint ||
    group.coverageNote === 'gap' || group.coverageNote === 'tradeoff'
  );

  const borderClass = group.isDanger
    ? 'border-red-500/30 bg-red-500/5'
    : group.isBreakpoint
      ? 'border-amber-500/30 bg-amber-500/5'
      : group.coverageNote === 'gap'
        ? 'border-violet-500/30 bg-violet-500/5'
        : group.coverageNote === 'tradeoff'
          ? 'border-sky-500/20 bg-sky-500/5'
          : group.vsYours.koN === 2
            ? 'border-orange-500/20 bg-orange-500/5'
            : 'border-white/5 bg-slate-800/60';

  // Relevant bulk scenario based on move category
  const bulkyResult = group.moveCat === 'Physical' ? group.vsMaxDef
    : group.moveCat === 'Special' ? group.vsMaxSpD
    : (group.vsMaxDef?.maxPct ?? 100) <= (group.vsMaxSpD?.maxPct ?? 100)
      ? group.vsMaxDef : group.vsMaxSpD;

  // Skip "Common" in collapsed if it matches 0-EV result (same KO tier + chance)
  const sameAsNoInvest = !!(group.vsNoInvest &&
    group.vsNoInvest.koN === group.vsYours.koN &&
    Math.abs(group.vsNoInvest.koChance - group.vsYours.koChance) < 0.05);

  return (
    <div className={`rounded-xl overflow-hidden border ${borderClass}`}>
      {/* Header */}
      <button
        className="w-full px-4 py-2.5 flex items-center gap-2 text-left hover:bg-white/5 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <span className="font-semibold text-sm flex-shrink-0">{group.species}</span>
        <span className="text-xs text-slate-500 flex-shrink-0">{(group.usage * 100).toFixed(1)}%</span>

        {group.isDanger && (
          <span className="text-xs font-medium text-red-400 bg-red-400/10 rounded px-1.5 py-0.5 flex-shrink-0">
            OHKO
          </span>
        )}
        {/* Outspeed / cheese context — only shown when they can OHKO */}
        {group.isDanger && (
          <span className={`text-xs font-medium rounded px-1.5 py-0.5 flex-shrink-0 ${
            group.outspeeds
              ? 'text-emerald-400 bg-emerald-400/10'
              : 'text-orange-400 bg-orange-400/10'
          }`}>
            {group.outspeeds ? 'outspeed' : 'cheese'}
          </span>
        )}
        {group.isBreakpoint && !group.isDanger && (
          <span className="text-xs font-medium text-amber-400 bg-amber-400/10 rounded px-1.5 py-0.5 flex-shrink-0">
            breakpoint
          </span>
        )}
        {/* Gap + tradeoff badges only — snipes live in the collapsible section */}
        {group.moveAlts.filter(a => a.coverageNote !== 'snipe').slice(0, 4).map((alt, i) => {
          const usageSuffix = alt.usage > 0 ? ` · ${(alt.usage * 100).toFixed(0)}%` : '';
          if (alt.coverageNote === 'gap') return (
            <span key={i} className="text-xs font-medium text-violet-400 bg-violet-400/10 rounded px-1.5 py-0.5 flex-shrink-0">
              gap: {alt.result.moveName}{usageSuffix}
            </span>
          );
          return (
            <span key={i} className="text-xs font-medium text-sky-400 bg-sky-400/10 rounded px-1.5 py-0.5 flex-shrink-0">
              alt: {alt.result.moveName}{usageSuffix}
            </span>
          );
        })}

        {/* Collapsed summary: 0 EVs → Common (skip if same) → Bulk */}
        {!expanded && (
          <div className="ml-auto flex items-center gap-3 text-xs flex-shrink-0">
            {group.vsNoInvest && (
              <span className="text-slate-500">
                0 EVs:{' '}
                <span className={koColor(group.vsNoInvest.koN, group.vsNoInvest.koChance)}>
                  {group.vsNoInvest.koText || `${group.vsNoInvest.minPct}–${group.vsNoInvest.maxPct}%`}
                </span>
              </span>
            )}
            {!sameAsNoInvest && (
              <span className="text-slate-500">
                Common:{' '}
                <span className={koColor(group.vsYours.koN, group.vsYours.koChance)}>
                  {group.vsYours.koText || `${group.vsYours.minPct}–${group.vsYours.maxPct}%`}
                </span>
              </span>
            )}
            {bulkyResult && (
              <span className="text-slate-500 hidden sm:inline">
                Bulk:{' '}
                <span className={koColor(bulkyResult.koN, bulkyResult.koChance)}>
                  {bulkyResult.koText || `${bulkyResult.minPct}–${bulkyResult.maxPct}%`}
                </span>
              </span>
            )}
          </div>
        )}

        <span className={`text-slate-500 text-xs flex-shrink-0 ${!expanded ? '' : 'ml-auto'}`}>
          {expanded ? '▾' : '▸'}
        </span>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="border-t border-white/5">
          <div className="divide-y divide-white/5">
            {group.vsNoInvest && <HitRow result={group.vsNoInvest} />}
            {!sameAsNoInvest && <HitRow result={group.vsYours} showFullDesc />}
            {/* Gap + tradeoff alts */}
            {group.moveAlts.filter(a => a.coverageNote !== 'snipe').map((alt, i) => (
              <HitRow
                key={i}
                result={alt.result}
                accent={alt.coverageNote === 'gap' ? 'violet' : 'sky'}
                showFullDesc
              />
            ))}
            {bulkyResult && <HitRow result={bulkyResult} />}
            {group.vsMaxThreat && <HitRow result={group.vsMaxThreat} accent="red" showFullDesc />}
          </div>
          <SnipeSection alts={group.moveAlts.filter(a => a.coverageNote === 'snipe')} />
        </div>
      )}
    </div>
  );
}

// ── Snipe section (collapsible, shown below main rows) ───────────────────────

function SnipeSection({ alts }: { alts: MoveAlt[] }) {
  const [open, setOpen] = React.useState(false);
  if (!alts.length) return null;
  return (
    <div className="border-t border-white/5">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full px-4 py-1.5 text-left text-xs text-slate-600 hover:text-slate-400 transition-colors">
        {open ? '▾ Hide' : '▸ Show'} {alts.length} niche move{alts.length !== 1 ? 's' : ''} (snipe)
      </button>
      {open && (
        <div className="divide-y divide-white/5">
          {alts.map((alt, i) => (
            <HitRow key={i} result={alt.result} dimmed showFullDesc />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Hit row ───────────────────────────────────────────────────────────────────

function HitRow({ result, showFullDesc = false, dimmed = false, accent }: {
  result:       HitResult;
  showFullDesc?: boolean;
  dimmed?:       boolean;
  accent?:       'red' | 'amber' | 'violet' | 'sky';
}) {
  const labelColor = accent === 'red'    ? 'text-red-400'
    : accent === 'amber'  ? 'text-amber-400'
    : accent === 'violet' ? 'text-violet-400'
    : accent === 'sky'    ? 'text-sky-400'
    : showFullDesc        ? 'text-slate-300'
    : 'text-slate-500';

  // Survival indicator: green = survive, red = KO, amber = close
  const survives = result.maxPct < 100;
  const barely   = result.maxPct >= 85 && result.maxPct < 100;
  const surviveColor = !survives ? 'text-red-400' : barely ? 'text-amber-400' : 'text-emerald-400';
  const surviveText  = !survives
    ? (result.koText || 'OHKO')
    : result.minPct < 100 && result.maxPct >= 100
      ? `${(100 - result.maxPct).toFixed(1)}% margin (rolls)`
      : `${(100 - result.maxPct).toFixed(1)}% remaining`;

  return (
    <div className={`px-4 py-2 ${dimmed ? 'opacity-40' : ''}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 flex items-center gap-2">
          <span className={`text-xs font-medium flex-shrink-0 ${labelColor}`} style={{ minWidth: '80px' }}>
            {result.label}
          </span>
          <span className="text-xs text-sky-400/70 font-mono flex-shrink-0 truncate max-w-[110px]">
            {result.moveName}
          </span>
          <span className="text-xs text-slate-600 truncate hidden sm:block">{result.spreadDesc}</span>
        </div>
        <div className="text-right flex-shrink-0 flex items-center gap-2">
          <span className="font-mono text-sm tabular-nums">{result.minPct}–{result.maxPct}%</span>
          <span className={`text-xs w-24 text-right ${surviveColor}`}>
            {surviveText}
          </span>
        </div>
      </div>

      {/* Damage bar — shows how close to 100% (full KO) */}
      <div className="mt-1.5 h-1 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${barColor(result.maxPct)}`}
          style={{ width: `${Math.min(result.maxPct, 100)}%` }} />
      </div>

      {showFullDesc && result.fullDesc && (
        <p className="mt-1 text-xs text-slate-500 font-mono leading-relaxed">{result.fullDesc}</p>
      )}
    </div>
  );
}
