import styled, { css, keyframes } from "styled-components";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  FALL_LIVES,
  answerFall,
  startFall,
  type FallState,
} from "../core/fall";
import { elements } from "../core/elements";
import { recordTiming } from "../core/scheduler";
import { bestStreak, type Summary } from "../core/session";
import { cue } from "../audio/cues";
import { prefersReducedMotion } from "../motion/tokens";
import { C, FONT, MONO } from "../ui/theme";
import { tappable } from "../ui/tappable";
import type { Save } from "../store/save";

/** Name height plus a little clearance above the ground line. */
const NAME_CLEARANCE = 64;

interface Props {
  update(fn: (s: Save) => Save): void;
  onExit(): void;
  onFinish(summary: Summary, correct: number): void;
}

/**
 * The element name falls; tap its symbol before it lands.
 *
 * All the rules live in core/fall.ts. This screen owns only the clock, the
 * animation and the taps.
 */
export function Fall({ update, onExit, onFinish }: Props) {
  const [state, setState] = useState<FallState>(() => startFall(Date.now(), elements));
  const [flash, setFlash] = useState<"right" | "wrong" | null>(null);
  const reduced = useRef(prefersReducedMotion()).current;

  /**
   * The drop distance has to be a real pixel value.
   * A percentage in translateY resolves against the element's OWN height, not
   * the field's — which silently made the name drift upward instead of falling.
   */
  const fieldRef = useRef<HTMLDivElement>(null);
  const [dropPx, setDropPx] = useState(0);

  useLayoutEffect(() => {
    const el = fieldRef.current;
    if (!el) return;
    const measure = () => setDropPx(Math.max(0, el.clientHeight - NAME_CLEARANCE));
    measure();
    if (typeof ResizeObserver === "undefined") return; // jsdom
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const shownAt = useRef(Date.now());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const done = useRef(false);

  const finish = useCallback(
    (s: FallState) => {
      if (done.current) return;
      done.current = true;
      if (s.outcome === "won") cue.complete();
      else cue.timeUp();

      onFinish(
        {
          kind: "fall",
          total: s.answers.length,
          correct: s.correct,
          wrong: s.answers.length - s.correct,
          misses: s.misses.map((element) => ({ element })),
          promoted: [],
          fluent: [],
          bestStreak: bestStreak(s.answers),
          durationMs: Date.now() - s.startedAt,
          perfect: s.outcome === "won" && s.misses.length === 0,
        },
        s.correct,
      );
    },
    [onFinish],
  );

  const resolve = useCallback(
    (chosen: string | null) => {
      const s = stateRef.current;
      if (s.outcome !== "playing" || !s.card) return;

      const ms = Date.now() - shownAt.current;
      const right = chosen === s.card.element.symbol;
      const symbol = s.card.element.symbol;

      if (right) cue.correct(s.streak);
      else cue.wrong();
      setFlash(right ? "right" : "wrong");
      setTimeout(() => setFlash(null), 220);

      // Times only — Drop never moves an element's due date.
      update((save) => ({
        ...save,
        mastery: recordTiming(save.mastery, symbol, right, ms),
        stats: { ...save.stats, totalAnswers: save.stats.totalAnswers + 1 },
      }));

      const next = answerFall(s, chosen, ms);
      setState(next);
      if (next.outcome !== "playing") finish(next);
    },
    [update, finish],
  );

  // One timeout per card: when it fires, the element has landed.
  useEffect(() => {
    if (state.outcome !== "playing" || !state.card) return;
    shownAt.current = Date.now();
    timer.current = setTimeout(() => resolve(null), state.card.durationMs);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [state.card, state.outcome, resolve]);

  const card = state.card;
  if (!card) return null;

  return (
    <Wrap $flash={flash}>
      <Bar>
        <Quit type="button" onClick={onExit} aria-label="Leave this session">
          &#215;
        </Quit>
        <Lives aria-label={`${state.lives} lives left`}>
          {Array.from({ length: FALL_LIVES }, (_, i) => (
            <Heart key={i} $spent={i >= state.lives} />
          ))}
        </Lives>
        <Count>{state.correct}/67</Count>
      </Bar>

      <Field ref={fieldRef} style={{ "--drop-distance": `${dropPx}px` } as React.CSSProperties}>
        {reduced ? (
          <Static>
            <Name as="div" data-falling="">
              {card.element.name}
            </Name>
            <Timer key={card.element.symbol + state.answers.length}>
              <TimerFill style={{ animationDuration: `${card.durationMs}ms` }} />
            </Timer>
          </Static>
        ) : (
          <Name
            key={card.element.symbol + state.answers.length}
            data-falling=""
            style={{ animationDuration: `${card.durationMs}ms` }}
          >
            {card.element.name}
          </Name>
        )}
        <Ground />
      </Field>

      <Options $n={card.options.length}>
        {card.options.map((o) => (
          <Chip key={o} type="button" data-opt={o} onClick={() => resolve(o)}>
            {o}
          </Chip>
        ))}
      </Options>
    </Wrap>
  );
}

/* ---------------------------------------------------------------- motion */

const drop = keyframes`
  from { transform: translateY(0); }
  to   { transform: translateY(var(--drop-distance)); }
`;

const deplete = keyframes`
  from { transform: scaleX(1); }
  to   { transform: scaleX(0); }
`;

const Wrap = styled.div<{ $flash: "right" | "wrong" | null }>`
  min-height: 100dvh;
  max-width: 460px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: max(12px, env(safe-area-inset-top)) 16px
    max(18px, env(safe-area-inset-bottom)) 16px;
  background: ${({ $flash }) =>
    $flash === "right" ? C.correctBg : $flash === "wrong" ? C.wrongBg : C.paper};
  transition: background 160ms ease;
  color: ${C.ink};
  font-family: ${FONT};
  overscroll-behavior: none;
`;

const Bar = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const Quit = styled.button`
  ${tappable};
  min-width: 44px;
  border: none;
  background: none;
  font-size: 1.6rem;
  line-height: 1;
  color: ${C.muted};
  padding: 0;
`;

const Lives = styled.div`
  flex: 1;
  display: flex;
  justify-content: center;
  gap: 7px;
`;

const Heart = styled.i<{ $spent: boolean }>`
  width: 13px;
  height: 13px;
  border-radius: 50%;
  background: ${({ $spent }) => ($spent ? "transparent" : C.wrong)};
  border: 2px solid ${({ $spent }) => ($spent ? C.faint : C.wrong)};
  transition: background 200ms ease, border-color 200ms ease;
`;

const Count = styled.div`
  font-family: ${MONO};
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  color: ${C.muted};
  min-width: 48px;
  text-align: right;
`;

const Field = styled.div`
  flex: 1;
  position: relative;
  overflow: hidden;
  /* --drop-distance is set inline, in px, from the measured field height. */
`;

const Name = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  text-align: center;
  font-size: clamp(1.6rem, 8vw, 2.4rem);
  font-weight: 700;
  letter-spacing: -0.03em;
  user-select: none;
  text-wrap: balance;
  animation-name: ${drop};
  animation-timing-function: linear;
  animation-fill-mode: forwards;
  will-change: transform;
`;

const Static = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 20px;
`;

const Timer = styled.div`
  height: 6px;
  margin: 0 auto;
  width: 70%;
  background: ${C.faint};
  border-radius: 3px;
  overflow: hidden;
`;

const TimerFill = styled.div`
  height: 100%;
  background: ${C.wrong};
  transform-origin: left;
  animation-name: ${deplete};
  animation-timing-function: linear;
  animation-fill-mode: forwards;
`;

const Ground = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 3px;
  border-radius: 2px;
  background: repeating-linear-gradient(
    90deg,
    ${C.faint} 0 10px,
    transparent 10px 18px
  );
`;

const Options = styled.div<{ $n: number }>`
  display: grid;
  gap: 8px;
  ${({ $n }) =>
    $n <= 4
      ? css`
          grid-template-columns: repeat(4, 1fr);
        `
      : css`
          grid-template-columns: repeat(3, 1fr);
        `}
`;

const Chip = styled.button`
  ${tappable};
  border: 3px solid ${C.faint};
  border-radius: 13px;
  background: ${C.surface};
  color: ${C.ink};
  font-family: ${FONT};
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  padding: 14px 4px;
  transition: transform 110ms cubic-bezier(0.2, 0.8, 0.2, 1), border-color 140ms ease;
  &:active {
    transform: scale(0.94);
    border-color: ${C.ink};
  }
`;
