import styled from "styled-components";
import { Incorrect } from "./useGame";
import { useEffect, useRef } from "react";

import confetti from "canvas-confetti";

interface IGameOver {
  correctCount: number;
  incorrect: Incorrect[];
  reset: () => void;
}

export function GameOver({ correctCount, incorrect, reset }: IGameOver) {
  const canvasRef = useRef<HTMLCanvasElement>(null); // Create a ref for the canvas

  useEffect(() => {
    if (correctCount > 0 && incorrect.length === 0) {
      triggerConfetti();
    }
  }, [correctCount, incorrect]);

  const triggerConfetti = () => {
    if (canvasRef.current) {
      const myConfetti = confetti.create(canvasRef.current, {
        resize: true,
        useWorker: true,
      });
      myConfetti({
        particleCount: 280,
        spread: 180,
        origin: { y: 0.6 },
      });
    }
  };

  return (
    <Wrapper>
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 1020,
        }}
      />
      <Page>
        <div>
          <Grade>
            Game Over ({calculateGrade(correctCount, incorrect.length)})
          </Grade>
          <List>
            {incorrect.length == 0 && <h2>You got them all right!</h2>}
            {incorrect.length > 0 && <h2>Incorrect Answers</h2>}
            {incorrect.map((i, index) => (
              <IncorrectAnswer key={index} incorrect={i} />
            ))}
          </List>
        </div>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Button onClick={reset}>Play Again</Button>
        </div>
      </Page>
    </Wrapper>
  );
}

function calculateGrade(correctCount: number, incorrectCount: number) {
  const total = correctCount + incorrectCount;
  return Math.round((correctCount / total) * 100) + "%";
}

function IncorrectAnswer({ incorrect }: { incorrect: Incorrect }) {
  const draggedElement = incorrect[0];
  const droppedOnElement = incorrect[1];

  return (
    <li>
      <span>{draggedElement.name}</span> is <Card>{draggedElement.symbol}</Card>{" "}
      not <Card>{droppedOnElement.symbol}</Card>
    </li>
  );
}

const Wrapper = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  font-family: Arial, Helvetica, sans-serif;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  color: white;
  font-weight: bold;
  z-index: 1001;
  padding: 24px;
`;
const Button = styled.button`
  padding: 12px 24px;
  font-size: 1rem;
  background-color: green;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
`;

const Grade = styled.p`
  font-size: 4rem;
  text-align: center;
  color: green;
  padding: 0;
  margin: 0;
`;

const Page = styled.div`
  position: fixed;
  background-color: white;
  border-radius: 12px;
  color: black;
  top: 5%;
  left: 20%;
  right: 20%;
  bottom: 5%;
  z-index: 1002;
  padding: 36px;
  h1 {
    text-align: center;
    font-size: 2rem;
    margin: 24px;
  }
  display: flex;
  flex-direction: column;
  justify-content: space-between;
`;

const List = styled.ol`
  /* border: 1px solid red; */
  padding-top: 24px;
  width: 60%;
  margin: 0 auto;
  list-style: none;
  li {
    margin: 0;
    padding: 24px 0;
    font-size: 1rem;
    font-family: Arial, Helvetica, sans-serif;
  }
`;

const Card = styled.span`
  padding: 16px;
  border: 2px solid black;
  border-radius: 4px;
  font-size: 1.5rem;
  //drop shadow
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
`;
