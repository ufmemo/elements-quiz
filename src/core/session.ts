import { elements, type Element } from "./elements";
import { letterTray, pickDistractors } from "./distractors";
import type { MasteryMap } from "./mastery";
import { modeForBox, type ModeId } from "./modes";
import { mulberry32, sample, seedFromString, shuffle, type Rand } from "./rng";
import { rushPool, selectDue, type QueueOptions } from "./scheduler";

export type SessionKind = "review" | "free" | "rush" | "daily";

export interface Card {
  element: Element;
  mode: ModeId;
  /** Wrong answers for the choice modes. */
  distractors: Element[];
  /** Letter pool for Spell. */
  tray: string[];
}

export interface Answer {
  symbol: string;
  correct: boolean;
  ms: number;
  /** What they picked, when it was wrong — a symbol or a name. */
  chose?: string;
}

export interface SessionState {
  kind: SessionKind;
  queue: Card[];
  index: number;
  answers: Answer[];
  startedAt: number;
  /** Rush only. */
  durationMs?: number;
}

export const RUSH_MS = 60_000;
export const DAILY_SIZE = 6;

function makeCard(e: Element, mode: ModeId, pool: readonly Element[], rand: Rand): Card {
  return {
    element: e,
    mode,
    distractors: pickDistractors(e, pool, 3, rand),
    tray: mode === "spell" ? letterTray(e.symbol, 12, rand) : [],
  };
}

/** The scheduled queue: what's due, in the mode each element has earned. */
export function buildReviewCards(opts: QueueOptions, rand: Rand = Math.random): Card[] {
  const pool = opts.pool ?? elements;
  const picked = selectDue(opts);
  const cards = picked.map((e) =>
    makeCard(e, modeForBox(opts.mastery[e.symbol]?.box ?? 0), pool, rand),
  );
  // Shuffle so modes and categories aren't clumped.
  return shuffle(cards, rand);
}

/**
 * Free practice — used when nothing is due. Answers still record timing but
 * must not touch the schedule, so the caller grades these differently.
 */
export function buildFreeCards(
  mastery: MasteryMap,
  count = 10,
  pool: readonly Element[] = elements,
  rand: Rand = Math.random,
): Card[] {
  return sample(pool, count, rand).map((e) =>
    makeCard(e, modeForBox(mastery[e.symbol]?.box ?? 0), pool, rand),
  );
}

/** Timed fluency run over elements the learner already knows. */
export function buildRushCards(
  mastery: MasteryMap,
  count = 60,
  pool: readonly Element[] = elements,
  rand: Rand = Math.random,
): Card[] {
  const source = rushPool(mastery, pool);
  if (source.length === 0) return []; // locked — never spin on an empty pool
  const out: Card[] = [];
  while (out.length < count) {
    for (const e of shuffle(source, rand)) {
      if (out.length >= count) break;
      // Recognition only under time pressure. Spelling against a clock is cruel.
      out.push(makeCard(e, rand() < 0.5 ? "match" : "reverse", pool, rand));
    }
  }
  return out;
}

/**
 * Six elements, seeded by the date, so every device gets the same puzzle and
 * replaying the same day gives the same cards.
 */
export function buildDailyCards(key: string, pool: readonly Element[] = elements): Card[] {
  const rand = mulberry32(seedFromString(key));
  return sample(pool, DAILY_SIZE, rand).map((e) => makeCard(e, "match", pool, rand));
}

export function startSession(kind: SessionKind, queue: Card[], now: number): SessionState {
  return {
    kind,
    queue,
    index: 0,
    answers: [],
    startedAt: now,
    durationMs: kind === "rush" ? RUSH_MS : undefined,
  };
}

export function currentCard(s: SessionState): Card | null {
  return s.queue[s.index] ?? null;
}

export function isComplete(s: SessionState): boolean {
  return s.index >= s.queue.length;
}

export function recordAnswer(s: SessionState, answer: Answer): SessionState {
  return { ...s, index: s.index + 1, answers: [...s.answers, answer] };
}

/** Does the given input answer the card? The whole game rule, in one place. */
export function check(card: Card, input: string): boolean {
  return input === card.element.symbol;
}

export function bestStreak(answers: readonly Answer[]): number {
  let best = 0;
  let run = 0;
  for (const a of answers) {
    run = a.correct ? run + 1 : 0;
    if (run > best) best = run;
  }
  return best;
}

export interface Miss {
  element: Element;
  chose?: string;
}

export interface Summary {
  kind: SessionKind;
  total: number;
  correct: number;
  wrong: number;
  misses: Miss[];
  /** Elements that moved up a box this session. */
  promoted: Element[];
  /** Elements that reached the top box this session. */
  fluent: Element[];
  bestStreak: number;
  durationMs: number;
  perfect: boolean;
}

export function summarize(
  s: SessionState,
  now: number,
  promoted: Element[] = [],
  fluent: Element[] = [],
): Summary {
  const correct = s.answers.filter((a) => a.correct).length;
  const misses: Miss[] = s.answers
    .filter((a) => !a.correct)
    .map((a) => {
      const el = s.queue.find((c) => c.element.symbol === a.symbol)?.element;
      return { element: el!, chose: a.chose };
    })
    .filter((m) => m.element !== undefined);

  return {
    kind: s.kind,
    total: s.answers.length,
    correct,
    wrong: s.answers.length - correct,
    misses,
    promoted,
    fluent,
    bestStreak: bestStreak(s.answers),
    durationMs: now - s.startedAt,
    perfect: s.answers.length > 0 && correct === s.answers.length,
  };
}
