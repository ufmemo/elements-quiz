import type { Element } from "./elements";

/** Leitner box. Higher means longer interval and a harder exercise. */
export type Box = 0 | 1 | 2 | 3 | 4 | 5;

export interface Mastery {
  box: Box;
  /** Local day index this element is next due. */
  due: number;
  /** Local day index it was first introduced. Caps new-per-day. */
  introducedOn: number;
  seen: number;
  correct: number;
  /** Consecutive correct answers. */
  streak: number;
  /** Times it fell back a box. High values flag an element that isn't sticking. */
  lapses: number;
  lastMs: number | null;
  bestMs: number | null;
}

export type MasteryMap = Record<string, Mastery>;

export function emptyMastery(day: number): Mastery {
  return {
    box: 0,
    due: day,
    introducedOn: day,
    seen: 0,
    correct: 0,
    streak: 0,
    lapses: 0,
    lastMs: null,
    bestMs: null,
  };
}

export function masteryFor(map: MasteryMap, e: Element, day: number): Mastery {
  return map[e.symbol] ?? emptyMastery(day);
}

/** An element counts as "fluent" once it reaches the top box. */
export function isFluent(m: Mastery | undefined): boolean {
  return (m?.box ?? 0) >= 5;
}

export const BOX_LABEL: Record<Box, string> = {
  0: "New",
  1: "Learning",
  2: "Learning",
  3: "Familiar",
  4: "Strong",
  5: "Fluent",
};
