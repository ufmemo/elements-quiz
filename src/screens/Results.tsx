import styled from "styled-components";
import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { elements } from "../core/elements";
import { tierFor } from "../core/fall";
import type { Summary } from "../core/session";
import { prefersReducedMotion } from "../motion/tokens";
import { C, FONT, MONO } from "../ui/theme";
import { Primary, Screen, Spacer } from "../ui/primitives";
import { tappable } from "../ui/tappable";

interface Props {
  summary: Summary;
  /** Personal best for this mode, before this run. */
  best?: number;
  /** This run beat it. */
  isRecord?: boolean;
  onAgain?(): void;
  onDone(): void;
}

/**
 * The session's last frame, not a modal over Today.
 *
 * The scored modes (Drop, Rush) lead with the OUTCOME, because a bare green
 * number can't tell you whether you won or lost — it read as a score you
 * should be pleased with even when the run had just ended in failure.
 */
export function Results({ summary, best, isRecord, onAgain, onDone }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { kind, correct, total } = summary;

  const isFall = kind === "fall";
  const isRush = kind === "rush";
  const scored = isFall || isRush;
  const wonFall = isFall && correct >= elements.length;
  /**
   * Never celebrate a loss. A first Drop run always "beats" a best of zero, so
   * without this the screen threw confetti over "Out of lives" — precisely the
   * mixed message this redesign exists to remove.
   */
  const lost = isFall && !wonFall;
  const celebrate = !lost && (wonFall || (isRush && isRecord === true) || (!scored && summary.perfect));

  useEffect(() => {
    if (!celebrate || prefersReducedMotion() || !canvasRef.current) return;
    const fire = confetti.create(canvasRef.current, { resize: true, useWorker: true });
    void fire({ particleCount: 280, spread: 180, origin: { y: 0.6 } });
  }, [celebrate]);

  const headline = isFall
    ? wonFall
      ? "You caught them all"
      : "Out of lives"
    : isRush
      ? "Time’s up"
      : total === 0
        ? "Nothing answered"
        : summary.perfect
          ? "Every one right"
          : "Session complete";

  return (
    <Screen>
      <Canvas ref={canvasRef} aria-hidden="true" />

      <Spacer />

      <Head>
        <Outcome $good={wonFall || summary.perfect}>{headline}</Outcome>

        <Score $good={wonFall || summary.perfect}>
          {scored ? correct : `${correct}/${total}`}
          {isFall && <Of>of {elements.length}</Of>}
        </Score>

        <Unit>
          {isFall
            ? "elements caught"
            : isRush
              ? correct === 1
                ? "caught in 60 seconds"
                : "caught in 60 seconds"
              : summary.wrong === 0
                ? "nothing to see again"
                : `${summary.wrong} to see again`}
        </Unit>

        {isRecord && <Record>New personal best</Record>}
      </Head>

      {scored && (
        <Stats>
          <Stat>
            <b>{summary.bestStreak}</b>
            <span>best streak</span>
          </Stat>
          {isFall && (
            <Stat>
              <b>{tierFor(correct) + 1}</b>
              <span>speed level</span>
            </Stat>
          )}
          <Stat>
            <b>{Math.max(best ?? 0, correct)}</b>
            <span>your best</span>
          </Stat>
        </Stats>
      )}

      {summary.misses.length > 0 && (
        <>
          <MissLabel>
            {isFall
              ? summary.misses.length === 1
                ? "This one cost you a life"
                : `These ${summary.misses.length} cost you a life`
              : "Worth another look"}
          </MissLabel>
          <Misses>
            {summary.misses.map((m, i) => (
              <Miss key={`${m.element.symbol}-${i}`}>
                <b>{m.element.symbol}</b> is {m.element.name}
                {m.chose && <Chose> &mdash; you tapped {m.chose}</Chose>}
                {!m.chose && isFall && <Chose> &mdash; it landed</Chose>}
                {m.element.mnemonic && <Mnemonic>{m.element.mnemonic}</Mnemonic>}
              </Miss>
            ))}
          </Misses>
        </>
      )}

      {summary.promoted.length > 0 && (
        <Promoted>
          {summary.promoted.length} moved up
          {summary.fluent.length > 0 && ` · ${summary.fluent.length} now fluent`}
        </Promoted>
      )}

      <Spacer />

      {onAgain ? (
        <>
          <Primary type="button" onClick={onAgain}>
            Play again
          </Primary>
          <Quiet type="button" onClick={onDone}>
            Back to Today
          </Quiet>
        </>
      ) : (
        <Primary type="button" onClick={onDone}>
          Done
        </Primary>
      )}
    </Screen>
  );
}

const Canvas = styled.canvas`
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 10;
`;

const Head = styled.div`
  text-align: center;
`;

const Outcome = styled.h1<{ $good: boolean }>`
  font-family: ${FONT};
  font-size: 1.6rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: ${({ $good }) => ($good ? C.correct : C.ink)};
  margin: 0 0 10px;
  text-wrap: balance;
`;

const Score = styled.div<{ $good: boolean }>`
  font-family: ${FONT};
  font-size: 4rem;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.045em;
  font-variant-numeric: tabular-nums;
  color: ${({ $good }) => ($good ? C.correct : C.ink)};
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 9px;
`;

const Of = styled.span`
  font-size: 1.1rem;
  font-weight: 600;
  color: ${C.muted};
  letter-spacing: 0;
`;

const Unit = styled.div`
  font-size: 0.95rem;
  color: ${C.muted};
  margin-top: 8px;
`;

const Record = styled.p`
  display: inline-block;
  font-family: ${MONO};
  font-size: 0.62rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: ${C.correct};
  background: ${C.correctBg};
  border-radius: 999px;
  padding: 5px 12px;
  margin: 14px 0 0;
`;

const Stats = styled.div`
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 22px;
`;

const Stat = styled.div`
  flex: 1;
  max-width: 120px;
  border: 2px solid ${C.faint};
  border-radius: 12px;
  background: ${C.surface};
  padding: 10px 6px;
  text-align: center;
  b {
    display: block;
    font-family: ${FONT};
    font-size: 1.5rem;
    font-weight: 700;
    line-height: 1.1;
    font-variant-numeric: tabular-nums;
  }
  span {
    display: block;
    font-family: ${MONO};
    font-size: 0.56rem;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: ${C.muted};
    margin-top: 3px;
  }
`;

const MissLabel = styled.p`
  font-family: ${MONO};
  font-size: 0.62rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: ${C.muted};
  margin: 26px 0 9px;
`;

const Misses = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 9px;
  overflow-y: auto;
`;

const Miss = styled.li`
  border: 2px solid ${C.faint};
  border-left: 4px solid ${C.wrong};
  border-radius: 10px;
  background: ${C.surface};
  padding: 10px 13px;
  font-size: 0.93rem;
  b {
    font-size: 1.05rem;
  }
`;

const Chose = styled.span`
  color: ${C.muted};
`;

const Mnemonic = styled.em`
  display: block;
  margin-top: 3px;
  font-size: 0.83rem;
  color: ${C.muted};
`;

const Promoted = styled.p`
  text-align: center;
  font-family: ${MONO};
  font-size: 0.68rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: ${C.correct};
  margin: 20px 0 0;
`;

const Quiet = styled.button`
  ${tappable};
  border: none;
  background: none;
  width: 100%;
  padding: 14px;
  margin-top: 4px;
  font-family: ${FONT};
  font-size: 0.92rem;
  font-weight: 600;
  color: ${C.muted};
`;
