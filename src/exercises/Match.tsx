import styled from "styled-components";
import { shuffle } from "../core/rng";
import { useMemo } from "react";
import { C, FONT, MONO } from "../ui/theme";
import { Zbadge } from "../ui/primitives";
import { tappable } from "../ui/tappable";
import type { ExerciseProps } from "./types";

/** Symbol shown, tap the name. Recognition — the lowest rung. */
export function Match({ card, onChoose, locked, chosen }: ExerciseProps) {
  const options = useMemo(
    () => shuffle([card.element, ...card.distractors]),
    [card],
  );

  return (
    <>
      <Prompt data-mode="match">
        <Zbadge>{card.element.z}</Zbadge>
        {card.element.symbol}
      </Prompt>
      <Hint>Which element is this?</Hint>
      <Options>
        {options.map((o) => {
          const isAnswer = o.symbol === card.element.symbol;
          const isChoice = o.symbol === chosen;
          return (
            <Option
              key={o.symbol}
              data-opt={o.symbol}
              type="button"
              disabled={locked}
              onClick={() => onChoose(o.symbol)}
              $state={
                !locked ? "idle" : isAnswer ? "right" : isChoice ? "wrong" : "dim"
              }
            >
              {o.name}
            </Option>
          );
        })}
      </Options>
    </>
  );
}

const Prompt = styled.div`
  position: relative;
  align-self: center;
  font-family: ${FONT};
  font-size: 4.4rem;
  font-weight: 700;
  letter-spacing: -0.04em;
  padding: 8px 18px;
  user-select: none;
`;

const Hint = styled.p`
  font-family: ${MONO};
  font-size: 0.68rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: ${C.muted};
  text-align: center;
  margin: 0 0 6px;
`;

const Options = styled.div`
  display: flex;
  flex-direction: column;
  gap: 9px;
`;

export const Option = styled.button<{ $state: "idle" | "right" | "wrong" | "dim" }>`
  ${tappable};
  border-radius: 13px;
  font-family: ${FONT};
  font-size: 1.06rem;
  font-weight: 600;
  padding: 15px 16px;
  text-align: left;
  transition: background 140ms ease, border-color 140ms ease, opacity 140ms ease;
  border: 2px solid
    ${({ $state }) =>
      $state === "right" ? C.correct : $state === "wrong" ? C.wrong : C.faint};
  background: ${({ $state }) =>
    $state === "right" ? C.correctBg : $state === "wrong" ? C.wrongBg : C.surface};
  color: ${({ $state }) =>
    $state === "right" ? C.correct : $state === "wrong" ? C.wrong : C.ink};
  opacity: ${({ $state }) => ($state === "dim" ? 0.42 : 1)};
`;
