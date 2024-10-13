import styled from "styled-components";
import { IElement } from "./elements";
import { useDroppable } from "@dnd-kit/core";

export function Symbol({ element }: { element: IElement }) {
  const { setNodeRef, isOver } = useDroppable({
    id: element.symbol,
  });

  const isOverStr = String(isOver);

  return (
    <Wrapper ref={setNodeRef} $isover={isOverStr}>
      {element.symbol}
      <Position $isover={isOverStr}>{element.position}</Position>
    </Wrapper>
  );
}

const Wrapper = styled.li<{ $isover: string }>`
  border: 4px solid ${({ $isover }) => ($isover === "true" ? "red" : "#000")};
  border-radius: 12px;
  padding: 20px;
  margin: 5px;
  width: 60px;
  height: 60px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  font-size: 3rem;
  background-color: #f0f0f0;
  box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.1);
  position: relative;
  user-select: none;
`;

const Position = styled.i<{ $isover: string }>`
  position: absolute;
  top: 2px;
  left: 2px;
  font-size: 0.8rem;
  font-family: Arial, Helvetica, sans-serif;
  font-style: normal;
  font-weight: 600;
  color: #fff;
  background-color: ${({ $isover }) => ($isover === "true" ? "red" : "#000")};
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: grid;
  place-items: center;
`;
