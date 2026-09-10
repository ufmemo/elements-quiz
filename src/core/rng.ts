/** Deterministic randomness. Seedable, so Daily can be identical everywhere. */

export type Rand = () => number;

/** Small, fast, good-enough PRNG. Returns [0, 1). */
export function mulberry32(seed: number): Rand {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable 32-bit hash of a string, for seeding from a date key. */
export function seedFromString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/**
 * Fisher-Yates. Returns a new array.
 *
 * Replaces `sort(() => Math.random() - 0.5)`, which is measurably biased and
 * is undefined behaviour besides — an inconsistent comparator.
 */
export function shuffle<T>(input: readonly T[], rand: Rand = Math.random): T[] {
  const a = [...input];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Take up to `n` random items without replacement. */
export function sample<T>(input: readonly T[], n: number, rand: Rand = Math.random): T[] {
  return shuffle(input, rand).slice(0, Math.max(0, n));
}
