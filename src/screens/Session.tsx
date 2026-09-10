import styled, { css, keyframes } from "styled-components";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Element } from "../core/elements";
import {
  check,
  currentCard,
  isComplete,
  recordAnswer,
  startSession,
  summarize,
  type Card,
  type SessionKind,
  type SessionState,
  type Summary,
} from "../core/session";
import { applyAnswer, recordTiming } from "../core/scheduler";
import { modeFor } from "../exercises/registry";
import { cue } from "../audio/cues";
import { C, FONT, MONO } from "../ui/theme";
import { tappable } from "../ui/tappable";
import type { Save } from "../store/save";

/** Only Review moves elements through the boxes. */
const SCHEDULES: Record<SessionKind, boolean> = {
  review: true,
  free: false,
  rush: false,
  daily: false,
};

const HOLD_CORRECT = 620;
const HOLD_WRONG = 2200;

interface Props {
  kind: SessionKind;
  cards: Card[];
  day: number;
  save: Save;
  update(fn: (s: Save) => Save): void;
  onExit(): void;
  onFinish(summary: Summary): void;
}

export function Session({ kind, cards, day, save, update, onExit, onFinish }: Props) {
  const [state, setState] = useState<SessionState>(() =>
    startSession(kind, cards, Date.now()),
  );
  const [chosen, setChosen] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<"right" | "wrong" | null>(null);
  const [streak, setStreak] = useState(0);
  const [remaining, setRemaining] = useState(state.durationMs ?? 0);

  const promoted = useRef<Element[]>([]);
  const fluent = useRef<Element[]>([]);
  const shownAt = useRef(Date.now());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finished = useRef(false);
  // verdict is set asynchronously, so two taps in one batch would both pass.
  const answering = useRef(false);
  const pending = useRef<SessionState | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const card = currentCard(state);
  const timed = kind === "rush" && !save.settings.timerless;

  /**
   * iOS Safari's left-edge swipe fires history.back(). Without an entry of our
   * own that navigates the learner out of the app entirely, mid-session.
   */
  useEffect(() => {
    history.pushState({ session: true }, "");
    const onPop = () => onExit();
    addEventListener("popstate", onPop);
    return () => {
      removeEventListener("popstate", onPop);
      if (history.state?.session) history.back();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const finish = useCallback(
    (s: SessionState) => {
      if (finished.current) return;
      finished.current = true;
      cue.complete();
      onFinish(summarize(s, Date.now(), promoted.current, fluent.current));
    },
    [onFinish],
  );

  // Rush clock.
  useEffect(() => {
    if (!timed) return;
    const id = setInterval(() => {
      const left = (state.durationMs ?? 0) - (Date.now() - state.startedAt);
      setRemaining(Math.max(0, left));
      if (left <= 5000 && left > 0 && Math.ceil(left / 1000) !== Math.ceil((left + 250) / 1000)) {
        cue.tick();
      }
      if (left <= 0) {
        clearInterval(id);
        cue.timeUp();
        finish(stateRef.current);
      }
    }, 250);
    return () => clearInterval(id);
  }, [timed, state.durationMs, state.startedAt, finish]);

  // New card, restart the latency clock.
  useEffect(() => {
    shownAt.current = Date.now();
  }, [state.index]);

  /** Commits the queued next card. Called by the hold timer or by a tap. */
  const commit = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const next = pending.current;
    pending.current = null;
    answering.current = false;
    setChosen(null);
    setVerdict(null);
    if (!next) return;
    setState(next);
    if (isComplete(next)) finish(next);
  }, [finish]);

  const onChoose = useCallback(
    (symbol: string) => {
      if (!card || verdict !== null || answering.current) return;
      answering.current = true;

      const ms = Date.now() - shownAt.current;
      const correct = check(card, symbol);
      const sym = card.element.symbol;

      setChosen(symbol);
      setVerdict(correct ? "right" : "wrong");

      const nextStreak = correct ? streak + 1 : 0;
      setStreak(nextStreak);
      if (correct) cue.correct(nextStreak - 1);
      else cue.wrong();

      // Committed immediately — quitting now costs nothing.
      update((s) => {
        if (!SCHEDULES[kind]) {
          return {
            ...s,
            mastery: recordTiming(s.mastery, sym, correct, ms),
            stats: { ...s.stats, totalAnswers: s.stats.totalAnswers + 1 },
          };
        }
        const before = s.mastery[sym]?.box ?? -1;
        const mastery = applyAnswer(s.mastery, sym, correct, ms, day);
        const after = mastery[sym].box;
        if (after > before) {
          promoted.current = [...promoted.current, card.element];
          if (after === 5) fluent.current = [...fluent.current, card.element];
          if (correct) cue.promote();
        }
        return {
          ...s,
          mastery,
          stats: { ...s.stats, totalAnswers: s.stats.totalAnswers + 1 },
        };
      });

      const advanced = recordAnswer(state, {
        symbol: sym,
        correct,
        ms,
        chose: correct ? undefined : symbol,
      });

      pending.current = advanced;
      timer.current = setTimeout(commit, correct ? HOLD_CORRECT : HOLD_WRONG);
    },
    [card, verdict, streak, update, kind, day, state, commit],
  );

  // Tapping during the wrong-answer hold skips the rest of the read time.
  const skipHold = () => {
    if (verdict === "wrong") commit();
  };

  const total = state.queue.length;
  const progress = total === 0 ? 1 : state.index / total;
  const Mode = useMemo(() => (card ? modeFor(card.mode).Component : null), [card]);

  if (!card || !Mode) return null;

  return (
    <Wrap $verdict={verdict} onClick={skipHold}>
      <Bar>
        <Quit type="button" onClick={onExit} aria-label="Leave this session">
          &#215;
        </Quit>
        {timed ? (
          <Clock $low={remaining <= 5000}>{Math.ceil(remaining / 1000)}s</Clock>
        ) : (
          <Track>
            <Fill style={{ transform: `scaleX(${progress})` }} />
          </Track>
        )}
        <Count>
          {kind === "rush" ? `${state.answers.filter((a) => a.correct).length}` : `${state.index + 1}/${total}`}
        </Count>
      </Bar>

      {streak >= 2 && <Combo $n={streak}>{streak} in a row</Combo>}

      <Deck key={state.index} $verdict={verdict}>
        <Mode card={card} onChoose={onChoose} locked={verdict !== null} chosen={chosen} />
      </Deck>

      <Reveal $show={verdict === "wrong"}>
        {verdict === "wrong" && (
          <>
            <strong>{card.element.symbol}</strong> is {card.element.name}
            {card.element.mnemonic && <em> &mdash; {card.element.mnemonic}</em>}
          </>
        )}
      </Reveal>
    </Wrap>
  );
}

/* ---------------------------------------------------------------- motion */

const deal = keyframes`
  from { opacity: 0; transform: translateX(24px); }
  to   { opacity: 1; transform: translateX(0); }
`;

const shake = keyframes`
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-6px); }
  40% { transform: translateX(6px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
`;

const Wrap = styled.div<{ $verdict: "right" | "wrong" | null }>`
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: max(12px, env(safe-area-inset-top)) 16px
    max(18px, env(safe-area-inset-bottom)) 16px;
  background: ${({ $verdict }) =>
    $verdict === "right" ? C.correctBg : $verdict === "wrong" ? C.wrongBg : C.paper};
  transition: background 180ms ease;
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

const Track = styled.div`
  flex: 1;
  height: 4px;
  background: ${C.faint};
  border-radius: 2px;
  overflow: hidden;
`;

/* scaleX, never width — width animates on the main thread and drops frames */
const Fill = styled.div`
  height: 100%;
  background: ${C.correct};
  transform-origin: left;
  transition: transform 240ms cubic-bezier(0.2, 0.8, 0.2, 1);
`;

const Clock = styled.div<{ $low: boolean }>`
  flex: 1;
  text-align: center;
  font-family: ${MONO};
  font-size: 1.1rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ $low }) => ($low ? C.wrong : C.ink)};
`;

const Count = styled.div`
  font-family: ${MONO};
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  color: ${C.muted};
  min-width: 44px;
  text-align: right;
`;

const Combo = styled.div<{ $n: number }>`
  align-self: center;
  font-family: ${MONO};
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: ${C.correct};
  animation: ${deal} 240ms cubic-bezier(0.2, 0.8, 0.2, 1);
`;

const Deck = styled.div<{ $verdict: "right" | "wrong" | null }>`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 10px;
  animation: ${deal} 240ms cubic-bezier(0.2, 0.8, 0.2, 1);
  ${({ $verdict }) =>
    $verdict === "wrong" &&
    css`
      animation: ${shake} 200ms ease;
    `}

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Reveal = styled.p<{ $show: boolean }>`
  min-height: 2.6em;
  margin: 0;
  text-align: center;
  font-size: 0.95rem;
  line-height: 1.45;
  color: ${C.wrong};
  opacity: ${({ $show }) => ($show ? 1 : 0)};
  transition: opacity 180ms ease;
  em {
    color: ${C.muted};
    font-style: italic;
  }
`;
