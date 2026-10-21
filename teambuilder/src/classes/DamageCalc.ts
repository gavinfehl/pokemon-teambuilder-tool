// DamageCalc
// Adapts the project's Pokemon class into @smogon/calc's format and runs damage calculations.
// All actual damage math lives in @smogon/calc — this is just the glue layer.
import {
  calculate,
  Pokemon as CalcPokemon,
  Move    as CalcMove,
  Field,
  Side,
  Result,
} from '@smogon/calc';
import type { GenerationNum } from '@smogon/calc';
import Pokemon from './Pokemon';
import Move, { type MoveCalcOptions } from './Move';

// ── Field / side condition options ──────────────────────────────────────────

export interface SideOptions {
  isReflect?:      boolean;
  isLightScreen?:  boolean;
  isAuroraVeil?:   boolean;
  isSR?:           boolean;      // Stealth Rock
  spikes?:         number;       // 0-3
  isTailwind?:     boolean;
  isHelpingHand?:  boolean;
  isBattery?:      boolean;
  isProtected?:    boolean;
}

export interface FieldOptions {
  weather?:       'Sun' | 'Rain' | 'Sand' | 'Snow' | 'Hail' | 'Harsh Sunshine' | 'Heavy Rain' | 'Strong Winds';
  terrain?:       'Electric' | 'Grassy' | 'Misty' | 'Psychic';
  isGravity?:     boolean;
  isMagicRoom?:   boolean;
  isWonderRoom?:  boolean;
  isFairyAura?:   boolean;
  isDarkAura?:    boolean;
  isAuraBreak?:   boolean;
  // Gen 9 ruinous abilities
  isBeadsOfRuin?:   boolean;
  isSwordOfRuin?:   boolean;
  isTabletsOfRuin?: boolean;
  isVesselOfRuin?:  boolean;
  attackerSide?: SideOptions;
  defenderSide?: SideOptions;
}

// ── Per-Pokemon battle-context overrides ────────────────────────────────────

export interface PokemonCalcOptions {
  boosts?: Partial<Record<'atk' | 'def' | 'spa' | 'spd' | 'spe', number>>;
  status?: 'brn' | 'par' | 'frz' | 'psn' | 'tox' | 'slp' | '';
  isDynamaxed?: boolean | 'gmax';
  abilityOn?: boolean;       // ability is currently active (e.g. Flash Fire triggered)
  alliesFainted?: number;    // for Last Respects, Supreme Overlord, etc.
}

// ── Result wrapper ───────────────────────────────────────────────────────────

export interface DamageResult {
  /** @smogon/calc Result — has .desc(), .range(), .fullDesc(), .kochance() */
  raw:       Result;
  /** "[low, high] HP" */
  range:     [number, number];
  /** e.g. "252+ Atk Choice Band Tera Fire Landorus-Therian Earthquake vs. 0 HP / 4 Def Dragapult: 300-354 (94.6 - 111.7%) -- 68.8% chance to OHKO" */
  fullDesc:  string;
  /** KO chance — { chance, n, text } */
  kochance:  ReturnType<Result['kochance']>;
}

// ── Generation normaliser ────────────────────────────────────────────────────

function toGenNum(gen: number | string): GenerationNum {
  const n = typeof gen === 'string' ? parseInt(gen.replace(/\D/g, '')) : gen;
  if (n >= 1 && n <= 9) return n as GenerationNum;
  console.warn(`DamageCalc: unexpected generation "${gen}", defaulting to 9`);
  return 9;
}

// ── Pokemon adapter ──────────────────────────────────────────────────────────

function adaptPokemon(
  mon: Pokemon,
  genNum: GenerationNum,
  ctx: PokemonCalcOptions = {}
): CalcPokemon {
  const moves = Object.values(mon.moveset)
    .filter((m): m is string => m !== null);

  return new CalcPokemon(genNum, mon.species as any, {
    level:        mon.info.level,
    ability:      mon.info.ability   ?? undefined,
    item:         mon.info.item      ?? undefined,
    nature:       mon.info.nature    ?? undefined,
    gender:       mon.info.gender    as any,
    ivs:          mon.ivs,
    evs:          mon.evs,
    teraType:     mon.info.teratype  as any,
    moves:        moves.length ? moves as any[] : undefined,
    status:       ctx.status,
    boosts:       ctx.boosts         as any,
    isDynamaxed:  ctx.isDynamaxed,
    abilityOn:    ctx.abilityOn,
    alliesFainted: ctx.alliesFainted,
  });
}

// ── Field builder ────────────────────────────────────────────────────────────

function buildField(opts: FieldOptions = {}): Field {
  return new Field({
    weather:           opts.weather    as any,
    terrain:           opts.terrain    as any,
    isGravity:         opts.isGravity,
    isMagicRoom:       opts.isMagicRoom,
    isWonderRoom:      opts.isWonderRoom,
    isFairyAura:       opts.isFairyAura,
    isDarkAura:        opts.isDarkAura,
    isAuraBreak:       opts.isAuraBreak,
    isBeadsOfRuin:     opts.isBeadsOfRuin,
    isSwordOfRuin:     opts.isSwordOfRuin,
    isTabletsOfRuin:   opts.isTabletsOfRuin,
    isVesselOfRuin:    opts.isVesselOfRuin,
    attackerSide:      opts.attackerSide ? new Side(opts.attackerSide) : new Side(),
    defenderSide:      opts.defenderSide ? new Side(opts.defenderSide) : new Side(),
    gameType:          'Singles',
  });
}

// ── Main API ─────────────────────────────────────────────────────────────────

class DamageCalc {
  /**
   * Calculate damage for a single hit.
   *
   * @param attacker     Your Pokemon class instance (must be initialized)
   * @param defender     Your Pokemon class instance (must be initialized)
   * @param move         A Move instance (must be initialized) or just the move name string
   * @param field        Optional field/side conditions
   * @param attackerCtx  Optional battle-context overrides for the attacker (boosts, status, etc.)
   * @param defenderCtx  Optional battle-context overrides for the defender
   * @param moveOpts     Optional calc-specific move options (isCrit, useZ, etc.)
   */
  static calculate(
    attacker:    Pokemon,
    defender:    Pokemon,
    move:        Move | string,
    field:       FieldOptions        = {},
    attackerCtx: PokemonCalcOptions  = {},
    defenderCtx: PokemonCalcOptions  = {},
    moveOpts:    MoveCalcOptions     = {},
  ): DamageResult {
    // Normalise generation — use attacker's gen, they should match
    const genNum = toGenNum(attacker.generation);

    const calcAttacker = adaptPokemon(attacker, genNum, attackerCtx);
    const calcDefender = adaptPokemon(defender, genNum, defenderCtx);

    const calcMove: CalcMove =
      move instanceof Move
        ? move.toCalcMove(moveOpts)
        : new CalcMove(genNum, move as any, moveOpts);

    const calcField = buildField(field);

    const result = calculate(genNum, calcAttacker, calcDefender, calcMove, calcField);

    return {
      raw:       result,
      range:     result.range(),
      fullDesc:  result.fullDesc(),
      kochance:  result.kochance(),
    };
  }

  /**
   * Low-level calculate — accepts @smogon/calc Pokemon directly.
   * Useful when you've already built CalcPokemon objects from raw stats data
   * (e.g. the breakpoints page building defenders from tier usage JSON).
   */
  static calculateRaw(
    attacker:  CalcPokemon,
    defender:  CalcPokemon,
    move:      CalcMove | string,
    gen:       GenerationNum = 9,
    field:     FieldOptions  = {},
  ): DamageResult {
    const calcMove = typeof move === 'string'
      ? new CalcMove(gen, move as any)
      : move;
    const result = calculate(gen, attacker, defender, calcMove, buildField(field));
    return {
      raw:      result,
      range:    result.range(),
      fullDesc: result.fullDesc(),
      kochance: result.kochance(),
    };
  }
}

export default DamageCalc;
