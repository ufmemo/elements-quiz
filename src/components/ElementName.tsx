import styled from "styled-components";
import { IElement } from "../utils/elements";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

export function ElementName({ element }: { element: IElement }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: element.symbol,
    });

  const style = {
    transform: CSS.Translate.toString(transform),
    //filter dropshadow
    filter: isDragging ? "drop-shadow(2px 2px 5px rgba(0, 0, 0, 0.4))" : "none",
    zIndex: isDragging ? 1000 : "reset",
  };

  return (
    <Wrapper style={style} ref={setNodeRef}>
      <button {...listeners} {...attributes}>
        {element.name}
      </button>
    </Wrapper>
  );
}

const Wrapper = styled.li`
  display: flex;
  flex-direction: column;
  /* gap: 15px; */

  @media (max-width: 768px) {
    /* gap: 4px; */
  }
  //not selectable
  user-select: none;
  cursor: grab;
  button {
    border: 4px solid #000;
    border-radius: 12px;
    background: none;
    padding: 6px 10px;
    margin: 1px;
    width: 220px;
    font-size: 1.6rem;
    background-color: #f0f0f0;
    box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.1);
    cursor: grab;

    @media (max-width: 768px) {
      border: 2px solid #000;
      font-size: 1.2rem;
      margin: 5px;
      width: 120px;
      margin: 2px;
      padding: 2px 4px;
    }
  }
`;
