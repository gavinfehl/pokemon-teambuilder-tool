// Move class
// Wraps dex data for a single move and provides a bridge to @smogon/calc's Move.
import { Move as CalcMove } from '@smogon/calc';
import type { GenerationNum } from '@smogon/calc';

export type MoveCategory = 'Physical' | 'Special' | 'Status';
export type MoveTarget =
  | 'normal' | 'self' | 'allAdjacent' | 'allAdjacentFoes'
  | 'any' | 'allies' | 'allAllies' | 'allyOrSelf'
  | 'randomNormal' | 'scripted' | 'adjacentAlly' | 'adjacentAllyOrSelf'
  | 'adjacentFoe' | 'all';

export interface MoveSecondary {
  chance?: number;
  status?: string;           // 'brn' | 'par' | 'frz' | 'psn' | 'tox' | 'slp'
  boosts?: Partial<Record<string, number>>;
  volatileStatus?: string;
}

export interface MoveFlags {
  protect?:   1;    // blocked by Protect
  contact?:   1;    // makes contact
  mirror?:    1;    // copyable by Mirror Move
  snatch?:    1;    // stolen by Snatch
  metronome?: 1;    // usable by Metronome
  charge?:    1;    // charges on first turn
  recharge?:  1;    // recharges on next turn
  bypasssub?: 1;    // bypasses Substitute
  nonsky?:    1;    // can't hit airborne targets
  bullet?:    1;    // affected by Bulletproof
  dance?:     1;    // copied by Dancer
  powder?:    1;    // blocked by Overcoat/Safety Goggles
  punch?:     1;    // boosted by Iron Fist
  sound?:     1;    // bypasses Substitute if user has Liquid Voice, etc.
  [key: string]: 1 | undefined;
}

// Raw shape returned by the server's /dex/:gen/move/:name endpoint
export interface MoveDexData {
  exists:         boolean;
  num:            number;
  name:           string;
  type:           string;
  category:       MoveCategory;
  basePower:      number;
  accuracy:       number | true;    // true = never misses
  pp:             number;
  priority:       number;
  target:         MoveTarget;
  critRatio:      number;
  flags:          MoveFlags;
  secondary:      MoveSecondary | null;
  secondaries:    MoveSecondary[] | null;
  desc:           string;
  shortDesc:      string;
  isZ:            boolean | string; // string = Z-crystal name
  isMax:          boolean | string;
  zMove:          { basePower?: number; effect?: string } | null;
  maxMove:        { basePower: number } | null;
  ignoreAbility:  boolean;
  ignoreImmunity: boolean | Record<string, 1>;
  hasSheerForce:  boolean;
  gen:            number;
}

// Options that affect this move in a specific battle context (passed through to @smogon/calc)
export interface MoveCalcOptions {
  isCrit?:                  boolean;
  useZ?:                    boolean;
  useMax?:                  boolean | 'gmax';
  hits?:                    number;   // for multi-hit moves
  timesUsed?:               number;   // for Fury Cutter, Rollout, etc.
  timesUsedWithMetronome?:  number;
}

async function fetchMoveDex(generation: number, moveName: string): Promise<MoveDexData | null> {
  try {
    const response = await fetch(
      `http://localhost:3001/dex/${generation}/move/${encodeURIComponent(moveName)}`
    );
    if (!response.ok) {
      console.error(`Failed to fetch move data for ${moveName}: ${response.status}`);
      return null;
    }
    return await response.json();
  } catch (err) {
    console.error(`Error fetching move data for ${moveName}:`, err);
    return null;
  }
}

class Move {
  name:         string;
  generation:   number;
  dex:          MoveDexData | null;
  isInitialized: boolean;

  // Convenience accessors populated after init()
  type:         string | null;
  category:     MoveCategory | null;
  basePower:    number | null;
  accuracy:     number | true | null;
  pp:           number | null;
  priority:     number | null;
  target:       MoveTarget | null;
  flags:        MoveFlags | null;
  secondary:    MoveSecondary | null;
  desc:         string | null;
  shortDesc:    string | null;

  constructor(name: string, generation: number = 9) {
    this.name         = name;
    this.generation   = generation;
    this.dex          = null;
    this.isInitialized = false;

    this.type       = null;
    this.category   = null;
    this.basePower  = null;
    this.accuracy   = null;
    this.pp         = null;
    this.priority   = null;
    this.target     = null;
    this.flags      = null;
    this.secondary  = null;
    this.desc       = null;
    this.shortDesc  = null;
  }

  async init(): Promise<void> {
    this.dex = await fetchMoveDex(this.generation, this.name);
    if (!this.dex) {
      console.warn(`Move.init: no dex data for "${this.name}" in gen ${this.generation}`);
      return;
    }
    this.type       = this.dex.type;
    this.category   = this.dex.category;
    this.basePower  = this.dex.basePower;
    this.accuracy   = this.dex.accuracy;
    this.pp         = this.dex.pp;
    this.priority   = this.dex.priority;
    this.target     = this.dex.target;
    this.flags      = this.dex.flags;
    this.secondary  = this.dex.secondary;
    this.desc       = this.dex.desc;
    this.shortDesc  = this.dex.shortDesc;
    this.isInitialized = true;
  }

  /** Returns a @smogon/calc Move for use in damage calculation. */
  toCalcMove(options: MoveCalcOptions = {}): CalcMove {
    const gen = this.generation as GenerationNum;
    return new CalcMove(gen, this.name as any, options);
  }

  get isPhysical(): boolean { return this.category === 'Physical'; }
  get isSpecial():  boolean { return this.category === 'Special'; }
  get isStatus():   boolean { return this.category === 'Status'; }
  get makesContact(): boolean { return this.flags?.contact === 1; }
  get hasSecondaryEffect(): boolean { return this.secondary != null; }
}

export default Move;
