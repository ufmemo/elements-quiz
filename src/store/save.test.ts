import { describe, expect, it } from "vitest";
import { CURRENT_VERSION, emptySave, load, migrate, persist, touchDay, type StorageLike } from "./save";
import { emptyMastery } from "../core/mastery";

function fakeStorage(seed?: string): StorageLike & { data: Record<string, string> } {
  const data: Record<string, string> = {};
  if (seed !== undefined) data["elements-quiz/save"] = seed;
  return {
    data,
    getItem: (k) => data[k] ?? null,
    setItem: (k, v) => {
      data[k] = v;
    },
  };
}

describe("save round-trip", () => {
  it("persists and reloads mastery", () => {
    const s = fakeStorage();
    const save = emptySave();
    save.mastery.Ag = { ...emptyMastery(10), box: 3, due: 17, seen: 4, correct: 3 };
    persist(save, s);

    const back = load(s);
    expect(back.mastery.Ag.box).toBe(3);
    expect(back.mastery.Ag.due).toBe(17);
    expect(back.schemaVersion).toBe(CURRENT_VERSION);
  });

  it("returns an empty save when storage is empty", () => {
    expect(load(fakeStorage()).mastery).toEqual({});
  });

  it("survives corrupt JSON instead of throwing", () => {
    expect(load(fakeStorage("{not json"))).toEqual(emptySave());
  });

  it("survives a null storage — Safari private mode", () => {
    expect(load(null)).toEqual(emptySave());
    expect(() => persist(emptySave(), null)).not.toThrow();
  });

  it("survives a storage that throws on write", () => {
    const hostile: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceeded");
      },
    };
    expect(() => persist(emptySave(), hostile)).not.toThrow();
  });
});

describe("migrate", () => {
  it("repairs a partial record rather than dropping the save", () => {
    const out = migrate({ mastery: { Fe: { box: 2 } } });
    expect(out.mastery.Fe.box).toBe(2);
    expect(out.mastery.Fe.seen).toBe(0);
    expect(out.mastery.Fe.lastMs).toBeNull();
  });

  it("clamps an out-of-range box", () => {
    expect(migrate({ mastery: { Fe: { box: 99 } } }).mastery.Fe.box).toBe(0);
    expect(migrate({ mastery: { Fe: { box: -3 } } }).mastery.Fe.box).toBe(0);
  });

  it("drops junk entries but keeps good ones", () => {
    const out = migrate({ mastery: { Fe: { box: 2 }, Bad: null, Worse: 7 } });
    expect(Object.keys(out.mastery)).toEqual(["Fe"]);
  });

  it("defaults a high score that older saves don't have", () => {
    // Saves written before Drop existed must still load.
    expect(migrate({ rushBest: 12 }).fallBest).toBe(0);
    expect(migrate({ rushBest: 12 }).rushBest).toBe(12);
    expect(migrate({ fallBest: 41 }).fallBest).toBe(41);
  });

  it("defaults settings and stamps the current version", () => {
    const out = migrate({});
    expect(out.settings).toEqual({ sound: true, motion: "full", timerless: false });
    expect(out.schemaVersion).toBe(CURRENT_VERSION);
  });

  it("preserves settings that are present", () => {
    const out = migrate({ settings: { sound: false, motion: "reduced", timerless: true } });
    expect(out.settings).toEqual({ sound: false, motion: "reduced", timerless: true });
  });

  it("handles non-objects", () => {
    expect(migrate(null)).toEqual(emptySave());
    expect(migrate("nope")).toEqual(emptySave());
    expect(migrate(42)).toEqual(emptySave());
  });
});

describe("day streak", () => {
  it("starts at 1", () => {
    expect(touchDay(emptySave(), 100).stats.dayStreak).toBe(1);
  });

  it("extends on consecutive days", () => {
    let s = touchDay(emptySave(), 100);
    s = touchDay(s, 101);
    s = touchDay(s, 102);
    expect(s.stats.dayStreak).toBe(3);
  });

  it("is a no-op on a second session the same day", () => {
    let s = touchDay(emptySave(), 100);
    s = touchDay(s, 100);
    expect(s.stats.dayStreak).toBe(1);
  });

  it("resets after a gap", () => {
    let s = touchDay(emptySave(), 100);
    s = touchDay(s, 101);
    s = touchDay(s, 110);
    expect(s.stats.dayStreak).toBe(1);
  });
});
