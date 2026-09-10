import type { Element } from "./elements";
import { shuffle, type Rand } from "./rng";

/**
 * Wrong answers, in descending order of confusability.
 *
 * Random distractors are too easy — you can rule out Neon for a transition
 * metal without knowing anything. Drawing from the same category first means
 * the wrong answers are the ones actually worth telling apart: Silver/Gold,
 * Antimony/Tin, Argon/Arsenic.
 */
export function pickDistractors(
  target: Element,
  pool: readonly Element[],
  n: number,
  rand: Rand = Math.random,
): Element[] {
  const others = pool.filter((e) => e.symbol !== target.symbol);

  const tiers = [
    others.filter((e) => e.category === target.category),
    others.filter((e) => e.category !== target.category && e.period === target.period),
    others,
  ];

  const out: Element[] = [];
  const taken = new Set<string>();
  for (const tier of tiers) {
    for (const e of shuffle(tier, rand)) {
      if (out.length >= n) return out;
      if (taken.has(e.symbol)) continue;
      taken.add(e.symbol);
      out.push(e);
    }
  }
  return out;
}

const ALPHABET = "abcdefghiklmnoprstuvwyz";

/**
 * The letter tray for Spell: the correct letters plus decoys, shuffled.
 *
 * A tray of ~12 letters is what keeps Spell honest for the 14 single-letter
 * symbols (H K Y V I B C N O F P S W U). Picking one letter from a row of two
 * would be free; picking it from twelve is real recall.
 */
export function letterTray(symbol: string, size = 12, rand: Rand = Math.random): string[] {
  const needed = symbol.split("");
  const tray = [...needed];

  const decoyPool = shuffle(ALPHABET.split(""), rand);
  for (const ch of decoyPool) {
    if (tray.length >= size) break;
    // Offer both cases so capitalisation isn't a free hint.
    const cased = rand() < 0.5 ? ch.toUpperCase() : ch;
    if (tray.includes(cased)) continue;
    tray.push(cased);
  }
  return shuffle(tray, rand);
}
