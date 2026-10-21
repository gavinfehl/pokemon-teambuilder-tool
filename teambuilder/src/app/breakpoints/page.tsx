'use client';
import React, { useState, useMemo } from 'react';
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
interface MoveInfo { id: string; name: string; }
interface SpreadOption { spread: string; pct: number; label: string; }

interface ScenarioResult {
  label:      string;
  moveName:   string;   // best move that achieved this result
  spreadDesc: string;
  fullDesc:   string;
  koN:        number;
  koChance:   number;
  koText:     string;
  minPct:     number;
  maxPct:     number;
}

interface LearnsetAlt {
  scenario:     ScenarioResult;
  coverageNote: 'gap' | 'tradeoff' | 'snipe';
  usage:        number;  // attacker's smogon move usage (0–1)
}

interface SpeciesGroup {
  species:      string;
  usage:        number;
  absMin:       ScenarioResult | null;  // frailest possible vs your moves
  noInvest:     ScenarioResult | null;  // Hardy, 0 EVs, 31 IVs, no item
  mostUsed:     ScenarioResult[];       // from tier data (multiple), topItem
  bulkiest:     ScenarioResult | null;  // harder-to-KO of Def/SpD focus, no item
  bulkiestAV:   ScenarioResult | null;  // Calm 252HP/252SpD + AV (only when AV helps)
  learnsetAlts:  LearnsetAlt[];         // all learnset moves that improve on current set
  coverageNote:  'gap' | 'tradeoff' | 'snipe' | null;  // best alt's note (for sort/border)
  isBreakpoint:  boolean;
  isWalled:      boolean;  // defender has recovery AND you can't 2HKO them
  isGap:         boolean;  // = learnsetAlts.length > 0
}

// ── Constants ────────────────────────────────────────────────────────────────

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
const DEFAULT_EVS: StatBlock = { hp:0, atk:0, def:0, spa:252, spd:0, spe:252 };
const DEFAULT_IVS: StatBlock = { hp:31, atk:31, def:31, spa:31, spd:31, spe:31 };
const ZERO_EVS:    StatBlock = { hp:0, atk:0, def:0, spa:0, spd:0, spe:0 };
const SPREAD_THRESHOLD          = 0.10;
const SPREAD_FALLBACK           = 3;
const DEFENDER_SPREAD_THRESHOLD = 0.10;
const MAX_SPREADS               = 5;
// Attacker's move usage threshold: moves used on ≥5% of sets are "meaningful"
const MEANINGFUL_MOVE_THRESHOLD = 0.05;

// Items and moves that give the defender sustained recovery (walled check)
const RECOVERY_ITEMS = new Set(['Leftovers', 'Black Sludge', 'Sitrus Berry', 'Figy Berry', 'Wiki Berry', 'Mago Berry', 'Aguav Berry', 'Iapapa Berry']);
const RECOVERY_MOVES_SET = new Set(['Recover', 'Roost', 'Soft-Boiled', 'Wish', 'Moonlight', 'Shore Up', 'Synthesis', 'Heal Order', 'Slack Off', 'Rest', 'Jungle Healing', 'Lunar Blessing', 'Milk Drink', 'Refresh', 'Healing Wish', 'Leech Seed']);
const REGEN_ABILITIES = new Set(['Regenerator']);

// ── Scenario spread builders ──────────────────────────────────────────────────

function frailestFor(cat: 'Physical' | 'Special'): { nature: string; evs: StatBlock; ivs: StatBlock } {
  return cat === 'Special'
    ? { nature: 'Rash', evs: ZERO_EVS, ivs: { ...DEFAULT_IVS, hp: 0, spd: 0 } }
    : { nature: 'Mild', evs: ZERO_EVS, ivs: { ...DEFAULT_IVS, hp: 0, def: 0 } };
}

function noInvestmentFor(): { nature: string; evs: StatBlock; ivs: StatBlock } {
  return { nature: 'Hardy', evs: ZERO_EVS, ivs: DEFAULT_IVS };
}

function bulkiestFor(cat: 'Physical' | 'Special'): { nature: string; evs: StatBlock; ivs: StatBlock } {
  return cat === 'Special'
    ? { nature: 'Calm', evs: { ...ZERO_EVS, hp: 252, spd: 252 }, ivs: DEFAULT_IVS }
    : { nature: 'Bold', evs: { ...ZERO_EVS, hp: 252, def: 252 }, ivs: DEFAULT_IVS };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

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
  if (chance <= 0) return 4;
  return Math.min(n, 4);
}

// Returns true if `alt` is a meaningful improvement over `current`:
//   - achieves a better KO tier, OR
//   - same tier (≤2) but ≥10% higher KO probability (e.g. Surf 40% → Hydro Pump 90%)
function isBetterAlt(alt: ScenarioResult, current: ScenarioResult): boolean {
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
  if (maxPct >= 50)  return 'bg-orange-500';
  if (maxPct >= 25)  return 'bg-yellow-500';
  return 'bg-sky-500';
}

// ── Calc helpers ──────────────────────────────────────────────────────────────

function runOneScenario(
  genNum:     GenerationNum,
  attacker:   CalcPokemon,
  moveName:   string,
  defSpecies: string,
  spread:     { nature: string; evs: StatBlock; ivs?: StatBlock },
  item:       string,
  ability:    string,
  label:      string,
  spreadDesc: string,
): ScenarioResult | null {
  try {
    const defender = new CalcPokemon(genNum, defSpecies as any, {
      nature:  spread.nature as any,
      evs:     spread.evs,
      ivs:     spread.ivs ?? DEFAULT_IVS,
      item:    item    ? item    as any : undefined,
      ability: ability ? ability as any : undefined,
    });
    const result = calculate(genNum, attacker, defender, new CalcMove(genNum, moveName as any));
    const [min, max] = result.range();
    if (max === 0) return null;
    const defHP = result.defender.stats.hp;
    const ko    = result.kochance();
    return {
      label, moveName, spreadDesc,
      fullDesc: result.fullDesc(),
      koN:      ko.n,
      koChance: ko.chance ?? 0,
      koText:   ko.text,
      minPct:   parseFloat((min / defHP * 100).toFixed(1)),
      maxPct:   parseFloat((max / defHP * 100).toFixed(1)),
    };
  } catch { return null; }
}

/** Run all moveNames against one spread/item config; return best by maxPct. */
function runBestScenario(
  genNum:     GenerationNum,
  attacker:   CalcPokemon,
  moveNames:  string[],
  defSpecies: string,
  spread:     { nature: string; evs: StatBlock; ivs?: StatBlock },
  item:       string,
  ability:    string,
  label:      string,
  spreadDesc: string,
): ScenarioResult | null {
  let best: ScenarioResult | null = null;
  for (const moveName of moveNames) {
    const r = runOneScenario(genNum, attacker, moveName, defSpecies, spread, item, ability, label, spreadDesc);
    if (r && (!best || r.maxPct > best.maxPct)) best = r;
  }
  return best;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function BreakpointsPage() {

  // Load phase
  const [speciesInput, setSpeciesInput] = useState('');
  const [format,       setFormat]       = useState('gen9ou');
  const [attackerDex,  setAttackerDex]  = useState<any>(null);
  const [tierStats,    setTierStats]    = useState<any>(null);
  const [learnset,     setLearnset]     = useState<MoveInfo[]>([]);
  const [dataLoading,  setDataLoading]  = useState(false);
  const [loadError,    setLoadError]    = useState<string | null>(null);

  // Moveset — 4 slots + optional non-learnset override
  const [moveSlots,  setMoveSlots]  = useState<string[]>(['', '', '', '']);
  const [forceMove,  setForceMove]  = useState('');

  // Attacker config
  const [selectedAbility,   setSelectedAbility]   = useState('');
  const [selectedSpreadKey, setSelectedSpreadKey] = useState<string>('__custom__');
  const [nature,    setNature]    = useState('Timid');
  const [evs,       setEvs]       = useState<StatBlock>(DEFAULT_EVS);
  const [ivs,       setIvs]       = useState<StatBlock>(DEFAULT_IVS);
  const [item,      setItem]      = useState('');
  const [teraType,  setTeraType]  = useState('');
  const [showIvs,   setShowIvs]   = useState(false);
  const [threshold, setThreshold] = useState(1);

  // Results
  const [groups,      setGroups]      = useState<SpeciesGroup[]>([]);
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcError,   setCalcError]   = useState<string | null>(null);

  // ── Derived ───────────────────────────────────────────────────────────────

  const availableAbilities = useMemo((): string[] => {
    if (!attackerDex?.abilities) return [];
    return [attackerDex.abilities.base, attackerDex.abilities.alternate, attackerDex.abilities.hidden]
      .filter(Boolean);
  }, [attackerDex]);

  const attackerSpreads = useMemo((): SpreadOption[] => {
    if (!tierStats || !speciesInput.trim()) return [];
    const monData = tierStats.pokemon?.[speciesInput.trim()];
    if (!monData?.spreads) return [];
    const entries = (Object.entries(monData.spreads) as [string, number][]).sort((a, b) => b[1] - a[1]);
    const above = entries.filter(([, pct]) => pct >= SPREAD_THRESHOLD);
    const toShow = above.length > 0 ? above : entries.slice(0, SPREAD_FALLBACK);
    return toShow.map(([spread, pct]) => ({
      spread, pct,
      label: `${formatEvs(parseSpread(spread).evs, parseSpread(spread).nature)} — ${(pct * 100).toFixed(0)}%`,
    }));
  }, [tierStats, speciesInput]);

  const activeMoves = [...moveSlots, forceMove].filter(m => m.trim() !== '');
  const evTotal  = STAT_KEYS.reduce((s, k) => s + evs[k], 0);
  const isLoaded = attackerDex != null && tierStats != null;

  // ── Load ──────────────────────────────────────────────────────────────────

  async function loadData() {
    const species = speciesInput.trim();
    if (!species) { setLoadError('Enter a species first.'); return; }
    setDataLoading(true);
    setLoadError(null);
    setAttackerDex(null); setTierStats(null); setLearnset([]); setGroups([]);

    try {
      const genNum = getGenNum(format);
      const [dexResp, statsResp, learnsetResp] = await Promise.all([
        fetch(`http://localhost:3001/dex/${genNum}/${encodeURIComponent(species)}`),
        fetch(`https://pkmn.github.io/smogon/data/stats/${format}.json`),
        fetch(`http://localhost:3001/dex/${genNum}/learnset/${encodeURIComponent(species)}`),
      ]);

      if (!dexResp.ok)   throw new Error(`"${species}" not found (gen ${genNum})`);
      if (!statsResp.ok) throw new Error(`Format "${format}" not found`);

      const [dexData, statsData, learnsetData] = await Promise.all([
        dexResp.json(), statsResp.json(),
        learnsetResp.ok ? learnsetResp.json() : { moves: [] },
      ]);

      setAttackerDex(dexData);
      setTierStats(statsData);
      const moves: MoveInfo[] = learnsetData.moves ?? [];
      setLearnset(moves);

      const monData = statsData.pokemon?.[species];

      // Default to most-used ability from tier data, fall back to dex base
      const topUsedAbility = monData?.abilities
        ? (Object.entries(monData.abilities) as [string, number][]).sort((a, b) => b[1] - a[1])[0]?.[0]
        : null;
      setSelectedAbility(topUsedAbility ?? dexData.abilities?.base ?? '');

      // Auto-populate top 4 moves from usage data (display names from smogon stats)
      if (monData?.moves) {
        const topMoves = (Object.entries(monData.moves) as [string, number][])
          .sort((a, b) => b[1] - a[1])
          .slice(0, 4)
          .map(([name]) => name);
        setMoveSlots([topMoves[0]??'', topMoves[1]??'', topMoves[2]??'', topMoves[3]??'']);
      } else if (moves.length > 0) {
        setMoveSlots([moves[0]?.name??'', moves[1]?.name??'', moves[2]?.name??'', moves[3]?.name??'']);
      }

      // Auto-populate spread
      if (monData?.spreads) {
        const top = (Object.entries(monData.spreads) as [string, number][]).sort((a, b) => b[1] - a[1])[0];
        if (top) {
          setSelectedSpreadKey(top[0]);
          const { nature: n, evs: e } = parseSpread(top[0]);
          setNature(n); setEvs(e);
        }
      }
    } catch (err: any) {
      setLoadError(err?.message ?? 'Failed to load data');
    } finally {
      setDataLoading(false);
    }
  }

  function handleSpreadSelect(key: string) {
    setSelectedSpreadKey(key);
    if (key !== '__custom__') {
      const { nature: n, evs: e } = parseSpread(key);
      setNature(n); setEvs(e);
    }
  }

  function handleEvSlider(stat: keyof StatBlock, val: string) {
    setEvs(prev => ({ ...prev, [stat]: Math.min(252, Math.max(0, parseInt(val) || 0)) }));
    setSelectedSpreadKey('__custom__');
  }

  // ── Calculate ─────────────────────────────────────────────────────────────

  async function runCalc() {
    if (!speciesInput.trim() || activeMoves.length === 0) {
      setCalcError('Species and at least one move are required.');
      return;
    }
    setCalcLoading(true); setCalcError(null); setGroups([]);
    await new Promise(r => setTimeout(r, 0));

    try {
      const genNum = getGenNum(format);

      const attacker = new CalcPokemon(genNum, speciesInput.trim() as any, {
        nature:   nature   as any,
        evs, ivs,
        item:     item.trim()     ? item.trim()     as any : undefined,
        ability:  selectedAbility ? selectedAbility as any : undefined,
        teraType: teraType.trim() ? teraType.trim() as any : undefined,
      });

      const allLearnsetMoves = learnset.map(m => m.name);
      const threshDecimal    = threshold / 100;
      const resultGroups: SpeciesGroup[] = [];

      // Types covered by the current moveset
      const setMoveTypes = new Set<string>();
      for (const moveName of activeMoves) {
        try { setMoveTypes.add(new CalcMove(genNum, moveName as any).type); } catch { /* skip */ }
      }

      // Attacker's move usage from smogon stats (for gap classification)
      const attackerMoveUsage: Record<string, number> =
        (tierStats.pokemon?.[speciesInput.trim()]?.moves ?? {});

      for (const [defSpecies, monData] of Object.entries(tierStats.pokemon) as [string, any][]) {
        const usage = monData.usage?.real ?? 0;
        if (usage < threshDecimal) continue;

        const spreadEntries = (Object.entries(monData.spreads ?? {}) as [string, number][])
          .sort((a, b) => b[1] - a[1]);
        const topItem    = (Object.entries(monData.items    ?? {}) as [string, number][]).sort((a,b)=>b[1]-a[1])[0]?.[0] ?? '';
        const topAbility = (Object.entries(monData.abilities?? {}) as [string, number][]).sort((a,b)=>b[1]-a[1])[0]?.[0] ?? '';

        const usedSpreads = spreadEntries
          .filter(([, pct]) => pct >= DEFENDER_SPREAD_THRESHOLD)
          .slice(0, MAX_SPREADS);
        if (usedSpreads.length === 0 && spreadEntries.length > 0) usedSpreads.push(spreadEntries[0]);

        // ── absMin: frailest vs your moves (take whichever category deals more damage) ──
        const absMinPhy = runBestScenario(genNum, attacker, activeMoves, defSpecies,
          frailestFor('Physical'), '', topAbility, 'Absolute Min', '0 HP/Def (0 IV) Mild');
        const absMinSpe = runBestScenario(genNum, attacker, activeMoves, defSpecies,
          frailestFor('Special'), '', topAbility, 'Absolute Min', '0 HP/SpD (0 IV) Rash');
        const absMin = (absMinPhy?.maxPct ?? 0) >= (absMinSpe?.maxPct ?? 0) ? absMinPhy : absMinSpe;

        // ── noInvest: Hardy 0 EVs 31 IVs, no item ──
        const noInvest = runBestScenario(genNum, attacker, activeMoves, defSpecies,
          noInvestmentFor(), '', topAbility, 'Uninvested', '0 EVs Hardy');

        // ── mostUsed: best-of-4 vs each popular spread (with topItem) ──
        const mostUsed: ScenarioResult[] = usedSpreads.flatMap(([spread, pct]) => {
          const { nature: n, evs: e } = parseSpread(spread);
          const desc = `${formatEvs(e, n)} · ${(pct * 100).toFixed(0)}%`;
          const r = runBestScenario(genNum, attacker, activeMoves, defSpecies,
            { nature: n, evs: e }, topItem, topAbility, 'Most Used', desc);
          return r ? [r] : [];
        });

        // ── bulkiest: harder-to-KO of def-focus vs spd-focus, no item ──
        const bulkiestDef = runBestScenario(genNum, attacker, activeMoves, defSpecies,
          bulkiestFor('Physical'), '', topAbility, 'Bulkiest', '252 HP / 252 Def Bold');
        const bulkiestSpD = runBestScenario(genNum, attacker, activeMoves, defSpecies,
          bulkiestFor('Special'), '', topAbility, 'Bulkiest', '252 HP / 252 SpD Calm');
        // pick the lower maxPct = genuinely harder to KO for your best move
        const bulkiest = (bulkiestDef?.maxPct ?? 100) <= (bulkiestSpD?.maxPct ?? 100)
          ? bulkiestDef : bulkiestSpD;

        // ── bulkiestAV: Calm 252 HP / 252 SpD + Assault Vest ──
        const avRaw = runBestScenario(genNum, attacker, activeMoves, defSpecies,
          { nature: 'Calm', evs: { ...ZERO_EVS, hp: 252, spd: 252 }, ivs: DEFAULT_IVS },
          'Assault Vest', topAbility, 'Bulkiest + AV', '252 HP / 252 SpD Calm + AV');
        // only include when AV actually makes it harder to KO (special attack was best)
        const bulkiestAV = (avRaw && bulkiest && avRaw.maxPct < bulkiest.maxPct) ? avRaw : null;

        // ── learnset coverage scan (vs mostUsed[0] spread) ──
        // For every learnset move not in the active set, check if it's a meaningful improvement.
        // "Better" = lower KO tier OR same tier with ≥10% higher KO probability.
        // gap      = different type, commonly run on attacker (≥5% usage)
        // tradeoff = same type, commonly run — e.g. Surf (40% OHKO) → Hydro Pump (90% OHKO)
        // snipe    = <5% attacker usage — niche but visible
        const topSpreadStr = spreadEntries[0]?.[0] ?? 'Hardy:0/0/0/0/0/0';
        const topSpreadPct = spreadEntries[0]?.[1] ?? 0;
        const { nature: defNat, evs: defEvs } = parseSpread(topSpreadStr);
        const commonDesc = `${formatEvs(defEvs, defNat)} (${(topSpreadPct * 100).toFixed(0)}%)`;

        const setOnCommon  = mostUsed[0] ?? noInvest;
        const learnsetAlts: LearnsetAlt[] = [];

        if (allLearnsetMoves.length && setOnCommon) {
          for (const moveName of allLearnsetMoves) {
            if (activeMoves.includes(moveName)) continue;
            const r = runOneScenario(genNum, attacker, moveName, defSpecies,
              { nature: defNat, evs: defEvs }, topItem, topAbility, 'Alt', commonDesc);
            if (!r || !isBetterAlt(r, setOnCommon)) continue;

            let moveType: string | null = null;
            try { moveType = new CalcMove(genNum, moveName as any).type; } catch {}
            const moveUsage    = attackerMoveUsage[moveName] ?? 0;
            const isMeaningful = moveUsage >= MEANINGFUL_MOVE_THRESHOLD;
            const isSameType   = moveType !== null && setMoveTypes.has(moveType);
            const note: LearnsetAlt['coverageNote'] =
              !isMeaningful ? 'snipe' : isSameType ? 'tradeoff' : 'gap';

            learnsetAlts.push({ scenario: r, coverageNote: note, usage: moveUsage });
          }

          // Sort: gaps first, then tradeoffs, then snipes; within category by usage desc, then koChance desc
          const noteRank = { gap: 0, tradeoff: 1, snipe: 2 };
          learnsetAlts.sort((a, b) => {
            const nr = noteRank[a.coverageNote] - noteRank[b.coverageNote];
            if (nr !== 0) return nr;
            if (a.usage !== b.usage) return b.usage - a.usage;
            return b.scenario.koChance - a.scenario.koChance;
          });
        }

        const coverageNote = learnsetAlts[0]?.coverageNote ?? null;
        const isGap = learnsetAlts.length > 0;

        // ── breakpoint: literally at a KO roll threshold on the most-used spread ──
        //   1. Inconsistent OHKO or 2HKO — some rolls secure it, some don't
        //   2. Their EV investment specifically saved them: you OHKO uninvested but can't OHKO standard
        const primary = mostUsed[0] ?? noInvest;
        if (!primary) continue;
        const isBreakpoint =
          (primary.koChance > 0 && primary.koChance < 1 && primary.koN <= 2) ||
          (noInvest !== null && mostUsed.length > 0 &&
            noInvest.koN === 1 && mostUsed[0].koN > 1);

        // ── walled: defender has recovery AND you can't 2HKO them ──
        // If they can heal between hits (item, move, or Regenerator) and you can't 2HKO,
        // consecutive best hits will never secure the kill — a different problem from a breakpoint.
        const defMoves          = Object.keys(tierStats.pokemon?.[defSpecies]?.moves ?? {});
        const defHasRecovery    = RECOVERY_ITEMS.has(topItem) ||
                                   defMoves.some(m => RECOVERY_MOVES_SET.has(m)) ||
                                   REGEN_ABILITIES.has(topAbility);
        const isWalled          = defHasRecovery && primary.koN > 2;

        resultGroups.push({
          species: defSpecies, usage,
          absMin, noInvest, mostUsed, bulkiest, bulkiestAV,
          learnsetAlts, coverageNote,
          isBreakpoint, isWalled, isGap,
        });
      }

      // Sort: breakpoints → walled → gaps → tradeoffs → snipes → rest (then by damage)
      const noteOrder = { gap: 2, tradeoff: 3, snipe: 4, null: 5 } as const;
      resultGroups.sort((a, b) => {
        const rank = (g: SpeciesGroup) =>
          g.isBreakpoint ? 0 : g.isWalled ? 1 : noteOrder[g.coverageNote ?? 'null'];
        const dr = rank(a) - rank(b);
        if (dr !== 0) return dr;
        const aMax = a.mostUsed[0]?.maxPct ?? a.noInvest?.maxPct ?? 0;
        const bMax = b.mostUsed[0]?.maxPct ?? b.noInvest?.maxPct ?? 0;
        return bMax - aMax;
      });

      setGroups(resultGroups);
    } catch (err: any) {
      setCalcError(err?.message ?? 'Calculation failed');
    } finally {
      setCalcLoading(false);
    }
  }

  // ── Summary counts ────────────────────────────────────────────────────────

  const breakpointCount = groups.filter(g => g.isBreakpoint).length;
  const walledCount     = groups.filter(g => g.isWalled).length;
  const gapCount        = groups.filter(g => g.coverageNote === 'gap').length;
  const tradeoffCount   = groups.filter(g => g.coverageNote === 'tradeoff').length;
  const snipeCount      = groups.filter(g => g.coverageNote === 'snipe').length;
  const ohkos           = groups.filter(g => g.mostUsed.some(s => s.koN === 1 && s.koChance > 0)).length;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto p-6">

        <div className="mb-6">
          <h1 className="text-2xl font-bold">Damage Breakpoints</h1>
          <p className="text-slate-400 text-sm mt-1">
            Best of your 4 moves vs each target. Coverage gaps show where the learnset can do better.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 items-start">

          {/* ── Config ───────────────────────────────────────────────────── */}
          <div className="space-y-3 lg:sticky lg:top-6">

            <Panel label="Pokémon & Format">
              <Field label="Species">
                <TextInput placeholder="Garchomp" value={speciesInput} onChange={setSpeciesInput}
                  onKeyDown={e => e.key === 'Enter' && loadData()} />
              </Field>
              <Field label="Format">
                <TextInput placeholder="gen9ou" value={format} onChange={setFormat}
                  onKeyDown={e => e.key === 'Enter' && loadData()} />
              </Field>
              <button onClick={loadData} disabled={dataLoading}
                className="w-full py-2 rounded-xl bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-sm font-medium transition-colors">
                {dataLoading ? 'Loading…' : isLoaded ? '↺ Reload' : 'Load Data'}
              </button>
              {loadError && <p className="text-red-400 text-xs">{loadError}</p>}
              {isLoaded  && (
                <p className="text-green-400/70 text-xs">
                  ✓ {attackerDex.baseSpecies ?? speciesInput} · {learnset.length} moves
                </p>
              )}
            </Panel>

            {isLoaded && (
              <Panel label="Moveset (4 slots)">
                <div className="grid grid-cols-2 gap-2">
                  {moveSlots.map((slot, i) => (
                    <div key={i}>
                      <span className="text-xs text-slate-500 mb-1 block">Slot {i + 1}</span>
                      <select
                        value={slot}
                        onChange={e => setMoveSlots(prev => {
                          const next = [...prev]; next[i] = e.target.value; return next;
                        })}
                        className="w-full bg-slate-700 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-sky-500"
                      >
                        <option value="">— empty —</option>
                        {learnset.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
                <div>
                  <span className="text-xs text-slate-500 mb-1 block">Extra (force non-learnset)</span>
                  <TextInput placeholder="e.g. Tera Blast" value={forceMove} onChange={setForceMove} />
                </div>
                {activeMoves.length === 0 && (
                  <p className="text-xs text-amber-400/70">Select at least one move</p>
                )}
              </Panel>
            )}

            {isLoaded && (
              <Panel label="Ability">
                <select value={selectedAbility} onChange={e => setSelectedAbility(e.target.value)}
                  className="w-full bg-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-sky-500">
                  {availableAbilities.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </Panel>
            )}

            {isLoaded && (
              <Panel label="Spread & EVs">
                {attackerSpreads.length > 0 && (
                  <Field label="Presets from usage data">
                    <select value={selectedSpreadKey} onChange={e => handleSpreadSelect(e.target.value)}
                      className="w-full bg-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-sky-500">
                      <option value="__custom__">Custom</option>
                      {attackerSpreads.map(s => <option key={s.spread} value={s.spread}>{s.label}</option>)}
                    </select>
                  </Field>
                )}

                <Field label="Nature">
                  <select value={nature} onChange={e => { setNature(e.target.value); setSelectedSpreadKey('__custom__'); }}
                    className="w-full bg-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-sky-500">
                    {NATURES.map(n => <option key={n}>{n}</option>)}
                  </select>
                </Field>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-slate-400">EVs</span>
                    <span className={`text-xs tabular-nums ${evTotal > 508 ? 'text-red-400' : 'text-slate-500'}`}>
                      {evTotal}/508
                    </span>
                  </div>
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
              <Panel label="Item & Tera">
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Item">
                    <TextInput placeholder="Choice Band" value={item} onChange={setItem} />
                  </Field>
                  <Field label="Tera Type">
                    <TextInput placeholder="Dragon" value={teraType} onChange={setTeraType} />
                  </Field>
                </div>
              </Panel>
            )}

            {isLoaded && (
              <Panel label="Targets">
                <Field label={`Min usage: ${threshold}%`}>
                  <input type="range" min={0.1} max={10} step={0.1} className="w-full accent-sky-500"
                    value={threshold} onChange={e => setThreshold(parseFloat(e.target.value))} />
                  <div className="flex justify-between text-xs text-slate-600 mt-0.5">
                    <span>0.1%</span><span>10%</span>
                  </div>
                </Field>
              </Panel>
            )}

            {isLoaded && (
              <button onClick={runCalc} disabled={calcLoading || activeMoves.length === 0}
                className="w-full py-3 rounded-xl bg-sky-600 hover:bg-sky-500 active:bg-sky-700 disabled:opacity-40 font-semibold text-sm transition-colors">
                {calcLoading ? 'Calculating…' : 'Calculate Breakpoints'}
              </button>
            )}

            {calcError && (
              <p className="text-red-400 text-xs bg-red-500/10 rounded-xl p-3 border border-red-500/20">
                {calcError}
              </p>
            )}
          </div>

          {/* ── Results ──────────────────────────────────────────────────── */}
          <div>
            {groups.length > 0 && (
              <div className="flex gap-4 mb-4 text-sm flex-wrap items-center">
                <span className="text-slate-400">{groups.length} Pokémon</span>
                {ohkos > 0 && (
                  <span className="text-red-400">{ohkos} OHKO{ohkos !== 1 ? 's' : ''}</span>
                )}
                {breakpointCount > 0 && (
                  <span className="text-amber-400">{breakpointCount} breakpoint{breakpointCount !== 1 ? 's' : ''}</span>
                )}
                {walledCount > 0 && (
                  <span className="text-rose-400">{walledCount} walled</span>
                )}
                {gapCount > 0 && (
                  <span className="text-violet-400">{gapCount} gap{gapCount !== 1 ? 's' : ''}</span>
                )}
                {tradeoffCount > 0 && (
                  <span className="text-sky-400">{tradeoffCount} tradeoff{tradeoffCount !== 1 ? 's' : ''}</span>
                )}
                {snipeCount > 0 && (
                  <span className="text-slate-400">{snipeCount} snipe{snipeCount !== 1 ? 's' : ''}</span>
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
              <div className="py-24 text-center text-slate-600 text-sm">Configure the attacker and hit Calculate.</div>
            )}

            {!calcLoading && groups.length > 0 && (
              <div className="space-y-1.5">
                {groups.map(g => <SpeciesCard key={g.species} group={g} />)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Species card ──────────────────────────────────────────────────────────────

function SpeciesCard({ group }: { group: SpeciesGroup }) {
  // gap/tradeoff expand by default (actionable); snipes stay collapsed
  const [expanded,   setExpanded]   = useState(
    group.isBreakpoint || group.coverageNote === 'gap' || group.coverageNote === 'tradeoff'
  );
  const [showAbsMin, setShowAbsMin] = useState(false);

  const noInvestKo  = group.noInvest;
  const primaryUsed = group.mostUsed[0];
  const topBulky    = group.bulkiestAV ?? group.bulkiest;

  const borderClass = group.isBreakpoint
    ? 'border-amber-500/30 bg-amber-500/5'
    : group.isWalled
      ? 'border-rose-500/30 bg-rose-500/5'
      : group.coverageNote === 'gap'
        ? 'border-violet-500/30 bg-violet-500/5'
        : group.coverageNote === 'tradeoff'
          ? 'border-sky-500/20 bg-sky-500/5'
          : 'border-white/5 bg-slate-800/60';

  return (
    <div className={`rounded-xl overflow-hidden border ${borderClass}`}>
      {/* Header */}
      <button
        className="w-full px-4 py-2.5 flex items-center gap-2 text-left hover:bg-white/5 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <span className="font-semibold text-sm flex-shrink-0">{group.species}</span>
        <span className="text-xs text-slate-500 flex-shrink-0">{(group.usage * 100).toFixed(1)}%</span>
        {group.isBreakpoint && (
          <span className="text-xs font-medium text-amber-400 bg-amber-400/10 rounded px-1.5 py-0.5 flex-shrink-0">
            breakpoint
          </span>
        )}
        {group.isWalled && (
          <span className="text-xs font-medium text-rose-400 bg-rose-400/10 rounded px-1.5 py-0.5 flex-shrink-0">
            walled
          </span>
        )}
        {/* Gap + tradeoff badges only (up to 4) — snipes are in the collapsible section */}
        {group.learnsetAlts.filter(a => a.coverageNote !== 'snipe').slice(0, 4).map((alt, i) => {
          const usageSuffix = alt.usage > 0 ? ` · ${(alt.usage * 100).toFixed(0)}%` : '';
          if (alt.coverageNote === 'gap') return (
            <span key={i} className="text-xs font-medium text-violet-400 bg-violet-400/10 rounded px-1.5 py-0.5 flex-shrink-0">
              gap: {alt.scenario.moveName}{usageSuffix}
            </span>
          );
          return (
            <span key={i} className="text-xs font-medium text-sky-400 bg-sky-400/10 rounded px-1.5 py-0.5 flex-shrink-0">
              alt: {alt.scenario.moveName}{usageSuffix}
            </span>
          );
        })}

        {/* Collapsed quick summary */}
        {!expanded && (
          <div className="ml-auto flex items-center gap-3 text-xs flex-shrink-0">
            {noInvestKo && (
              <span className="text-slate-500">
                0 EVs:{' '}
                <span className={koColor(noInvestKo.koN, noInvestKo.koChance)}>
                  {noInvestKo.koText || `${noInvestKo.minPct}–${noInvestKo.maxPct}%`}
                </span>
              </span>
            )}
            {primaryUsed && (
              <span className="text-slate-500">
                Common:{' '}
                <span className={koColor(primaryUsed.koN, primaryUsed.koChance)}>
                  {primaryUsed.koText || `${primaryUsed.minPct}–${primaryUsed.maxPct}%`}
                </span>
              </span>
            )}
            {topBulky && (
              <span className="text-slate-500 hidden sm:inline">
                Bulk:{' '}
                <span className={koColor(topBulky.koN, topBulky.koChance)}>
                  {topBulky.koText || `${topBulky.minPct}–${topBulky.maxPct}%`}
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

          {/* Absolute min toggle */}
          {group.absMin && (
            <>
              <div className="px-4 py-1.5 border-b border-white/5">
                <button onClick={() => setShowAbsMin(v => !v)}
                  className="text-xs text-slate-600 hover:text-slate-400 transition-colors">
                  {showAbsMin ? '▾ Hide' : '▸ Show'} absolute minimum
                  {' '}({group.absMin.minPct}–{group.absMin.maxPct}%)
                </button>
              </div>
              {showAbsMin && <ScenarioRow scenario={group.absMin} dimmed />}
            </>
          )}

          <div className="divide-y divide-white/5">
            {group.noInvest && <ScenarioRow scenario={group.noInvest} />}
            {/* Gap + tradeoff alts above most-used rows */}
            {group.learnsetAlts.filter(a => a.coverageNote !== 'snipe').map((alt, i) => (
              <ScenarioRow
                key={i}
                scenario={alt.scenario}
                accent={alt.coverageNote === 'gap' ? 'violet' : 'sky'}
                showFullDesc
              />
            ))}
            {group.mostUsed.map((s, i) => <ScenarioRow key={i} scenario={s} showFullDesc />)}
            {group.bulkiest && (
              <ScenarioRow scenario={group.bulkiest} avAlternative={group.bulkiestAV ?? undefined} />
            )}
          </div>
          {/* Snipe alts — niche low-usage moves, shown separately */}
          <SnipeSection alts={group.learnsetAlts.filter(a => a.coverageNote === 'snipe')} />
        </div>
      )}
    </div>
  );
}

// ── Snipe section (collapsible) ───────────────────────────────────────────────

function SnipeSection({ alts }: { alts: LearnsetAlt[] }) {
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
            <ScenarioRow key={i} scenario={alt.scenario} dimmed showFullDesc />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Scenario row ──────────────────────────────────────────────────────────────

function ScenarioRow({ scenario, avAlternative, showFullDesc = false, dimmed = false, accent }: {
  scenario:       ScenarioResult;
  avAlternative?: ScenarioResult;
  showFullDesc?:  boolean;
  dimmed?:        boolean;
  accent?:        'violet' | 'sky' | 'amber';
}) {
  const [withAV, setWithAV] = React.useState(false);
  const displayed = withAV && avAlternative ? avAlternative : scenario;

  const labelColor = accent === 'violet' ? 'text-violet-400'
    : accent === 'sky'    ? 'text-sky-400'
    : accent === 'amber'  ? 'text-amber-400'
    : showFullDesc        ? 'text-slate-300'
    : 'text-slate-500';

  return (
    <div className={`px-4 py-2 ${dimmed ? 'opacity-40' : ''}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 flex items-center gap-2">
          <span className={`text-xs font-medium flex-shrink-0 ${labelColor}`} style={{ minWidth: '76px' }}>
            {displayed.label}
          </span>
          <span className="text-xs text-sky-400/70 font-mono flex-shrink-0 truncate max-w-[110px]">
            {displayed.moveName}
          </span>
          <span className="text-xs text-slate-600 truncate hidden sm:block">{displayed.spreadDesc}</span>
          {avAlternative && (
            <label className="flex items-center gap-1 ml-1 flex-shrink-0 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={withAV}
                onChange={e => setWithAV(e.target.checked)}
                className="accent-violet-500 w-3 h-3"
              />
              <span className={`text-xs ${withAV ? 'text-violet-400' : 'text-slate-600'}`}>AV</span>
            </label>
          )}
        </div>
        <div className="text-right flex-shrink-0 flex items-center gap-2">
          <span className="font-mono text-sm tabular-nums">{displayed.minPct}–{displayed.maxPct}%</span>
          <span className={`text-xs w-14 text-right ${koColor(displayed.koN, displayed.koChance)}`}>
            {displayed.koText || '—'}
          </span>
        </div>
      </div>

      <div className="mt-1.5 h-1 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${barColor(displayed.maxPct)}`}
          style={{ width: `${Math.min(displayed.maxPct, 100)}%` }} />
      </div>

      {showFullDesc && displayed.fullDesc && (
        <p className="mt-1 text-xs text-slate-500 font-mono leading-relaxed">{displayed.fullDesc}</p>
      )}
    </div>
  );
}

// ── Primitives ────────────────────────────────────────────────────────────────

function Panel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="bg-slate-800/60 rounded-2xl p-4 space-y-3 border border-white/5">
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</h2>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="text-xs text-slate-400">{label}</span>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function TextInput({ placeholder, value, onChange, onKeyDown }: {
  placeholder: string; value: string;
  onChange: (v: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}) {
  return (
    <input
      className="w-full bg-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-sky-500"
      placeholder={placeholder} value={value}
      onChange={e => onChange(e.target.value)}
      onKeyDown={onKeyDown}
    />
  );
}
