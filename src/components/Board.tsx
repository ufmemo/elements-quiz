import styled from "styled-components";

import { Symbol } from "./Symbol";
import { ElementName } from "./ElementName";
import {
  DndContext,
  DragEndEvent,
  useSensors,
  TouchSensor,
  PointerSensor,
  useSensor,
} from "@dnd-kit/core";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";

import { useGame } from "../hooks/useGame";
import { useEffect, useState } from "react";
import { Feedback } from "./Feedback";
import { GameOver } from "./GameOver";

function isTouchDevice() {
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}

export function Board() {
  const { elementList, onDrop, correct, wrong, incorrect, reset } = useGame();

  const touchSensor = useSensor(TouchSensor);
  const pointerSensor = useSensor(PointerSensor);
  const sensors = useSensors(isTouchDevice() ? touchSensor : pointerSensor);

  const [showCorrect, setShowCorrect] = useState(false);
  const [showWrong, setShowWrong] = useState(false);

  useEffect(() => {
    if (correct > 0) {
      setShowCorrect(true);
      setTimeout(() => {
        setShowCorrect(false);
      }, 1000);
    }
  }, [correct]);

  useEffect(() => {
    if (wrong > 0) {
      setShowWrong(true);
      setTimeout(() => {
        setShowWrong(false);
      }, 1000);
    }
  }, [wrong]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over) {
      // console.log(`Dropped ${active.id} over ${over.id}`);
      onDrop(String(active.id), String(over.id));
    }

    document.body.classList.remove("no-scroll");
  };

  const handleDragStart = () => {
    document.body.classList.add("no-scroll");
  };

  return (
    <Wrapper>
      {showCorrect && <Feedback type="correct" />}
      {showWrong && <Feedback type="wrong" />}
      {[...elementList].filter((e) => !e.answered).length == 0 && (
        <GameOver
          incorrect={incorrect}
          reset={reset}
          correctCount={elementList.length}
        />
      )}
      <Title>Daddy's Periodic Elements Quiz</Title>
      <ScoreBoard>
        <Score $color="green">
          {correct}
          <span>correct</span>
        </Score>
        <Score $color="red">
          {wrong}
          <span>wrong</span>
        </Score>
      </ScoreBoard>

      <DndContext
        sensors={sensors}
        onDragEnd={handleDragEnd}
        onDragStart={handleDragStart}
        modifiers={[restrictToWindowEdges]}
      >
        <Main>
          <Left>
            <SymbolList>
              {[...elementList]
                .filter((e) => !e.answered)
                .sort((a, b) => (a.position > b.position ? 1 : -1))
                .map((e) => {
                  return <Symbol key={e.symbol} element={e} />;
                })}
            </SymbolList>
          </Left>
          <Right>
            <ElementNameList>
              {[...elementList]
                .filter((e) => !e.answered)
                .map((e) => {
                  return <ElementName key={e.symbol} element={e} />;
                })}
            </ElementNameList>
          </Right>
        </Main>
      </DndContext>
    </Wrapper>
  );
}

const Wrapper = styled.div`
  font-family: Helvetica, sans-serif;
`;

const Title = styled.h1`
  text-align: center;
  font-size: 2rem;
  margin: 24px;
  user-select: none;
  line-height: 5rem;

  @media (max-width: 768px) {
    text-align: left;
    font-size: 1rem;
    margin: 12px;
    line-height: 2rem;
    width: 50%;
  }
`;

const ScoreBoard = styled.div`
  display: flex;
  flex-direction: row;
  gap: 24px;
  position: absolute;
  right: 40px;
  top: 0px;
  user-select: none;

  @media (max-width: 768px) {
    gap: 4px;
    right: 20px;
  }
`;

const Score = styled.h1<{ $color?: string }>`
  background-color: ${({ $color }) => $color || "black"};
  color: white;
  padding: 24px;
  border-radius: 12px;
  position: relative;

  @media (max-width: 768px) {
    padding: 12px;
    border-radius: 6px;
    height: 12px;
    width: 12px;
    font-size: 1rem;
    line-height: 1rem;
  }

  span {
    position: absolute;
    bottom: 2px;
    right: 0;
    font-size: 0.6rem;
    color: #fff;
    width: 100%;
    text-align: center;
    font-family: Arial, Helvetica, sans-serif;
    text-transform: uppercase;

    @media (max-width: 768px) {
      font-size: 0.4rem;
      display: none;
    }
  }
`;

const Main = styled.div`
  display: flex;
  margin-top: 48px;
  flex-direction: row;
  display: grid;
  grid-template-columns: 7fr 1fr;
  gap: 36px;

  @media (max-width: 768px) {
    margin-top: 12px;
    gap: 12px;
  }
`;

const Left = styled.div`
  position: sticky;
  top: 0;

  display: flex;
  flex-direction: column;
  justify-content: center;
`;

const Right = styled.div``;

const SymbolList = styled.ul`
  display: flex;
  margin: 0;
  justify-content: center;
  flex-wrap: wrap;
  gap: 15px;
  padding: 0;
  @media (max-width: 768px) {
    gap: 4px;
  }
`;

const ElementNameList = styled.ul`
  list-style-type: none;
  padding: 0;
`;
