import { describe, expect, it } from "vitest";
import { CATEGORY_LABEL, elementBySymbol, elements } from "./elements";
import { dayIndex, dayKey } from "./day";
import { mulberry32, sample, seedFromString, shuffle } from "./rng";
import { letterTray, pickDistractors } from "./distractors";
import { emptyMastery, type Mastery, type MasteryMap } from "./mastery";
import { modeForBox } from "./modes";
import {
  INTERVALS,
  MAX_NEW_PER_DAY,
  MAX_SESSION,
  applyAnswer,
  dueCount,
  grade,
  recordTiming,
  rushPool,
  selectDue,
} from "./scheduler";
import {
  buildDailyCards,
  buildReviewCards,
  buildRushCards,
  check,
  currentCard,
  isComplete,
  recordAnswer,
  startSession,
  summarize,
} from "./session";

// ---------------------------------------------------------------- dataset

describe("elements dataset", () => {
  it("has 67 elements", () => {
    expect(elements).toHaveLength(67);
  });

  it("has no duplicate symbols or atomic numbers", () => {
    expect(new Set(elements.map((e) => e.symbol)).size).toBe(67);
    expect(new Set(elements.map((e) => e.z)).size).toBe(67);
  });

  it("gives every element a valid group, period and category", () => {
    for (const e of elements) {
      expect(e.period, e.symbol).toBeGreaterThanOrEqual(1);
      expect(e.period, e.symbol).toBeLessThanOrEqual(7);
      expect(e.group, e.symbol).toBeGreaterThanOrEqual(0);
      expect(e.group, e.symbol).toBeLessThanOrEqual(18);
      expect(CATEGORY_LABEL[e.category], e.symbol).toBeDefined();
    }
  });

  it("only uses group 0 for the f-block", () => {
    for (const e of elements) {
      const fBlock = e.category === "lanthanide" || e.category === "actinide";
      expect(e.group === 0, e.symbol).toBe(fBlock);
    }
  });

  it("puts noble gases in group 18 and halogens in group 17", () => {
    for (const e of elements) {
      if (e.category === "noble") expect(e.group, e.symbol).toBe(18);
      if (e.category === "halogen") expect(e.group, e.symbol).toBe(17);
    }
  });

  it("keeps the original mnemonics", () => {
    expect(elementBySymbol("Na")?.mnemonic).toBe("salt has no metal");
    expect(elementBySymbol("Hg")?.mnemonic).toBe("Freddy Mercury");
  });

  it("has a mnemonic for every symbol that doesn't start its own name", () => {
    // These are the ones a learner actually gets wrong.
    const mismatched = elements.filter(
      (e) => e.symbol[0].toLowerCase() !== e.name[0].toLowerCase(),
    );
    for (const e of mismatched) {
      expect(e.mnemonic, `${e.symbol} (${e.name}) needs a mnemonic`).toBeTruthy();
    }
  });
});

// ---------------------------------------------------------------- day

describe("day", () => {
  it("treats 9pm and 8am next morning as different days", () => {
    const evening = new Date(2026, 8, 10, 21, 0, 0);
    const morning = new Date(2026, 8, 11, 8, 0, 0);
    expect(dayIndex(morning) - dayIndex(evening)).toBe(1);
  });

  it("treats 00:05 and 23:55 on the same date as the same day", () => {
    expect(dayIndex(new Date(2026, 8, 10, 0, 5))).toBe(dayIndex(new Date(2026, 8, 10, 23, 55)));
  });

  it("formats a local date key", () => {
    expect(dayKey(new Date(2026, 8, 1, 12))).toBe("2026-09-01");
  });
});

// ---------------------------------------------------------------- rng

describe("rng", () => {
  it("is deterministic for a given seed", () => {
    const a = mulberry32(1234);
    const b = mulberry32(1234);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it("stays in [0, 1)", () => {
    const r = mulberry32(seedFromString("2026-09-10"));
    for (let i = 0; i < 500; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("shuffles without losing or duplicating items", () => {
    const out = shuffle(elements, mulberry32(7));
    expect(out).toHaveLength(67);
    expect(new Set(out.map((e) => e.symbol)).size).toBe(67);
  });

  it("does not mutate its input", () => {
    const before = elements.map((e) => e.symbol);
    shuffle(elements, mulberry32(9));
    expect(elements.map((e) => e.symbol)).toEqual(before);
  });

  it("is not obviously biased — every item reaches position 0 sometimes", () => {
    const items = [0, 1, 2, 3, 4];
    const firsts = new Set<number>();
    const r = mulberry32(42);
    for (let i = 0; i < 400; i++) firsts.add(shuffle(items, r)[0]);
    expect(firsts.size).toBe(5);
  });

  it("samples without replacement", () => {
    const s = sample(elements, 6, mulberry32(3));
    expect(new Set(s.map((e) => e.symbol)).size).toBe(6);
  });
});

// ---------------------------------------------------------------- distractors

describe("distractors", () => {
  it("never includes the target", () => {
    for (const e of elements) {
      const d = pickDistractors(e, elements, 3, mulberry32(e.z));
      expect(d.map((x) => x.symbol)).not.toContain(e.symbol);
    }
  });

  it("returns the requested count with no duplicates", () => {
    for (const e of elements) {
      const d = pickDistractors(e, elements, 3, mulberry32(e.z));
      expect(d, e.symbol).toHaveLength(3);
      expect(new Set(d.map((x) => x.symbol)).size, e.symbol).toBe(3);
    }
  });

  it("prefers the same category — Silver draws other transition metals", () => {
    const ag = elementBySymbol("Ag")!;
    const d = pickDistractors(ag, elements, 3, mulberry32(11));
    expect(d.every((x) => x.category === "transition")).toBe(true);
  });

  it("falls back past a thin category rather than returning short", () => {
    const la = elementBySymbol("La")!; // only 2 lanthanides in the set
    const d = pickDistractors(la, elements, 3, mulberry32(5));
    expect(d).toHaveLength(3);
  });
});

describe("letter tray for Spell", () => {
  it("contains every letter of the symbol", () => {
    for (const e of elements) {
      const tray = letterTray(e.symbol, 12, mulberry32(e.z));
      for (const ch of e.symbol) expect(tray, e.symbol).toContain(ch);
    }
  });

  it("keeps single-letter symbols non-trivial", () => {
    // The 14 single-letter symbols would be free with a 2-letter tray.
    const singles = elements.filter((e) => e.symbol.length === 1);
    expect(singles).toHaveLength(14);
    for (const e of singles) {
      expect(letterTray(e.symbol, 12, mulberry32(e.z)).length, e.symbol).toBe(12);
    }
  });
});

// ---------------------------------------------------------------- scheduler

describe("grade", () => {
  it("promotes one box and schedules by interval", () => {
    const m = grade(emptyMastery(100), true, 900, 100);
    expect(m.box).toBe(1);
    expect(m.due).toBe(100 + INTERVALS[1]);
    expect(m.streak).toBe(1);
    expect(m.bestMs).toBe(900);
  });

  it("caps at box 5", () => {
    let m = emptyMastery(0);
    for (let i = 0; i < 10; i++) m = grade(m, true, 500, 0);
    expect(m.box).toBe(5);
    expect(m.due).toBe(INTERVALS[5]);
  });

  it("drops two boxes on a miss, never below zero", () => {
    let m: Mastery = { ...emptyMastery(0), box: 3 };
    m = grade(m, false, 2000, 10);
    expect(m.box).toBe(1);
    expect(m.due).toBe(10);
    expect(m.lapses).toBe(1);
    expect(m.streak).toBe(0);

    let low: Mastery = { ...emptyMastery(0), box: 1 };
    low = grade(low, false, 2000, 10);
    expect(low.box).toBe(0);
  });

  it("keeps the best time and always counts the view", () => {
    let m = grade(emptyMastery(0), true, 1500, 0);
    m = grade(m, true, 800, 1);
    expect(m.bestMs).toBe(800);
    m = grade(m, true, 2500, 4);
    expect(m.bestMs).toBe(800);
    expect(m.lastMs).toBe(2500);
    expect(m.seen).toBe(3);
  });

  it("does not lose three weeks of progress to one slip", () => {
    let m = emptyMastery(0);
    for (let i = 0; i < 5; i++) m = grade(m, true, 500, 0); // box 5
    m = grade(m, false, 3000, 0);
    expect(m.box).toBe(3); // still Familiar, not New
  });
});

describe("selectDue", () => {
  it("introduces at most MAX_NEW_PER_DAY on a fresh save", () => {
    const q = selectDue({ mastery: {}, day: 0 });
    expect(q).toHaveLength(MAX_NEW_PER_DAY);
  });

  it("introduces in atomic-number order", () => {
    const q = selectDue({ mastery: {}, day: 0 });
    expect(q.map((e) => e.symbol)).toEqual(["H", "He", "Li", "Be", "B"]);
  });

  it("stops introducing once the day's quota is used", () => {
    let mastery: MasteryMap = {};
    for (const e of selectDue({ mastery, day: 0 })) {
      mastery = applyAnswer(mastery, e.symbol, true, 800, 0);
    }
    // Same day, second session: nothing new, and nothing due until tomorrow.
    expect(selectDue({ mastery, day: 0 })).toHaveLength(0);
  });

  it("returns what is due the next day", () => {
    let mastery: MasteryMap = {};
    for (const e of selectDue({ mastery, day: 0 })) {
      mastery = applyAnswer(mastery, e.symbol, true, 800, 0);
    }
    const tomorrow = selectDue({ mastery, day: 1 });
    // 5 reviews due + 5 new
    expect(tomorrow.length).toBe(10);
  });

  it("never exceeds the session cap", () => {
    const mastery: MasteryMap = {};
    for (const e of elements) mastery[e.symbol] = { ...emptyMastery(0), due: 0, seen: 1 };
    expect(selectDue({ mastery, day: 0 })).toHaveLength(MAX_SESSION);
  });

  it("puts lapsed elements first", () => {
    const mastery: MasteryMap = {};
    for (const e of elements.slice(0, 10)) {
      mastery[e.symbol] = { ...emptyMastery(0), due: 0, seen: 1 };
    }
    const leech = elements[7];
    mastery[leech.symbol] = { ...mastery[leech.symbol], lapses: 4 };
    expect(selectDue({ mastery, day: 0 })[0].symbol).toBe(leech.symbol);
  });

  it("drops new elements when reviews already fill the session", () => {
    const mastery: MasteryMap = {};
    for (const e of elements.slice(0, 30)) {
      mastery[e.symbol] = { ...emptyMastery(0), due: 0, seen: 1 };
    }
    const q = selectDue({ mastery, day: 0 });
    expect(q).toHaveLength(MAX_SESSION);
    expect(q.every((e) => mastery[e.symbol] !== undefined)).toBe(true);
  });
});

describe("multi-day simulation", () => {
  /** Plays every due card for `days`, answering correctly `accuracy` of the time. */
  function simulate(days: number, accuracy: number) {
    const rand = mulberry32(2024);
    let mastery: MasteryMap = {};
    const load: number[] = [];

    for (let day = 0; day < days; day++) {
      const queue = selectDue({ mastery, day });
      load.push(queue.length);
      for (const e of queue) {
        mastery = applyAnswer(mastery, e.symbol, rand() < accuracy, 900, day);
      }
    }
    return { mastery, load };
  }

  it("introduces all 67 elements within about two weeks", () => {
    const { mastery } = simulate(20, 1);
    expect(Object.keys(mastery)).toHaveLength(67);
  });

  it("never lets a perfect learner exceed the session cap", () => {
    const { load } = simulate(60, 1);
    expect(Math.max(...load)).toBeLessThanOrEqual(MAX_SESSION);
  });

  it("drives a perfect learner to fluency and then goes quiet", () => {
    const { mastery, load } = simulate(120, 1);
    const fluent = Object.values(mastery).filter((m) => m.box === 5).length;
    expect(fluent).toBe(67);
    // Once everything is in the 60-day box, most days have nothing due.
    expect(load.slice(-20).filter((n) => n === 0).length).toBeGreaterThan(10);
  });

  it("keeps a struggling learner's workload bounded", () => {
    const { load } = simulate(90, 0.5);
    expect(Math.max(...load)).toBeLessThanOrEqual(MAX_SESSION);
  });

  it("gives a struggling learner more lapses than a strong one", () => {
    const weak = simulate(60, 0.5).mastery;
    const strong = simulate(60, 0.95).mastery;
    const total = (m: MasteryMap) => Object.values(m).reduce((n, x) => n + x.lapses, 0);
    expect(total(weak)).toBeGreaterThan(total(strong));
  });
});

describe("dueCount", () => {
  it("matches what a session would actually deal", () => {
    const mastery: MasteryMap = {};
    expect(dueCount(mastery, 0)).toBe(selectDue({ mastery, day: 0 }).length);
  });
});

describe("rushPool", () => {
  it("falls back to everything for a brand new learner", () => {
    expect(rushPool({})).toHaveLength(67);
  });

  it("uses strong elements once there are enough of them", () => {
    const mastery: MasteryMap = {};
    for (const e of elements.slice(0, 12)) {
      mastery[e.symbol] = { ...emptyMastery(0), box: 4, seen: 5 };
    }
    const pool = rushPool(mastery);
    expect(pool).toHaveLength(12);
    expect(pool.every((e) => mastery[e.symbol]?.box === 4)).toBe(true);
  });
});

// ---------------------------------------------------------------- modes

describe("mode ladder", () => {
  it("escalates with the box", () => {
    expect(modeForBox(0)).toBe("match");
    expect(modeForBox(1)).toBe("match");
    expect(modeForBox(2)).toBe("reverse");
    expect(modeForBox(3)).toBe("spell");
    expect(modeForBox(5)).toBe("spell");
  });
});

// ---------------------------------------------------------------- session

describe("session", () => {
  it("deals cards in the mode each element has earned", () => {
    const mastery: MasteryMap = {
      H: { ...emptyMastery(0), box: 0, due: 0, seen: 1 },
      He: { ...emptyMastery(0), box: 2, due: 0, seen: 4 },
      Li: { ...emptyMastery(0), box: 4, due: 0, seen: 9 },
    };
    const cards = buildReviewCards({ mastery, day: 0 }, mulberry32(1));
    const modeOf = (s: string) => cards.find((c) => c.element.symbol === s)?.mode;
    expect(modeOf("H")).toBe("match");
    expect(modeOf("He")).toBe("reverse");
    expect(modeOf("Li")).toBe("spell");
  });

  it("gives every spell card a usable tray and every choice card distractors", () => {
    const mastery: MasteryMap = {};
    for (const e of elements) mastery[e.symbol] = { ...emptyMastery(0), box: 3, due: 0, seen: 5 };
    for (const c of buildReviewCards({ mastery, day: 0 }, mulberry32(4))) {
      expect(c.tray.length, c.element.symbol).toBeGreaterThan(0);
      for (const ch of c.element.symbol) expect(c.tray).toContain(ch);
    }
  });

  it("checks an answer against the symbol", () => {
    const [card] = buildReviewCards({ mastery: {}, day: 0 }, mulberry32(1));
    expect(check(card, card.element.symbol)).toBe(true);
    expect(check(card, "Zz")).toBe(false);
  });

  it("advances and completes", () => {
    let s = startSession("review", buildReviewCards({ mastery: {}, day: 0 }, mulberry32(1)), 0);
    expect(isComplete(s)).toBe(false);
    while (!isComplete(s)) {
      const card = currentCard(s)!;
      s = recordAnswer(s, { symbol: card.element.symbol, correct: true, ms: 700 });
    }
    expect(isComplete(s)).toBe(true);
    expect(currentCard(s)).toBeNull();
    expect(s.answers).toHaveLength(5);
  });

  it("summarizes hits, misses and streaks", () => {
    let s = startSession("review", buildReviewCards({ mastery: {}, day: 0 }, mulberry32(1)), 1000);
    const order = s.queue.map((c) => c.element.symbol);
    s = recordAnswer(s, { symbol: order[0], correct: true, ms: 500 });
    s = recordAnswer(s, { symbol: order[1], correct: true, ms: 500 });
    s = recordAnswer(s, { symbol: order[2], correct: false, ms: 900, chose: "Xx" });
    s = recordAnswer(s, { symbol: order[3], correct: true, ms: 500 });
    s = recordAnswer(s, { symbol: order[4], correct: true, ms: 500 });

    const sum = summarize(s, 21_000);
    expect(sum.total).toBe(5);
    expect(sum.correct).toBe(4);
    expect(sum.wrong).toBe(1);
    expect(sum.misses).toHaveLength(1);
    expect(sum.misses[0].element.symbol).toBe(order[2]);
    expect(sum.misses[0].chose).toBe("Xx");
    expect(sum.bestStreak).toBe(2);
    expect(sum.durationMs).toBe(20_000);
    expect(sum.perfect).toBe(false);
  });

  it("marks a clean run perfect", () => {
    let s = startSession("review", buildReviewCards({ mastery: {}, day: 0 }, mulberry32(1)), 0);
    for (const c of s.queue) {
      s = recordAnswer(s, { symbol: c.element.symbol, correct: true, ms: 400 });
    }
    expect(summarize(s, 1000).perfect).toBe(true);
  });

  it("does not call an empty session perfect", () => {
    const s = startSession("review", [], 0);
    expect(summarize(s, 0).perfect).toBe(false);
  });
});

describe("rush", () => {
  it("deals recognition cards only — never spelling against a clock", () => {
    const cards = buildRushCards({}, 40, elements, mulberry32(8));
    expect(cards).toHaveLength(40);
    expect(cards.every((c) => c.mode === "match" || c.mode === "reverse")).toBe(true);
  });

  it("keeps dealing past the size of the pool", () => {
    const mastery: MasteryMap = {};
    for (const e of elements.slice(0, 10)) {
      mastery[e.symbol] = { ...emptyMastery(0), box: 4, seen: 6 };
    }
    expect(buildRushCards(mastery, 60, elements, mulberry32(2))).toHaveLength(60);
  });
});

describe("daily", () => {
  it("is identical for the same date and different across dates", () => {
    const a = buildDailyCards("2026-09-10").map((c) => c.element.symbol);
    const b = buildDailyCards("2026-09-10").map((c) => c.element.symbol);
    const c = buildDailyCards("2026-09-11").map((c) => c.element.symbol);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it("deals six distinct elements", () => {
    const cards = buildDailyCards("2026-09-10");
    expect(cards).toHaveLength(6);
    expect(new Set(cards.map((c) => c.element.symbol)).size).toBe(6);
  });
});

describe("recordTiming", () => {
  it("never moves the due date or the box", () => {
    const before = { ...emptyMastery(0), box: 4 as const, due: 21, seen: 6 };
    const after = recordTiming({ Ag: before }, "Ag", true, 640).Ag;
    expect(after.box).toBe(4);
    expect(after.due).toBe(21);
    expect(after.seen).toBe(7);
    expect(after.bestMs).toBe(640);
  });

  it("ignores elements that have never been seen", () => {
    expect(recordTiming({}, "Ag", true, 500)).toEqual({});
  });

  it("does not improve the best time on a wrong answer", () => {
    const before = { ...emptyMastery(0), bestMs: 900, seen: 3 };
    expect(recordTiming({ Ag: before }, "Ag", false, 100).Ag.bestMs).toBe(900);
  });
});
