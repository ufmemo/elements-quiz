/**
 * A four-voice synth, not a sample player.
 *
 * Synthesising means zero asset weight, zero network requests, no decode
 * latency on first play, and nothing extra committed into docs/ on deploy.
 * Sampled audio also has an audible attack delay the first time it plays,
 * which breaks the tight answer-to-sound coupling this depends on.
 *
 * Three iPhone facts shape everything here:
 *   1. AudioContext starts suspended and can only resume inside a real
 *      user-gesture handler.
 *   2. The physical silent switch mutes Web Audio and cannot be overridden
 *      in Safari — so sound is never the only channel for information.
 *   3. navigator.vibrate does not exist in iOS Safari. There are no haptics.
 */

let ctx: AudioContext | null = null;
let enabled = true;

type Ctor = typeof AudioContext;

function ctor(): Ctor | null {
  const w = globalThis as unknown as { AudioContext?: Ctor; webkitAudioContext?: Ctor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

/** Call from inside a real tap handler. Anywhere else silently fails on iOS. */
export function unlock(): void {
  const C = ctor();
  if (!C) return;
  ctx ??= new C();
  if (ctx.state === "suspended") void ctx.resume();
}

export function setEnabled(on: boolean): void {
  enabled = on;
}

export function isEnabled(): boolean {
  return enabled;
}

function ready(): AudioContext | null {
  if (!enabled || !ctx || ctx.state !== "running") return null;
  return ctx;
}

export interface ToneOptions {
  hz: number;
  ms: number;
  type?: OscillatorType;
  gain?: number;
  /** Seconds to wait before starting, for arpeggios. */
  delay?: number;
  /** Slide to this frequency over the tone's life. */
  glideTo?: number;
}

export function tone({ hz, ms, type = "sine", gain = 0.18, delay = 0, glideTo }: ToneOptions): void {
  const c = ready();
  if (!c) return;

  const t = c.currentTime + delay;
  const dur = ms / 1000;
  const osc = c.createOscillator();
  const g = c.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(hz, t);
  if (glideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(glideTo, t + dur);

  // Tiny attack ramp avoids the click a hard start produces.
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  osc.connect(g).connect(c.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

/** Short filtered-noise click, for taps. */
export function click(gain = 0.05): void {
  const c = ready();
  if (!c) return;

  const frames = Math.floor(c.sampleRate * 0.03);
  const buf = c.createBuffer(1, frames, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < frames; i++) {
    // Decaying noise burst.
    data[i] = (Math.random() * 2 - 1) * (1 - i / frames) ** 3;
  }

  const src = c.createBufferSource();
  src.buffer = buf;

  const hp = c.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 1800;

  const g = c.createGain();
  g.gain.value = gain;

  src.connect(hp).connect(g).connect(c.destination);
  src.start();
}
