/**
 * Real-browser smoke tests.
 *
 * These exist because jsdom cannot cover a whole class of bug in this app.
 * The StrictMode/history regression below — a session exiting the instant it
 * opened — reproduced in Chromium every time and never once in jsdom, whose
 * history traversal is invalidated by an intervening pushState. Anything
 * touching history, real timers, or layout gets verified here, not in vitest.
 *
 *   npm run test:e2e
 */
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const PORT = 5177;
const APP_URL = `http://localhost:${PORT}/elements-quiz/`;

// Parsed from source so the app needs no test hook exposing answers in the DOM.
const SRC = readFileSync(new URL("../src/core/elements.ts", import.meta.url), "utf8");
const NAME_TO_SYMBOL = new Map(
  [...SRC.matchAll(/symbol: "([A-Za-z]+)", name: "([A-Za-z]+)"/g)].map((m) => [m[2], m[1]]),
);

let passed = 0;
const failures = [];

async function check(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.log(`  × ${name}\n      ${err.message}`);
    failures.push(name);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

/** The symbol currently being asked. */
async function askedSymbol(page) {
  const el = page.locator("[data-mode]");
  const mode = await el.getAttribute("data-mode");
  const text = (await el.textContent()).trim();
  if (mode === "match") return text.replace(/^\d+/, "").trim();
  const symbol = NAME_TO_SYMBOL.get(text);
  assert(symbol, `no element named "${text}"`);
  return symbol;
}

async function answer(page, correctly = true) {
  const mode = await page.locator("[data-mode]").getAttribute("data-mode");
  const symbol = await askedSymbol(page);

  if (mode === "spell") {
    for (const ch of symbol) {
      await page.locator(`[data-key="${ch}"]:not([disabled])`).first().click();
    }
  } else if (correctly) {
    await page.locator(`[data-opt="${symbol}"]`).click();
  } else {
    await page.locator(`[data-opt]:not([data-opt="${symbol}"])`).first().click();
  }
  await page.waitForTimeout(correctly ? 750 : 2350);
  return symbol;
}

async function fresh(page) {
  await page.goto(APP_URL, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
}

const server = spawn("npx", ["vite", "--port", String(PORT)], { stdio: "ignore" });
process.on("exit", () => server.kill());

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
// Fail fast: against the bug this suite hung for minutes waiting on locators
// for cards that never appeared.
page.setDefaultTimeout(5000);

const consoleErrors = [];
page.on("pageerror", (e) => consoleErrors.push(String(e)));
page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));

for (let i = 0; i < 60; i++) {
  try {
    await page.goto(APP_URL, { timeout: 1000 });
    break;
  } catch {
    await new Promise((r) => setTimeout(r, 300));
  }
}

console.log("\nelements-quiz — browser smoke tests\n");

await check("Today introduces five elements to a new learner", async () => {
  await fresh(page);
  await page.getByRole("button", { name: /Review 5 elements/ }).waitFor({ timeout: 5000 });
  assert(await page.getByText("Day one").count(), "expected the day-one label");
});

await check("opening a session shows a card and stays there", async () => {
  // Regression: a pushState/back() pair in a mount effect let StrictMode's
  // remount deliver the queued popstate to the new listener, bouncing the
  // learner back to Today the instant they tapped Review. No console error.
  await fresh(page);
  await page.getByRole("button", { name: /Review 5 elements/ }).click();
  await page.waitForTimeout(600);
  assert(await page.locator("[data-mode]").count(), "no card — the session exited immediately");
  assert(!(await page.getByText(/elements due today/).count()), "bounced back to Today");
});

await check("Rush is locked for a new learner and explains why", async () => {
  await fresh(page);
  const rush = page.getByRole("button", { name: /^Rush/ });
  assert(await rush.isDisabled(), "Rush should be locked on day one");
  assert(await page.getByText(/Learn 8 more to unlock/).count(), "no unlock hint");
});

await check("Rush opens and runs a clock once unlocked", async () => {
  await fresh(page);
  await page.evaluate(() => {
    const mastery = {};
    for (const s of ["H", "He", "Li", "Be", "B", "C", "N", "O", "F", "Ne"]) {
      mastery[s] = { box: 4, due: 9999999, introducedOn: 0, seen: 6, correct: 6 };
    }
    localStorage.setItem(
      "elements-quiz/save",
      JSON.stringify({ mastery, stats: { lastPlayedDay: 0, dayStreak: 1, totalAnswers: 9 } }),
    );
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: /^Rush/ }).click();
  await page.waitForTimeout(600);
  assert(await page.locator("[data-mode]").count(), "Rush did not open");
  assert(await page.getByText(/^\d+s$/).count(), "no countdown shown");
});

await check("the help screen explains all three modes", async () => {
  await fresh(page);
  await page.getByRole("button", { name: /How this works/ }).click();
  await page.waitForTimeout(400);
  for (const t of ["Review", "Rush", "Daily"]) {
    assert(await page.getByRole("heading", { name: t }).count(), `no section for ${t}`);
  }
  assert(await page.getByText(/Moves your progress/).count(), "Review not marked as scheduling");
  await page.getByRole("button", { name: /Today/ }).click();
  await page.waitForTimeout(300);
  assert(await page.getByText(/elements due today/).count(), "help did not return to Today");
});

await check("Daily opens", async () => {
  await fresh(page);
  await page.getByRole("button", { name: /^Daily/ }).click();
  await page.waitForTimeout(600);
  assert(await page.locator("[data-mode]").count(), "Daily did not open");
});

await check("a full review reaches a perfect result", async () => {
  await fresh(page);
  await page.getByRole("button", { name: /Review 5 elements/ }).click();
  await page.waitForTimeout(400);
  for (let i = 0; i < 5; i++) await answer(page, true);
  assert(await page.getByText("5/5").count(), "no 5/5 on the results screen");
  assert(await page.getByText("Every one right").count(), "not reported as perfect");
});

await check("finishing leaves nothing due and offers free practice", async () => {
  await page.getByRole("button", { name: /^Done$/ }).click();
  await page.waitForTimeout(400);
  assert(await page.getByText("All caught up").count(), "expected the caught-up headline");
  assert(await page.getByRole("button", { name: /Free practice/ }).count(), "no free practice");
});

await check("a wrong answer reveals the element and its mnemonic", async () => {
  await fresh(page);
  await page.evaluate(() => {
    localStorage.setItem(
      "elements-quiz/save",
      JSON.stringify({
        mastery: { Na: { box: 0, due: 0, introducedOn: 0, seen: 1 } },
        stats: { lastPlayedDay: 0, dayStreak: 1, totalAnswers: 1 },
      }),
    );
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Review/ }).click();
  await page.waitForTimeout(400);

  // Walk to the Sodium card, answering the day's new elements correctly.
  for (let i = 0; i < 8; i++) {
    if ((await askedSymbol(page)) === "Na") break;
    await answer(page, true);
  }
  assert((await askedSymbol(page)) === "Na", "never reached the Sodium card");
  await page.locator(`[data-opt]:not([data-opt="Na"])`).first().click();
  await page.waitForTimeout(300);
  assert(await page.getByText(/is Sodium/).count(), "answer not revealed");
  assert(await page.getByText(/salt has no metal/).count(), "mnemonic not shown");
});

await check("quitting mid-session keeps the answers already given", async () => {
  await fresh(page);
  await page.getByRole("button", { name: /Review 5 elements/ }).click();
  await page.waitForTimeout(400);
  await answer(page, true);
  await answer(page, true);
  await page.getByRole("button", { name: /Leave this session/ }).click();
  await page.waitForTimeout(300);

  const answered = await page.evaluate(
    () => Object.keys(JSON.parse(localStorage.getItem("elements-quiz/save")).mastery).length,
  );
  assert(answered === 2, `expected 2 committed answers, got ${answered}`);
  assert(await page.getByRole("button", { name: /Review 3 elements/ }).count(), "due count wrong");
});

await check("the back gesture exits the session instead of the app", async () => {
  await fresh(page);
  await page.getByRole("button", { name: /Review 5 elements/ }).click();
  await page.waitForTimeout(500);
  await page.goBack();
  await page.waitForTimeout(500);
  assert(await page.getByText(/elements due today/).count(), "did not return to Today");
  assert(page.url().startsWith(APP_URL), "navigated away from the app");
});

await check("one back-press escapes however many sessions were opened", async () => {
  await fresh(page);
  for (const name of [/Review 5 elements/, /^Daily/, /Review 5 elements/]) {
    await page.getByRole("button", { name }).click();
    await page.waitForTimeout(350);
    await page.getByRole("button", { name: /Leave this session/ }).click();
    await page.waitForTimeout(250);
  }
  await page.getByRole("button", { name: /Review 5 elements/ }).click();
  await page.waitForTimeout(350);
  await page.goBack();
  await page.waitForTimeout(400);
  assert(await page.getByText(/elements due today/).count(), "history entries stacked up");
});

await check("Drop opens, falls, and responds to a correct tap", async () => {
  await fresh(page);
  await page.getByRole("button", { name: /^Drop/ }).click();
  await page.waitForTimeout(400);

  assert(await page.locator("[data-falling]").count(), "nothing is falling");
  assert((await page.locator("[data-opt]").count()) === 4, "expected 4 choices at tier 0");

  // The name really moves down the screen.
  const box1 = await page.locator("[data-falling]").boundingBox();
  await page.waitForTimeout(900);
  const box2 = await page.locator("[data-falling]").boundingBox();
  assert(box2.y > box1.y + 20, `not falling: ${box1.y} -> ${box2.y}`);

  const name = (await page.locator("[data-falling]").textContent()).trim();
  const symbol = NAME_TO_SYMBOL.get(name);
  assert(symbol, `unknown element "${name}"`);
  await page.locator(`[data-opt="${symbol}"]`).click();
  await page.waitForTimeout(300);
  assert(await page.getByText("1/67").count(), "correct tap did not score");
});

await check("Drop ends after three landings and keeps the schedule clean", async () => {
  await fresh(page);
  await page.getByRole("button", { name: /^Drop/ }).click();
  await page.waitForTimeout(300);
  // Three full falls at tier 0 (6s each), untouched.
  await page.waitForTimeout(6200 * 3);

  assert(await page.getByRole("heading", { name: "Out of lives" }).count(), "run end not announced");
  assert(await page.getByText("of 67").count(), "score has no denominator");
  assert(await page.getByText(/These 3 cost you a life/).count(), "misses not labelled");
  assert(
    (await page.getByText(/no answer — it reached the bottom/).count()) === 3,
    "landings not described",
  );
  assert(await page.getByRole("button", { name: /Play again/ }).count(), "no retry");
  // A loss must never be celebrated, and a first run has no best to beat.
  assert(!(await page.getByText(/New personal best/).count()), "claimed a best on run one");
  const confetti = await page.evaluate(() => {
    const c = document.querySelector("canvas");
    if (!c) return "none";
    const ctx = c.getContext("2d");
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    for (let i = 3; i < d.length; i += 4) if (d[i] !== 0) return "drawn";
    return "empty";
  });
  assert(confetti !== "drawn", "confetti fired over a losing run");
  const mastery = await page.evaluate(
    () => Object.keys(JSON.parse(localStorage.getItem("elements-quiz/save")).mastery).length,
  );
  assert(mastery === 0, `Drop wrote ${mastery} mastery records; it must write none`);
});

await check("a wrong tap shows the answer next to what was tapped", async () => {
  await fresh(page);
  await page.getByRole("button", { name: /^Drop/ }).click();
  await page.waitForTimeout(400);

  const tapped = [];
  for (let i = 0; i < 3; i++) {
    const name = (await page.locator("[data-falling]").textContent()).trim();
    const target = NAME_TO_SYMBOL.get(name);
    const chip = page.locator(`[data-opt]:not([data-opt="${target}"])`).first();
    tapped.push(await chip.getAttribute("data-opt"));
    await chip.click();
    await page.waitForTimeout(250);
  }

  assert((await page.getByText(/you tapped/).count()) === 3, "tapped symbol not shown");
  assert(!(await page.getByText(/reached the bottom/).count()), "wrong taps described as landings");
  for (const t of tapped) {
    assert(await page.getByText(t, { exact: true }).count(), `"${t}" missing from the list`);
  }
  await page.getByRole("button", { name: /Back to Today/ }).click();
  await page.waitForTimeout(300);
});

await check("Play again starts a fresh Drop run", async () => {
  await page.getByRole("button", { name: /^Drop/ }).click();
  await page.waitForTimeout(300);
  await page.waitForTimeout(6200 * 3);
  await page.getByRole("button", { name: /Play again/ }).click();
  await page.waitForTimeout(500);
  assert(await page.getByLabel("3 lives left").count(), "lives were not reset");
  assert(await page.getByText("0/67").count(), "score was not reset");
  await page.getByRole("button", { name: /Leave this session/ }).click();
  await page.waitForTimeout(300);
});

await check("no console errors anywhere in the run", () => {
  assert(consoleErrors.length === 0, `console errors: ${consoleErrors.join(" | ")}`);
});

await browser.close();
server.kill();

console.log(`\n${passed} passed, ${failures.length} failed\n`);
process.exit(failures.length ? 1 : 0);
