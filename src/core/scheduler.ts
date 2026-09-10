import { elements, type Element } from "./elements";
import type { Box, Mastery, MasteryMap } from "./mastery";
import { emptyMastery } from "./mastery";

/**
 * A Leitner box system, not full SM-2.
 *
 * SM-2's ease factors need a self-reported difficulty rating after every card.
 * No kid answers that honestly, and it doubles the taps per question. Six boxes
 * with fixed intervals gets most of the retention benefit with none of that.
 */
export const INTERVALS: readonly number[] = [0, 1, 3, 7, 21, 60];

/** Keeps a session under about four minutes. */
export const MAX_SESSION = 24;

/**
 * Introduce at most this many unseen elements per day. Without the cap, day one
 * deals all 67 and day four is an unplayable wall of reviews — the single most
 * common way a homemade SRS gets abandoned.
 */
export const MAX_NEW_PER_DAY = 5;

export function grade(m: Mastery, correct: boolean, ms: number, day: number): Mastery {
  const seen = m.seen + 1;

  if (!correct) {
    // Drop two boxes, not to zero. One slip shouldn't erase three weeks.
    const box = Math.max(0, m.box - 2) as Box;
    return {
      ...m,
      box,
      due: day,
      streak: 0,
      lapses: m.lapses + 1,
      seen,
      lastMs: ms,
    };
  }

  const box = Math.min(5, m.box + 1) as Box;
  return {
    ...m,
    box,
    due: day + INTERVALS[box],
    streak: m.streak + 1,
    correct: m.correct + 1,
    seen,
    lastMs: ms,
    bestMs: m.bestMs === null ? ms : Math.min(m.bestMs, ms),
  };
}

/** Applies a graded answer to the whole map, creating the record if needed. */
export function applyAnswer(
  map: MasteryMap,
  symbol: string,
  correct: boolean,
  ms: number,
  day: number,
): MasteryMap {
  const prev = map[symbol] ?? emptyMastery(day);
  return { ...map, [symbol]: grade(prev, correct, ms, day) };
}

export function isDue(m: Mastery | undefined, day: number): boolean {
  return m !== undefined && m.due <= day;
}

export function introducedOn(map: MasteryMap, day: number): number {
  return Object.values(map).filter((m) => m.introducedOn === day).length;
}

export interface QueueOptions {
  mastery: MasteryMap;
  day: number;
  pool?: readonly Element[];
  maxCards?: number;
  maxNew?: number;
}

/**
 * What to study right now.
 *
 * Lapses sort first: the elements actively being forgotten deserve the freshest
 * attention. Anything past the cap simply stays due tomorrow.
 */
export function selectDue(opts: QueueOptions): Element[] {
  const {
    mastery,
    day,
    pool = elements,
    maxCards = MAX_SESSION,
    maxNew = MAX_NEW_PER_DAY,
  } = opts;

  const due = pool
    .filter((e) => isDue(mastery[e.symbol], day))
    .sort((a, b) => {
      const ma = mastery[a.symbol];
      const mb = mastery[b.symbol];
      if (mb.lapses !== ma.lapses) return mb.lapses - ma.lapses;
      if (ma.due !== mb.due) return ma.due - mb.due;
      return a.z - b.z;
    });

  const slotsLeft = Math.max(0, maxCards - due.length);
  const newSlots = Math.min(slotsLeft, Math.max(0, maxNew - introducedOn(mastery, day)));

  const fresh = pool
    .filter((e) => mastery[e.symbol] === undefined)
    .sort((a, b) => a.z - b.z)
    .slice(0, newSlots);

  return [...due, ...fresh].slice(0, maxCards);
}

/** How many cards Today should advertise. */
export function dueCount(mastery: MasteryMap, day: number, pool: readonly Element[] = elements): number {
  return selectDue({ mastery, day, pool }).length;
}

/** Rush needs this many known elements before it means anything. */
export const RUSH_MIN = 8;

/**
 * Rush is a fluency test, so it draws only on elements the learner already
 * knows. Below the threshold it returns nothing and the mode stays locked —
 * falling back to the full set made day-one Rush deal the same unknown
 * elements as Review, which is exactly why the two felt identical.
 */
export function rushPool(mastery: MasteryMap, pool: readonly Element[] = elements): Element[] {
  const atLeast = (box: number) => pool.filter((e) => (mastery[e.symbol]?.box ?? -1) >= box);
  const strong = atLeast(4);
  if (strong.length >= RUSH_MIN) return strong;
  const known = atLeast(2);
  if (known.length >= RUSH_MIN) return known;
  return [];
}

export function rushUnlocked(mastery: MasteryMap, pool: readonly Element[] = elements): boolean {
  return rushPool(mastery, pool).length > 0;
}

/** How many elements are far enough along to count toward unlocking Rush. */
export function rushProgress(mastery: MasteryMap, pool: readonly Element[] = elements): number {
  return pool.filter((e) => (mastery[e.symbol]?.box ?? -1) >= 2).length;
}

/**
 * Records timing without touching the schedule.
 *
 * Free practice, Rush and Daily all report answers, but none of them should
 * move an element's due date — a lucky fast tap in a timed run must not
 * schedule something 60 days out. Unseen elements are left alone entirely so
 * these modes can't smuggle an element past the new-per-day cap.
 */
export function recordTiming(
  map: MasteryMap,
  symbol: string,
  correct: boolean,
  ms: number,
): MasteryMap {
  const prev = map[symbol];
  if (!prev) return map;
  return {
    ...map,
    [symbol]: {
      ...prev,
      seen: prev.seen + 1,
      correct: prev.correct + (correct ? 1 : 0),
      lastMs: ms,
      bestMs: correct ? (prev.bestMs === null ? ms : Math.min(prev.bestMs, ms)) : prev.bestMs,
    },
  };
}
