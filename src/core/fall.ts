import { elements, type Element } from "./elements";
import { shuffle, type Rand } from "./rng";
import type { Answer, Miss } from "./session";

/**
 * "Drop" — the element name falls, you tap its symbol before it lands.
 *
 * Unlike the other modes this one has its own clock, lives and re-queue, so it
 * lives here as a self-contained machine rather than as an entry in the
 * exercise registry.
 */

export const FALL_LIVES = 3;
export const TIER_SIZE = 10;

/** Fall time per tier, in ms. Steps down every TIER_SIZE correct answers. */
const DURATIONS = [6000, 5000, 4200, 3600, 3100, 2700, 2400];

export function tierFor(correct: number): number {
  return Math.min(Math.floor(correct / TIER_SIZE), DURATIONS.length - 1);
}

export function fallDuration(tier: number): number {
  return DURATIONS[Math.min(Math.max(tier, 0), DURATIONS.length - 1)];
}

/** 4 -> 5 -> 6, then held. Six two-letter chips still clear 44pt on a phone. */
export function optionCount(tier: number): number {
  return Math.min(4 + tier, 6);
}

/**
 * Every real element symbol, including the 51 outside this quiz's set.
 *
 * A fabricated distractor must never collide with a real symbol — offering
 * "Mo" as a made-up abbreviation would quietly teach that Molybdenum isn't a
 * thing. This list is the guard, not the quiz content.
 */
const REAL_SYMBOLS = new Set(
  ("H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn " +
    "Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La " +
    "Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po " +
    "At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg " +
    "Cn Nh Fl Mc Lv Ts Og").split(" "),
);

export function isRealSymbol(s: string): boolean {
  return REAL_SYMBOLS.has(s);
}

/**
 * Plausible fakes, built from the element's own name.
 *
 * "Sodium" yields So, Sd, Si... — which is exactly the naive guess a student
 * makes before they learn that Sodium is Na. That makes these far better
 * distractors than random letter pairs, because the trap is the student's own
 * reasoning rather than noise. Anything that turns out to be a real symbol is
 * discarded.
 */
export function fakeSymbols(element: Element, n: number, rand: Rand = Math.random): string[] {
  const name = element.name;
  const first = name[0].toUpperCase();

  const candidates: string[] = [];
  for (let i = 1; i < name.length; i++) {
    candidates.push(first + name[i].toLowerCase());
  }
  // Also the first two letters, the single most tempting wrong answer of all.
  candidates.unshift(first + name[1].toLowerCase());

  const out: string[] = [];
  const seen = new Set<string>([element.symbol]);
  for (const c of shuffle(candidates, rand)) {
    if (out.length >= n) break;
    if (seen.has(c) || isRealSymbol(c)) continue;
    seen.add(c);
    out.push(c);
  }
  return out;
}

export interface FallCard {
  element: Element;
  /** Symbols to show, already shuffled. Exactly one is correct. */
  options: string[];
  durationMs: number;
}

/** Roughly half fabricated, half real symbols from other elements. */
export function buildFallOptions(
  target: Element,
  pool: readonly Element[],
  count: number,
  rand: Rand = Math.random,
): string[] {
  const wanted = count - 1;
  const fakes = fakeSymbols(target, Math.ceil(wanted / 2), rand);

  const reals: string[] = [];
  const others = shuffle(
    pool.filter((e) => e.symbol !== target.symbol),
    rand,
  );
  // Same initial letter first — Ag/Au/Ar are the confusions worth drilling.
  const sameLetter = others.filter((e) => e.symbol[0] === target.symbol[0]);
  for (const e of [...sameLetter, ...others]) {
    if (reals.length >= wanted - fakes.length) break;
    if (reals.includes(e.symbol)) continue;
    reals.push(e.symbol);
  }

  return shuffle([target.symbol, ...fakes, ...reals], rand);
}

export interface FallState {
  pool: readonly Element[];
  /** Symbols still to be caught. */
  queue: string[];
  card: FallCard | null;
  lives: number;
  correct: number;
  streak: number;
  answers: Answer[];
  misses: Miss[];
  startedAt: number;
  outcome: "playing" | "won" | "lost";
}

function draw(
  queue: string[],
  pool: readonly Element[],
  correct: number,
  rand: Rand,
): FallCard | null {
  const symbol = queue[0];
  if (!symbol) return null;
  const element = pool.find((e) => e.symbol === symbol);
  if (!element) return null;
  const tier = tierFor(correct);
  return {
    element,
    options: buildFallOptions(element, pool, optionCount(tier), rand),
    durationMs: fallDuration(tier),
  };
}

export function startFall(
  now: number,
  pool: readonly Element[] = elements,
  rand: Rand = Math.random,
): FallState {
  const queue = shuffle(pool, rand).map((e) => e.symbol);
  return {
    pool,
    queue,
    card: draw(queue, pool, 0, rand),
    lives: FALL_LIVES,
    correct: 0,
    streak: 0,
    answers: [],
    misses: [],
    startedAt: now,
    outcome: "playing",
  };
}

/**
 * One decision. `chosen` is the tapped symbol, or null when the element landed.
 *
 * A wrong tap counts the same as a landing: without that you could simply tap
 * every chip and clear any element for free.
 */
export function answerFall(
  state: FallState,
  chosen: string | null,
  ms: number,
  rand: Rand = Math.random,
): FallState {
  if (state.outcome !== "playing" || !state.card) return state;

  const { element } = state.card;
  const right = chosen === element.symbol;
  const answers = [...state.answers, { symbol: element.symbol, correct: right, ms, chose: chosen ?? undefined }];

  if (right) {
    const queue = state.queue.slice(1);
    const correct = state.correct + 1;
    if (queue.length === 0) {
      return { ...state, queue, card: null, correct, streak: state.streak + 1, answers, outcome: "won" };
    }
    return {
      ...state,
      queue,
      correct,
      streak: state.streak + 1,
      answers,
      card: draw(queue, state.pool, correct, rand),
    };
  }

  const lives = state.lives - 1;
  const misses: Miss[] = [...state.misses, { element, chose: chosen ?? undefined }];

  // Back into the queue to fall again, a few places later.
  const rest = state.queue.slice(1);
  const at = Math.min(rest.length, 2 + Math.floor(rand() * 4));
  const queue = [...rest.slice(0, at), element.symbol, ...rest.slice(at)];

  if (lives <= 0) {
    return { ...state, queue, card: null, lives, streak: 0, answers, misses, outcome: "lost" };
  }
  return {
    ...state,
    queue,
    lives,
    streak: 0,
    answers,
    misses,
    card: draw(queue, state.pool, state.correct, rand),
  };
}
