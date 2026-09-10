/**
 * Motion tokens.
 *
 * prefers-reduced-motion is honoured at the TOKEN level so it's impossible to
 * forget: read it once, swap the whole set, and every component inherits the
 * change. Per-component media queries are how half your animations end up
 * ignoring the setting.
 */
export const DUR = {
  quick: 120,
  move: 240,
  reveal: 420,
} as const;

export const EASE = {
  out: "cubic-bezier(.2, .8, .2, 1)",
  spring: "cubic-bezier(.34, 1.56, .64, 1)",
} as const;

export function prefersReducedMotion(): boolean {
  return globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

/** Durations collapse to near-zero under reduced motion; nothing else changes. */
export function durations(reduced: boolean) {
  return reduced ? { quick: 1, move: 1, reveal: 1 } : DUR;
}
