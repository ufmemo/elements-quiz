import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render as rtlRender, screen, within } from "@testing-library/react";
import { StrictMode } from "react";
import App from "./components/App";
import { elementBySymbol, elements as ALL } from "./core/elements";
import { load } from "./store/save";

/**
 * Every test renders through StrictMode, because main.tsx does. StrictMode
 * double-invokes effects in dev, and rendering bare hid a real bug: a
 * pushState/back() pair in an effect bounced the learner straight out of any
 * session they opened.
 */
function render(ui: React.ReactElement) {
  return rtlRender(<StrictMode>{ui}</StrictMode>);
}

// jsdom has no canvas; confetti only fires on a perfect run.
vi.mock("canvas-confetti", () => ({ default: { create: () => () => Promise.resolve() } }));

const HOLD_CORRECT = 620;
const HOLD_WRONG = 2200;
/** Drop: a tier-0 fall, plus the half-second the right answer is shown. */
const FALL_MS = 6100;
const REVEAL_MS = 560;

beforeEach(() => {
  localStorage.clear();
  history.replaceState(null, "");
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

/** The symbol currently being asked, read off the prompt the learner sees. */
function askedSymbol(): string {
  const prompt = document.querySelector("[data-mode]") as HTMLElement;
  const text = (prompt.textContent ?? "").trim();
  // Match shows the symbol behind its atomic-number badge; the others show the name.
  if (prompt.dataset.mode === "match") return text.replace(/^\d+/, "").trim();
  const found = ALL.find((e) => e.name === text);
  if (!found) throw new Error(`no element named "${text}"`);
  return found.symbol;
}

function currentMode(): string {
  return (document.querySelector("[data-mode]") as HTMLElement).dataset.mode!;
}

/** Answers the current card. */
function answer(correctly: boolean) {
  const symbol = askedSymbol();
  const el = elementBySymbol(symbol)!;
  const mode = currentMode();

  if (mode === "match") {
    const buttons = screen.getAllByRole("button");
    const target = buttons.find((b) =>
      correctly ? b.textContent === el.name : b.textContent && b.textContent !== el.name && b.dataset.opt,
    );
    fireEvent.click(target!);
  } else if (mode === "reverse") {
    const opts = [...document.querySelectorAll("[data-opt]")] as HTMLElement[];
    const target = opts.find((b) =>
      correctly ? b.dataset.opt === el.symbol : b.dataset.opt !== el.symbol,
    );
    fireEvent.click(target!);
  } else {
    const keys = [...document.querySelectorAll("[data-key]")] as HTMLElement[];
    const wanted = correctly ? el.symbol : "";
    if (correctly) {
      for (const ch of wanted) {
        const k = keys.find((x) => x.dataset.key === ch && !(x as HTMLButtonElement).disabled);
        fireEvent.click(k!);
      }
    } else {
      // Tap any wrong letters to fill the slots.
      let taps = 0;
      for (const k of keys) {
        if (taps >= el.symbol.length) break;
        if (k.dataset.key === el.symbol[taps]) continue;
        fireEvent.click(k);
        taps++;
      }
    }
  }
  act(() => {
    vi.advanceTimersByTime(correctly ? HOLD_CORRECT + 50 : HOLD_WRONG + 50);
  });
  return el;
}

/**
 * Parks every element in the far future except `symbol`, so the review queue is
 * exactly one card. Without this the scheduler also introduces the day's five
 * new elements, and the first card is whichever one the shuffle picked.
 */
function parkAllExcept(symbol: string, box: number) {
  const mastery: Record<string, unknown> = {};
  for (const e of ALL) {
    mastery[e.symbol] = { box: 5, due: 9_999_999, introducedOn: 0, seen: 9, correct: 9 };
  }
  mastery[symbol] = { box, due: 0, introducedOn: 0, seen: box + 2, correct: box };
  localStorage.setItem(
    "elements-quiz/save",
    JSON.stringify({ mastery, stats: { lastPlayedDay: 0, dayStreak: 1, totalAnswers: 9 } }),
  );
}

/** The symbol of the element currently falling in Drop. */
function fallingSymbol(): string {
  const name = document.querySelector("[data-falling]")!.textContent!.trim();
  const found = ALL.find((e) => e.name === name);
  if (!found) throw new Error(`nothing falling named "${name}"`);
  return found.symbol;
}

/** Lets the current Drop element land and waits out the answer reveal. */
function dropLand() {
  act(() => vi.advanceTimersByTime(FALL_MS));
  act(() => vi.advanceTimersByTime(REVEAL_MS));
}

/** Taps a deliberately wrong chip in Drop and waits out the reveal. */
function dropTapWrong(): string {
  const target = fallingSymbol();
  const chip = [...document.querySelectorAll("[data-opt]")].find(
    (o) => (o as HTMLElement).dataset.opt !== target,
  ) as HTMLElement;
  const chose = chip.dataset.opt!;
  fireEvent.click(chip);
  act(() => vi.advanceTimersByTime(REVEAL_MS));
  return chose;
}

function tap(name: RegExp) {
  fireEvent.click(screen.getByRole("button", { name }));
}

describe("Today", () => {
  it("introduces five elements to a brand new learner", () => {
    render(<App />);
    expect(screen.getByText("5")).toBeDefined();
    expect(screen.getByText(/elements due today/)).toBeDefined();
    expect(screen.getByRole("button", { name: /Review 5 elements/ })).toBeDefined();
  });

  it("shows day one before anything is played", () => {
    render(<App />);
    expect(screen.getByText("Day one")).toBeDefined();
  });

  it("offers free practice instead of a locked door when nothing is due", () => {
    render(<App />);
    tap(/Review 5 elements/);
    for (let i = 0; i < 5; i++) answer(true);
    tap(/^Done$/);
    expect(screen.getByText("All caught up")).toBeDefined();
    expect(screen.getByRole("button", { name: /Free practice/ })).toBeDefined();
  });
});

describe("a full review session", () => {
  it("plays five cards and reports a perfect run", () => {
    render(<App />);
    tap(/Review 5 elements/);
    for (let i = 0; i < 5; i++) answer(true);
    expect(screen.getByText("5/5")).toBeDefined();
    expect(screen.getByText("Every one right")).toBeDefined();
  });

  it("promotes every element it asked", () => {
    render(<App />);
    tap(/Review 5 elements/);
    for (let i = 0; i < 5; i++) answer(true);

    const saved = load();
    expect(Object.keys(saved.mastery)).toHaveLength(5);
    expect(Object.values(saved.mastery).every((m) => m.box === 1)).toBe(true);
    expect(saved.stats.totalAnswers).toBe(5);
    expect(saved.stats.dayStreak).toBe(1);
  });

  it("counts a wrong answer and shows it on the results screen", () => {
    render(<App />);
    tap(/Review 5 elements/);
    const missed = answer(false);
    for (let i = 0; i < 4; i++) answer(true);

    expect(screen.getByText("4/5")).toBeDefined();
    expect(screen.getByText("1 to see again")).toBeDefined();
    const misses = screen.getByRole("list");
    expect(within(misses).getByText(missed.symbol)).toBeDefined();
  });

  it("reveals the answer and its mnemonic after a miss", () => {
    parkAllExcept("Na", 0);
    render(<App />);
    tap(/Review/);

    const wrong = [...document.querySelectorAll("[data-opt]")].find(
      (b) => (b as HTMLElement).dataset.opt !== "Na",
    );
    fireEvent.click(wrong!);

    expect(screen.getByText(/is Sodium/)).toBeDefined();
    expect(screen.getByText(/salt has no metal/)).toBeDefined();
  });
});

describe("leaving a session", () => {
  it("keeps answers already given — nothing is lost by quitting", () => {
    render(<App />);
    tap(/Review 5 elements/);
    answer(true);
    answer(true);

    tap(/Leave this session/);

    const saved = load();
    expect(Object.keys(saved.mastery)).toHaveLength(2);
    expect(saved.stats.totalAnswers).toBe(2);
    // Back on Today, with the two answered elements no longer due.
    expect(screen.getByRole("button", { name: /Review 3 elements/ })).toBeDefined();
  });

  it("exits on the iOS edge-swipe instead of leaving the app", () => {
    render(<App />);
    tap(/Review 5 elements/);
    expect(screen.queryByText(/elements due today/)).toBeNull();

    act(() => {
      dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(screen.getByText(/elements due today/)).toBeDefined();
  });
});

describe("the exercise ladder", () => {
  it("asks a new element with Match", () => {
    parkAllExcept("Ag", 0);
    render(<App />);
    tap(/Review/);
    expect(currentMode()).toBe("match");
  });

  it("asks a box-2 element with Reverse", () => {
    parkAllExcept("Ag", 2);
    render(<App />);
    tap(/Review/);
    expect(currentMode()).toBe("reverse");
    expect(screen.getByText("Silver")).toBeDefined();
  });

  it("asks a box-3 element with Spell, and accepts the assembled symbol", () => {
    parkAllExcept("Ag", 3);
    render(<App />);
    tap(/Review/);
    expect(currentMode()).toBe("spell");

    const keys = [...document.querySelectorAll("[data-key]")] as HTMLElement[];
    expect(keys).toHaveLength(12); // a 12-key tray keeps single letters honest
    for (const ch of "Ag") {
      fireEvent.click(keys.find((k) => k.dataset.key === ch && !(k as HTMLButtonElement).disabled)!);
    }
    act(() => vi.advanceTimersByTime(HOLD_CORRECT + 50));

    expect(load().mastery.Ag.box).toBe(4);
  });

  it("spells a single-letter symbol from the same 12-key tray", () => {
    parkAllExcept("H", 3);
    render(<App />);
    tap(/Review/);
    const keys = [...document.querySelectorAll("[data-key]")] as HTMLElement[];
    expect(keys).toHaveLength(12);
    fireEvent.click(keys.find((k) => k.dataset.key === "H")!);
    act(() => vi.advanceTimersByTime(HOLD_CORRECT + 50));
    expect(load().mastery.H.box).toBe(4);
  });
});

describe("sound toggle", () => {
  it("persists across a reload", () => {
    const { unmount } = render(<App />);
    tap(/Sound on/);
    expect(load().settings.sound).toBe(false);
    unmount();

    render(<App />);
    expect(screen.getByRole("button", { name: /Sound off/ })).toBeDefined();
  });
});

describe("daily", () => {
  it("marks itself played and does not disturb the review schedule", () => {
    render(<App />);
    tap(/^Daily/);
    for (let i = 0; i < 6; i++) answer(true);
    tap(/^Done$/);

    const saved = load();
    expect(Object.keys(saved.daily)).toHaveLength(1);
    // Daily must not smuggle elements past the new-per-day cap.
    expect(saved.mastery).toEqual({});
    expect(screen.getByRole("button", { name: /Review 5 elements/ })).toBeDefined();
  });
});

describe("rush", () => {
  it("records a best score and leaves the review schedule alone", () => {
    parkAllExcept("Ag", 5);
    render(<App />);
    tap(/^Rush/);

    const dueBefore = load().mastery.Ag.due;
    for (let i = 0; i < 3; i++) answer(true);
    // End the run by letting the clock expire.
    act(() => vi.advanceTimersByTime(61_000));

    const saved = load();
    expect(saved.rushBest).toBe(3);
    // A lucky fast tap must not schedule an element 60 days out.
    expect(saved.mastery.Ag.due).toBe(dueBefore);
    expect(saved.mastery.Ag.box).toBe(5);
  });
});

describe("timer toggle", () => {
  it("persists and removes the clock from Rush", () => {
    parkAllExcept("Ag", 5); // Rush is locked until enough elements are known
    render(<App />);
    tap(/Timer on/);
    expect(load().settings.timerless).toBe(true);

    tap(/^Rush/);
    expect(document.querySelector("[data-mode]")).not.toBeNull();
    // With no clock there is a progress track instead of a countdown.
    expect(screen.queryByText(/^\d+s$/)).toBeNull();
  });
});

describe("telling the modes apart", () => {
  it("locks Rush for a new learner and says how to unlock it", () => {
    // Day-one Rush used to fall back to all 67 elements, which made it deal
    // the same unknown elements as Review — the reason the two felt identical.
    render(<App />);
    const rush = screen.getByRole("button", { name: /^Rush/ });
    expect((rush as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/Learn 8 more to unlock/)).toBeDefined();
  });

  it("unlocks Rush once enough elements are known", () => {
    parkAllExcept("Ag", 5);
    render(<App />);
    const rush = screen.getByRole("button", { name: /^Rush/ });
    expect((rush as HTMLButtonElement).disabled).toBe(false);
  });

  it("marks the extras as not affecting the schedule", () => {
    render(<App />);
    expect(screen.getByText(/don’t change your schedule/)).toBeDefined();
    expect(screen.getByText(/The only mode that moves your progress/)).toBeDefined();
  });

  it("explains every mode on the help screen", () => {
    render(<App />);
    tap(/How this works/);
    for (const name of ["Review", "Rush", "Drop", "Daily"]) {
      expect(screen.getByRole("heading", { name }), name).toBeDefined();
    }
    // Review is the only one that schedules; the other three say so.
    expect(screen.getAllByText(/Moves your progress/)).toHaveLength(1);
    expect(screen.getAllByText(/Doesn't change your schedule/)).toHaveLength(3);
  });
});

describe("Drop", () => {
  it("is offered on Today with its rules on the tile", () => {
    render(<App />);
    const drop = screen.getByRole("button", { name: /^Drop/ });
    expect((drop as HTMLButtonElement).disabled).toBe(false);
    expect(screen.getByText(/All 67 · 3 lives · gets faster/)).toBeDefined();
  });

  it("opens with three lives and a falling element", () => {
    render(<App />);
    tap(/^Drop/);
    expect(screen.getByLabelText("3 lives left")).toBeDefined();
    expect(screen.getByText("0/67")).toBeDefined();
    expect(document.querySelectorAll("[data-opt]")).toHaveLength(4);
  });

  it("clears an element on a correct tap and moves on", () => {
    render(<App />);
    tap(/^Drop/);
    fireEvent.click(
      [...document.querySelectorAll("[data-opt]")].find(
        (o) => (o as HTMLElement).dataset.opt === fallingSymbol(),
      )!,
    );

    expect(screen.getByText("1/67")).toBeDefined();
    expect(screen.getByLabelText("3 lives left")).toBeDefined();
  });

  it("spends a life on a wrong tap", () => {
    render(<App />);
    tap(/^Drop/);
    dropTapWrong();
    expect(screen.getByLabelText("2 lives left")).toBeDefined();
    expect(screen.getByText("0/67")).toBeDefined();
  });

  it("spends a life when the element lands", () => {
    render(<App />);
    tap(/^Drop/);
    dropLand();
    expect(screen.getByLabelText("2 lives left")).toBeDefined();
  });

  it("ends the run after three landings and never touches the schedule", () => {
    render(<App />);
    tap(/^Drop/);
    for (let i = 0; i < 3; i++) dropLand();

    expect(screen.getByRole("button", { name: /Play again/ })).toBeDefined();
    expect(load().mastery).toEqual({}); // Drop must not smuggle in mastery records
  });
});

describe("end of a scored run", () => {
  /** Loses all three lives in Drop by letting every element land. */
  function loseAtDrop() {
    tap(/^Drop/);
    for (let i = 0; i < 3; i++) dropLand();
  }

  it("says the run ended, not just the score", () => {
    // A bare green number read as "you scored 4!" when the run had in fact
    // just ended in failure.
    render(<App />);
    loseAtDrop();
    expect(screen.getByRole("heading", { name: "Out of lives" })).toBeDefined();
  });

  it("gives the score a denominator", () => {
    render(<App />);
    loseAtDrop();
    expect(screen.getByText(`of ${ALL.length}`)).toBeDefined();
    expect(screen.getByText("elements caught")).toBeDefined();
  });

  it("labels the misses as what ended the run", () => {
    render(<App />);
    loseAtDrop();
    expect(screen.getByText(/These 3 cost you a life/)).toBeDefined();
    expect(screen.getAllByText(/it reached the bottom/)).toHaveLength(3);
  });

  it("offers an immediate retry and a quiet way back", () => {
    render(<App />);
    loseAtDrop();
    expect(screen.getByRole("button", { name: /Play again/ })).toBeDefined();
    expect(screen.getByRole("button", { name: /Back to Today/ })).toBeDefined();
  });

  it("restarts a fresh run from Play again", () => {
    render(<App />);
    loseAtDrop();
    tap(/Play again/);
    expect(screen.getByLabelText("3 lives left")).toBeDefined();
    expect(screen.getByText("0/67")).toBeDefined();
  });

  it("returns to Today from the quiet button", () => {
    render(<App />);
    loseAtDrop();
    tap(/Back to Today/);
    expect(screen.getByText(/elements due today/)).toBeDefined();
  });

  it("shows run stats", () => {
    render(<App />);
    loseAtDrop();
    expect(screen.getByText("best streak")).toBeDefined();
    expect(screen.getByText("speed level")).toBeDefined();
    expect(screen.getByText("your best")).toBeDefined();
  });

  it("does not claim a personal best on a scoreless run", () => {
    render(<App />);
    loseAtDrop();
    expect(screen.queryByText(/New personal best/)).toBeNull();
  });

  it("keeps Review's results ending in a single Done", () => {
    // Review shouldn't invite a replay — once you've reviewed what's due,
    // there is nothing left to review.
    render(<App />);
    tap(/Review 5 elements/);
    for (let i = 0; i < 5; i++) answer(true);
    expect(screen.getByRole("button", { name: /^Done$/ })).toBeDefined();
    expect(screen.queryByRole("button", { name: /Play again/ })).toBeNull();
  });
});

describe("tone of the end screen", () => {
  function loseAtDrop() {
    tap(/^Drop/);
    for (let i = 0; i < 3; i++) dropLand();
  }

  it("never claims a personal best on a first run", () => {
    // Every first run beats a stored best of zero, which made "new personal
    // best" appear on a run of four.
    render(<App />);
    loseAtDrop();
    expect(screen.queryByText(/New personal best/)).toBeNull();
  });

  it("claims one only after there is something to beat", () => {
    localStorage.setItem(
      "elements-quiz/save",
      JSON.stringify({ fallBest: 2, stats: { lastPlayedDay: 0, dayStreak: 1 } }),
    );
    render(<App />);
    tap(/^Drop/);
    // Catch three, then lose the run.
    for (let i = 0; i < 3; i++) {
      fireEvent.click(
        [...document.querySelectorAll("[data-opt]")].find(
          (o) => (o as HTMLElement).dataset.opt === fallingSymbol(),
        )!,
      );
    }
    for (let i = 0; i < 3; i++) dropLand();
    expect(screen.getByText(/New personal best/)).toBeDefined();
  });

  it("shows the score in the neutral colour when the run was lost", () => {
    render(<App />);
    loseAtDrop();
    const heading = screen.getByRole("heading", { name: "Out of lives" });
    // Green is reserved for a win; a loss must not read as a success.
    expect(getComputedStyle(heading).color).not.toBe("rgb(15, 122, 82)");
  });
});

describe("what a miss tells you", () => {
  it("shows the answer next to what was actually tapped", () => {
    // Drop used to store misses as bare elements, throwing away the tapped
    // symbol, so every miss rendered as "it landed" even after a wrong tap.
    render(<App />);
    tap(/^Drop/);

    const wrongTaps: string[] = [];
    for (let i = 0; i < 3; i++) wrongTaps.push(dropTapWrong());

    expect(screen.getAllByText(/you tapped/)).toHaveLength(3);
    for (const tapped of wrongTaps) {
      expect(screen.getAllByText(tapped).length).toBeGreaterThan(0);
    }
    expect(screen.queryByText(/reached the bottom/)).toBeNull();
  });

  it("says no answer was given when the element simply landed", () => {
    render(<App />);
    tap(/^Drop/);
    for (let i = 0; i < 3; i++) dropLand();
    expect(screen.getAllByText(/no answer — it reached the bottom/)).toHaveLength(3);
    expect(screen.queryByText(/you tapped/)).toBeNull();
  });

  it("distinguishes the two within one run", () => {
    render(<App />);
    tap(/^Drop/);
    // One wrong tap, then let two land.
    dropTapWrong();
    for (let i = 0; i < 2; i++) dropLand();

    expect(screen.getAllByText(/you tapped/)).toHaveLength(1);
    expect(screen.getAllByText(/reached the bottom/)).toHaveLength(2);
  });

  it("shows the same contrast for a Review miss", () => {
    parkAllExcept("Na", 0);
    render(<App />);
    tap(/Review/);
    const wrong = [...document.querySelectorAll("[data-opt]")].find(
      (o) => (o as HTMLElement).dataset.opt !== "Na",
    ) as HTMLElement;
    const chosen = wrong.dataset.opt!;
    fireEvent.click(wrong);
    act(() => vi.advanceTimersByTime(2300));

    expect(screen.getByText(/you tapped/)).toBeDefined();
    expect(screen.getAllByText(chosen).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Na").length).toBeGreaterThan(0);
  });
});

describe("the answer reveal after a miss", () => {
  function chipState(symbol: string): string | undefined {
    const chip = document.querySelector(`[data-opt="${symbol}"]`) as HTMLElement | null;
    return chip ? getComputedStyle(chip).borderColor : undefined;
  }

  it("holds on the same element instead of moving straight on", () => {
    render(<App />);
    tap(/^Drop/);
    const target = fallingSymbol();

    fireEvent.click(
      [...document.querySelectorAll("[data-opt]")].find(
        (o) => (o as HTMLElement).dataset.opt !== target,
      )!,
    );

    // Still on the same element mid-reveal.
    act(() => vi.advanceTimersByTime(300));
    expect(fallingSymbol()).toBe(target);

    act(() => vi.advanceTimersByTime(300));
    expect(fallingSymbol()).not.toBe(target);
  });

  it("marks the right chip green and the tapped one red", () => {
    render(<App />);
    tap(/^Drop/);
    const target = fallingSymbol();
    const wrong = [...document.querySelectorAll("[data-opt]")].find(
      (o) => (o as HTMLElement).dataset.opt !== target,
    ) as HTMLElement;
    const chose = wrong.dataset.opt!;
    fireEvent.click(wrong);

    act(() => vi.advanceTimersByTime(200));
    expect(chipState(target)).toBe("rgb(15, 122, 82)"); // C.correct
    expect(chipState(chose)).toBe("rgb(189, 51, 43)"); // C.wrong
  });

  it("stops accepting taps while the answer is shown", () => {
    render(<App />);
    tap(/^Drop/);
    fireEvent.click(
      [...document.querySelectorAll("[data-opt]")].find(
        (o) => (o as HTMLElement).dataset.opt !== fallingSymbol(),
      )!,
    );
    act(() => vi.advanceTimersByTime(150));

    for (const chip of document.querySelectorAll("[data-opt]")) {
      expect((chip as HTMLButtonElement).disabled).toBe(true);
    }
    // A second tap must not cost another life.
    fireEvent.click(document.querySelector("[data-opt]")!);
    act(() => vi.advanceTimersByTime(600));
    expect(screen.getByLabelText("2 lives left")).toBeDefined();
  });

  it("reveals the answer when the element lands too", () => {
    render(<App />);
    tap(/^Drop/);
    const target = fallingSymbol();
    act(() => vi.advanceTimersByTime(FALL_MS));

    expect(fallingSymbol()).toBe(target); // frozen on the missed element
    expect(chipState(target)).toBe("rgb(15, 122, 82)");

    act(() => vi.advanceTimersByTime(REVEAL_MS));
    expect(fallingSymbol()).not.toBe(target);
  });

  it("does not hold on a correct tap", () => {
    render(<App />);
    tap(/^Drop/);
    const target = fallingSymbol();
    fireEvent.click(document.querySelector(`[data-opt="${target}"]`)!);
    // Advances immediately — correct answers stay snappy.
    expect(fallingSymbol()).not.toBe(target);
    expect(screen.getByText("1/67")).toBeDefined();
  });

  it("does not let the element land during its own reveal", () => {
    // The landing clock must be suspended, or the miss would cost two lives.
    render(<App />);
    tap(/^Drop/);
    act(() => vi.advanceTimersByTime(FALL_MS));
    act(() => vi.advanceTimersByTime(REVEAL_MS));
    expect(screen.getByLabelText("2 lives left")).toBeDefined();
  });
});
