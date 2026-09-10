import styled from "styled-components";
import { useEffect, useState } from "react";
import { C, FONT, MONO } from "../ui/theme";
import { tappable } from "../ui/tappable";
import { cue } from "../audio/cues";
import type { ExerciseProps } from "./types";

/**
 * Name shown, build the symbol from a letter tray. True recall — nothing to
 * recognise, you have to produce it — at two taps maximum.
 *
 * The obvious top rung would be typing the full name, but typing
 * "Neodymium" on an iPhone keyboard tests spelling, not chemistry.
 */
export function Spell({ card, onChoose, locked, chosen }: ExerciseProps) {
  const target = card.element.symbol;
  const [picked, setPicked] = useState<string[]>([]);
  const [used, setUsed] = useState<number[]>([]);

  // New card, empty slots and a full tray.
  useEffect(() => {
    setPicked([]);
    setUsed([]);
  }, [card]);

  // Submit as soon as the slots are full.
  useEffect(() => {
    if (picked.length === target.length && !locked) onChoose(picked.join(""));
  }, [picked, target.length, locked, onChoose]);

  const tap = (ch: string, i: number) => {
    if (locked || picked.length >= target.length) return;
    cue.tap();
    setPicked((p) => [...p, ch]);
    setUsed((u) => [...u, i]);
  };

  const undo = () => {
    if (locked) return;
    setPicked((p) => p.slice(0, -1));
    setUsed((u) => u.slice(0, -1));
  };

  const state = !locked ? "idle" : chosen === target ? "right" : "wrong";

  return (
    <>
      <Prompt data-mode="spell">{card.element.name}</Prompt>
      <Hint>Spell the symbol</Hint>

      <Slots onClick={undo} role="group" aria-label="Your answer — tap to undo">
        {Array.from({ length: target.length }, (_, i) => (
          <Slot key={i} $state={picked[i] ? state : "empty"}>
            {locked && state === "wrong" ? target[i] : (picked[i] ?? "")}
          </Slot>
        ))}
      </Slots>

      <Tray>
        {card.tray.map((ch, i) => (
          <Key
            key={`${ch}-${i}`}
            data-key={ch}
            type="button"
            disabled={locked || used.includes(i)}
            $spent={used.includes(i)}
            onClick={() => tap(ch, i)}
          >
            {ch}
          </Key>
        ))}
      </Tray>
    </>
  );
}

const Prompt = styled.div`
  text-align: center;
  font-family: ${FONT};
  font-size: 2.2rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  user-select: none;
  text-wrap: balance;
`;

const Hint = styled.p`
  font-family: ${MONO};
  font-size: 0.68rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: ${C.muted};
  text-align: center;
  margin: 6px 0 14px;
`;

const Slots = styled.div`
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-bottom: 22px;
`;

const Slot = styled.div<{ $state: "empty" | "idle" | "right" | "wrong" }>`
  width: 62px;
  height: 72px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  font-family: ${FONT};
  font-size: 2.2rem;
  font-weight: 700;
  user-select: none;
  transition: border-color 140ms ease, background 140ms ease;
  border: 3px
    ${({ $state }) => ($state === "empty" ? "dashed" : "solid")}
    ${({ $state }) =>
      $state === "right" ? C.correct : $state === "wrong" ? C.wrong : C.faint};
  background: ${({ $state }) =>
    $state === "right" ? C.correctBg : $state === "wrong" ? C.wrongBg : C.surface};
  color: ${({ $state }) =>
    $state === "right" ? C.correct : $state === "wrong" ? C.wrong : C.ink};
`;

const Tray = styled.div`
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
`;

const Key = styled.button<{ $spent: boolean }>`
  ${tappable};
  aspect-ratio: 1;
  border-radius: 11px;
  border: 2px solid ${C.faint};
  background: ${C.surface};
  color: ${C.ink};
  font-family: ${FONT};
  font-size: 1.35rem;
  font-weight: 600;
  display: grid;
  place-items: center;
  transition: opacity 140ms ease, transform 120ms cubic-bezier(0.2, 0.8, 0.2, 1);
  opacity: ${({ $spent }) => ($spent ? 0.22 : 1)};
  &:active:not(:disabled) {
    transform: scale(0.93);
  }
`;
