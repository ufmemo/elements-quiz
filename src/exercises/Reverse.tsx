import styled from "styled-components";
import { useMemo } from "react";
import { shuffle } from "../core/rng";
import { C, FONT, MONO } from "../ui/theme";
import { Zbadge } from "../ui/primitives";
import { tappable } from "../ui/tappable";
import type { ExerciseProps } from "./types";

/** Name shown, tap the symbol. Same fact, opposite direction. */
export function Reverse({ card, onChoose, locked, chosen }: ExerciseProps) {
  const options = useMemo(
    () => shuffle([card.element, ...card.distractors]),
    [card],
  );

  return (
    <>
      <Prompt data-mode="reverse">{card.element.name}</Prompt>
      <Hint>Which symbol is it?</Hint>
      <Grid>
        {options.map((o) => {
          const isAnswer = o.symbol === card.element.symbol;
          const isChoice = o.symbol === chosen;
          return (
            <Tile
              key={o.symbol}
              data-opt={o.symbol}
              type="button"
              disabled={locked}
              onClick={() => onChoose(o.symbol)}
              $state={
                !locked ? "idle" : isAnswer ? "right" : isChoice ? "wrong" : "dim"
              }
            >
              <Zbadge>{o.z}</Zbadge>
              {o.symbol}
            </Tile>
          );
        })}
      </Grid>
    </>
  );
}

const Prompt = styled.div`
  text-align: center;
  font-family: ${FONT};
  font-size: 2.3rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  user-select: none;
  padding: 0 4px;
  text-wrap: balance;
`;

const Hint = styled.p`
  font-family: ${MONO};
  font-size: 0.68rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: ${C.muted};
  text-align: center;
  margin: 6px 0 4px;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
`;

const Tile = styled.button<{ $state: "idle" | "right" | "wrong" | "dim" }>`
  ${tappable};
  position: relative;
  border-radius: 14px;
  font-family: ${FONT};
  font-size: 2.1rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  padding: 22px 10px;
  display: grid;
  place-items: center;
  transition: background 140ms ease, border-color 140ms ease, opacity 140ms ease;
  border: 3px solid
    ${({ $state }) =>
      $state === "right" ? C.correct : $state === "wrong" ? C.wrong : C.faint};
  background: ${({ $state }) =>
    $state === "right" ? C.correctBg : $state === "wrong" ? C.wrongBg : C.surface};
  color: ${({ $state }) =>
    $state === "right" ? C.correct : $state === "wrong" ? C.wrong : C.ink};
  opacity: ${({ $state }) => ($state === "dim" ? 0.42 : 1)};
`;
