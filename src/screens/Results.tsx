import styled from "styled-components";
import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import type { Summary } from "../core/session";
import { prefersReducedMotion } from "../motion/tokens";
import { C, FONT, MONO } from "../ui/theme";
import { Primary, Screen, Spacer } from "../ui/primitives";

interface Props {
  summary: Summary;
  onDone(): void;
}

/**
 * The session's last frame, not a modal over Today — Today sitting behind it
 * would imply the session is still open.
 */
export function Results({ summary, onDone }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!summary.perfect || prefersReducedMotion() || !canvasRef.current) return;
    const fire = confetti.create(canvasRef.current, { resize: true, useWorker: true });
    void fire({ particleCount: 280, spread: 180, origin: { y: 0.6 } });
  }, [summary.perfect]);

  const { correct, total } = summary;
  const isRush = summary.kind === "rush";
  const isFall = summary.kind === "fall";
  const wonFall = isFall && summary.correct === 67;

  return (
    <Screen>
      <Canvas ref={canvasRef} aria-hidden="true" />

      <Spacer />

      <Score>
        <Big>{isRush || isFall ? correct : `${correct}/${total}`}</Big>
        <Sub>
          {total === 0
            ? "No answers this time"
            : isFall
              ? wonFall
                ? `All 67 caught · best streak ${summary.bestStreak}`
                : `caught before the lives ran out · best streak ${summary.bestStreak}`
              : isRush
                ? `correct in 60 seconds · best streak ${summary.bestStreak}`
                : summary.perfect
                  ? "Every one right"
                  : `${summary.wrong} to see again`}
        </Sub>
      </Score>

      {summary.misses.length > 0 && (
        <Misses>
          {summary.misses.map((m, i) => (
            <Miss key={`${m.element.symbol}-${i}`}>
              <b>{m.element.symbol}</b> is {m.element.name}
              {m.chose && <Chose> &mdash; not {m.chose}</Chose>}
              {!m.chose && isFall && <Chose> &mdash; ran out of time</Chose>}
              {m.element.mnemonic && <Mnemonic>{m.element.mnemonic}</Mnemonic>}
            </Miss>
          ))}
        </Misses>
      )}

      {summary.promoted.length > 0 && (
        <Promoted>
          {summary.promoted.length} moved up
          {summary.fluent.length > 0 && ` · ${summary.fluent.length} now fluent`}
        </Promoted>
      )}

      <Spacer />

      <Primary type="button" onClick={onDone}>
        Done
      </Primary>
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

const Score = styled.div`
  text-align: center;
`;

const Big = styled.div`
  font-family: ${FONT};
  font-size: 4.4rem;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.045em;
  color: ${C.correct};
  font-variant-numeric: tabular-nums;
`;

const Sub = styled.div`
  font-size: 0.98rem;
  color: ${C.muted};
  margin-top: 10px;
`;

const Misses = styled.ul`
  list-style: none;
  margin: 26px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
`;

const Miss = styled.li`
  border: 2px solid ${C.faint};
  border-left: 4px solid ${C.wrong};
  border-radius: 10px;
  background: ${C.surface};
  padding: 11px 14px;
  font-size: 0.95rem;
  b {
    font-size: 1.1rem;
  }
`;

const Chose = styled.span`
  color: ${C.muted};
`;

const Mnemonic = styled.em`
  display: block;
  margin-top: 3px;
  font-size: 0.85rem;
  color: ${C.muted};
`;

const Promoted = styled.p`
  text-align: center;
  font-family: ${MONO};
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: ${C.correct};
  margin: 20px 0 0;
`;
