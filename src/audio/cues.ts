import { click, tone } from "./engine";

/**
 * A pentatonic scale, which is doing real work rather than being decorative:
 * it has no dissonant intervals, so an ascending combo sounds musical at any
 * length and in any order. Same reason Peggle and Duolingo streaks feel good.
 */
const PENTATONIC = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];

export const cue = {
  /** Steps up the scale with the streak, then sits on the octave. */
  correct(streak = 0): void {
    const hz = PENTATONIC[Math.min(streak, PENTATONIC.length - 1)];
    tone({ hz, ms: 180, type: "sine", gain: 0.18 });
    tone({ hz: hz * 2, ms: 120, type: "triangle", gain: 0.05 });
  },

  /**
   * Lower AND quieter than `correct`, deliberately. A harsh error sound
   * teaches a kid to fear answering, which is the opposite of what retrieval
   * practice needs. Missing should feel like a soft landing, not a klaxon.
   */
  wrong(): void {
    tone({ hz: 116, ms: 220, type: "triangle", gain: 0.1, glideTo: 96 });
  },

  tap(): void {
    click();
  },

  /** An element moved up a box. */
  promote(): void {
    tone({ hz: 659.25, ms: 380, type: "sine", gain: 0.1, glideTo: 987.77 });
    tone({ hz: 663.5, ms: 380, type: "sine", gain: 0.06, glideTo: 991 });
  },

  /** Queue emptied. */
  complete(): void {
    [523.25, 659.25, 783.99, 1046.5].forEach((hz, i) => {
      tone({ hz, ms: 260, type: "sine", gain: 0.16, delay: i * 0.11 });
    });
  },

  /** Rush, final five seconds only. */
  tick(): void {
    tone({ hz: 1320, ms: 55, type: "square", gain: 0.05 });
  },

  /** Rush clock expired. */
  timeUp(): void {
    tone({ hz: 392, ms: 420, type: "triangle", gain: 0.14, glideTo: 196 });
  },
};
