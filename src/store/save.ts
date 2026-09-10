import type { MasteryMap } from "../core/mastery";

export const STORAGE_KEY = "elements-quiz/save";

export interface DailyResult {
  correct: number;
  total: number;
  ms: number;
}

export interface Settings {
  sound: boolean;
  /** "reduced" also gets set automatically by prefers-reduced-motion. */
  motion: "full" | "reduced";
  /** Removes the clock from Rush. Time pressure suits some kids and not others. */
  timerless: boolean;
}

export interface Stats {
  dayStreak: number;
  lastPlayedDay: number;
  totalAnswers: number;
}

export interface Save {
  schemaVersion: 1;
  mastery: MasteryMap;
  stats: Stats;
  settings: Settings;
  rushBest: number;
  /** Most elements caught in a single Drop run. */
  fallBest: number;
  daily: Record<string, DailyResult>;
}

export const CURRENT_VERSION = 1 as const;

export function emptySave(): Save {
  return {
    schemaVersion: CURRENT_VERSION,
    mastery: {},
    stats: { dayStreak: 0, lastPlayedDay: -1, totalAnswers: 0 },
    settings: { sound: true, motion: "full", timerless: false },
    rushBest: 0,
    fallBest: 0,
    daily: {},
  };
}

/**
 * Accepts anything and returns a valid Save.
 *
 * Storage is the one place we don't control the input: a half-written record, a
 * save from an older build, or a user poking at devtools all land here. Repair
 * rather than throw — losing the mastery data is worse than losing one field.
 */
export function migrate(raw: unknown): Save {
  const base = emptySave();
  if (typeof raw !== "object" || raw === null) return base;
  const r = raw as Partial<Save>;

  return {
    schemaVersion: CURRENT_VERSION,
    mastery: sanitizeMastery(r.mastery),
    stats: {
      dayStreak: num(r.stats?.dayStreak, 0),
      lastPlayedDay: num(r.stats?.lastPlayedDay, -1),
      totalAnswers: num(r.stats?.totalAnswers, 0),
    },
    settings: {
      sound: typeof r.settings?.sound === "boolean" ? r.settings.sound : true,
      motion: r.settings?.motion === "reduced" ? "reduced" : "full",
      timerless: r.settings?.timerless === true,
    },
    rushBest: num(r.rushBest, 0),
    fallBest: num(r.fallBest, 0),
    daily: typeof r.daily === "object" && r.daily !== null ? r.daily : {},
  };
}

function num(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function sanitizeMastery(raw: unknown): MasteryMap {
  if (typeof raw !== "object" || raw === null) return {};
  const out: MasteryMap = {};
  for (const [symbol, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value !== "object" || value === null) continue;
    const m = value as Record<string, unknown>;
    const box = num(m.box, 0);
    out[symbol] = {
      box: (box >= 0 && box <= 5 ? box : 0) as MasteryMap[string]["box"],
      due: num(m.due, 0),
      introducedOn: num(m.introducedOn, 0),
      seen: num(m.seen, 0),
      correct: num(m.correct, 0),
      streak: num(m.streak, 0),
      lapses: num(m.lapses, 0),
      lastMs: typeof m.lastMs === "number" ? m.lastMs : null,
      bestMs: typeof m.bestMs === "number" ? m.bestMs : null,
    };
  }
  return out;
}

/** Minimal shape we need — lets tests run without jsdom. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function defaultStorage(): StorageLike | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null; // Safari private mode throws on access
  }
}

export function load(storage: StorageLike | null = defaultStorage()): Save {
  if (!storage) return emptySave();
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return emptySave();
    return migrate(JSON.parse(raw));
  } catch {
    return emptySave();
  }
}

export function persist(save: Save, storage: StorageLike | null = defaultStorage()): void {
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(save));
  } catch {
    // Quota or private mode. The session still works; only durability is lost.
  }
}

/**
 * Day streak, counted on the first answer of a day.
 * Same day is a no-op, yesterday extends, any longer gap restarts at 1.
 */
export function touchDay(save: Save, day: number): Save {
  const { lastPlayedDay, dayStreak } = save.stats;
  if (lastPlayedDay === day) return save;
  const next = lastPlayedDay === day - 1 ? dayStreak + 1 : 1;
  return { ...save, stats: { ...save.stats, dayStreak: next, lastPlayedDay: day } };
}
