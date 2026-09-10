import { describe, expect, it } from "vitest";
import { elementBySymbol, elements } from "./elements";
import { mulberry32 } from "./rng";
import {
  FALL_LIVES,
  TIER_SIZE,
  answerFall,
  buildFallOptions,
  fakeSymbols,
  fallDuration,
  isRealSymbol,
  optionCount,
  startFall,
  tierFor,
} from "./fall";

const rand = () => mulberry32(99);

describe("difficulty ramp", () => {
  it("steps a tier every 10 correct and then holds", () => {
    expect(tierFor(0)).toBe(0);
    expect(tierFor(9)).toBe(0);
    expect(tierFor(10)).toBe(1);
    expect(tierFor(19)).toBe(1);
    expect(tierFor(20)).toBe(2);
    expect(tierFor(999)).toBe(6);
  });

  it("gets strictly faster until it bottoms out", () => {
    const times = [0, 1, 2, 3, 4, 5, 6].map(fallDuration);
    for (let i = 1; i < times.length; i++) {
      expect(times[i]).toBeLessThan(times[i - 1]);
    }
    expect(times[0]).toBe(6000);
    expect(times.at(-1)).toBe(2400);
  });

  it("never falls faster than the floor", () => {
    expect(fallDuration(50)).toBe(2400);
    expect(fallDuration(-3)).toBe(6000);
  });

  it("grows the choices 4 -> 5 -> 6 and caps there", () => {
    expect(optionCount(0)).toBe(4);
    expect(optionCount(1)).toBe(5);
    expect(optionCount(2)).toBe(6);
    expect(optionCount(6)).toBe(6);
  });
});

describe("fabricated abbreviations", () => {
  it("never invents something that is actually a real element", () => {
    // Offering "Mo" as a fake would quietly teach that Molybdenum isn't real.
    for (const e of elements) {
      for (const f of fakeSymbols(e, 4, mulberry32(e.z))) {
        expect(isRealSymbol(f), `${f} (fake for ${e.name}) is a real symbol`).toBe(false);
      }
    }
  });

  it("knows about elements outside this quiz's 67", () => {
    expect(isRealSymbol("Mo")).toBe(true); // Molybdenum
    expect(isRealSymbol("Pt")).toBe(true); // Platinum
    expect(isRealSymbol("Zz")).toBe(false);
  });

  it("derives fakes from the element's own name", () => {
    const fakes = fakeSymbols(elementBySymbol("Na")!, 4, mulberry32(3));
    // Every fake starts with S, from "Sodium" — the naive guess.
    expect(fakes.every((f) => f[0] === "S")).toBe(true);
    expect(fakes).not.toContain("Na");
  });

  it("never offers the correct answer as a fake", () => {
    for (const e of elements) {
      expect(fakeSymbols(e, 5, mulberry32(e.z))).not.toContain(e.symbol);
    }
  });
});

describe("options", () => {
  it("always contains exactly one correct answer", () => {
    for (const e of elements) {
      for (const n of [4, 5, 6]) {
        const opts = buildFallOptions(e, elements, n, mulberry32(e.z + n));
        expect(opts, `${e.symbol} x${n}`).toHaveLength(n);
        expect(opts.filter((o) => o === e.symbol), e.symbol).toHaveLength(1);
      }
    }
  });

  it("has no duplicates", () => {
    for (const e of elements) {
      const opts = buildFallOptions(e, elements, 6, mulberry32(e.z));
      expect(new Set(opts).size, e.symbol).toBe(6);
    }
  });
});

describe("a run", () => {
  it("starts with three lives and every element queued", () => {
    const s = startFall(0, elements, rand());
    expect(s.lives).toBe(FALL_LIVES);
    expect(s.queue).toHaveLength(67);
    expect(new Set(s.queue).size).toBe(67);
    expect(s.card).not.toBeNull();
    expect(s.outcome).toBe("playing");
  });

  it("clears an element on a correct tap", () => {
    let s = startFall(0, elements, rand());
    const first = s.card!.element.symbol;
    s = answerFall(s, first, 900, rand());
    expect(s.correct).toBe(1);
    expect(s.lives).toBe(FALL_LIVES);
    expect(s.queue).not.toContain(first);
    expect(s.card!.element.symbol).not.toBe(first);
  });

  it("costs a life and re-queues the element when it lands", () => {
    let s = startFall(0, elements, rand());
    const first = s.card!.element.symbol;
    s = answerFall(s, null, 6000, rand());
    expect(s.lives).toBe(FALL_LIVES - 1);
    expect(s.queue).toContain(first); // comes back to fall again
    expect(s.misses.map((m) => m.element.symbol)).toEqual([first]);
  });

  it("remembers what was tapped, so the results screen can show it", () => {
    let s = startFall(0, elements, rand());
    const target = s.card!.element.symbol;
    const wrong = s.card!.options.find((o) => o !== target)!;
    s = answerFall(s, wrong, 800, rand());
    expect(s.misses[0].element.symbol).toBe(target);
    expect(s.misses[0].chose).toBe(wrong);
  });

  it("records no choice when the element simply landed", () => {
    let s = startFall(0, elements, rand());
    s = answerFall(s, null, 6000, rand());
    expect(s.misses[0].chose).toBeUndefined();
  });

  it("treats a wrong tap exactly like a landing", () => {
    // Otherwise you could tap every chip and clear any element for free.
    let s = startFall(0, elements, rand());
    const wrong = s.card!.options.find((o) => o !== s.card!.element.symbol)!;
    s = answerFall(s, wrong, 800, rand());
    expect(s.lives).toBe(FALL_LIVES - 1);
    expect(s.correct).toBe(0);
  });

  it("ends after three misses", () => {
    let s = startFall(0, elements, rand());
    for (let i = 0; i < FALL_LIVES; i++) s = answerFall(s, null, 6000, rand());
    expect(s.outcome).toBe("lost");
    expect(s.lives).toBe(0);
    expect(s.card).toBeNull();
  });

  it("ignores answers once the run is over", () => {
    let s = startFall(0, elements, rand());
    for (let i = 0; i < FALL_LIVES; i++) s = answerFall(s, null, 6000, rand());
    const after = answerFall(s, "H", 100, rand());
    expect(after).toEqual(s);
  });

  it("is won only when every element has been caught", () => {
    let s = startFall(0, elements, rand());
    let guard = 0;
    while (s.outcome === "playing" && guard++ < 500) {
      s = answerFall(s, s.card!.element.symbol, 700, rand());
    }
    expect(s.outcome).toBe("won");
    expect(s.correct).toBe(67);
    expect(s.queue).toHaveLength(0);
  });

  it("makes a missed element come back and still counts toward the win", () => {
    let s = startFall(0, elements, rand());
    s = answerFall(s, null, 6000, rand()); // miss one
    let guard = 0;
    while (s.outcome === "playing" && guard++ < 500) {
      s = answerFall(s, s.card!.element.symbol, 700, rand());
    }
    expect(s.outcome).toBe("won");
    expect(s.correct).toBe(67); // the missed one was caught on its second pass
  });

  it("speeds up and adds a chip as the run goes on", () => {
    let s = startFall(0, elements, rand());
    const firstCard = s.card!;
    for (let i = 0; i < 20 && s.outcome === "playing"; i++) {
      s = answerFall(s, s.card!.element.symbol, 700, rand());
    }
    expect(s.card!.durationMs).toBeLessThan(firstCard.durationMs);
    expect(s.card!.options.length).toBeGreaterThan(firstCard.options.length);
    expect(s.card!.options).toHaveLength(6);
  });

  it("tracks the streak and breaks it on a miss", () => {
    let s = startFall(0, elements, rand());
    s = answerFall(s, s.card!.element.symbol, 700, rand());
    s = answerFall(s, s.card!.element.symbol, 700, rand());
    expect(s.streak).toBe(2);
    s = answerFall(s, null, 6000, rand());
    expect(s.streak).toBe(0);
  });

  it("never deals a card whose options omit the answer, over a whole run", () => {
    let s = startFall(0, elements, rand());
    let guard = 0;
    while (s.outcome === "playing" && guard++ < 500) {
      expect(s.card!.options).toContain(s.card!.element.symbol);
      s = answerFall(s, s.card!.element.symbol, 700, rand());
    }
    expect(guard).toBeGreaterThan(60);
  });

  it("keeps the tier boundary exactly at TIER_SIZE", () => {
    let s = startFall(0, elements, rand());
    for (let i = 0; i < TIER_SIZE - 1; i++) s = answerFall(s, s.card!.element.symbol, 700, rand());
    expect(s.card!.options).toHaveLength(4);
    s = answerFall(s, s.card!.element.symbol, 700, rand());
    expect(s.card!.options).toHaveLength(5);
  });
});
