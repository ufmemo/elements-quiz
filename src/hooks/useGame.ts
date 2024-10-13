import { useState } from "react";
import { elements, IElement } from "../utils/elements";

const COUNT = 10;

export type Incorrect = [IElement, IElement];

export function useGame() {
  const [elementList, setElementList] = useState(randomizeArray(elements));

  const [incorrect, setIncorrect] = useState<Incorrect[]>([]);

  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);

  /**
   * symbol1 is the elementName (being dragged)
   * symbol2 is the symbol (being dropped on)
   */
  function onDrop(symbol1: string, symbol2: string) {
    if (symbol1 === symbol2) {
      //   alert("right");
      setCorrect((prev) => prev + 1);
      setElementList((prev) => {
        return prev.map((e) => {
          if (e.symbol === symbol1) {
            return { ...e, answered: true };
          }
          return e;
        });
      });
    } else {
      //   alert("wrong");
      setWrong((prev) => prev + 1);
      setIncorrect((prev) => {
        const element1 = elements.find((e) => e.symbol === symbol1) as IElement;
        const element2 = elements.find((e) => e.symbol === symbol2) as IElement;
        return [...prev, [element1, element2]];
      });
    }
  }

  function reset() {
    setElementList(randomizeArray(elements));
    setCorrect(0);
    setWrong(0);
    setIncorrect([]);
  }

  return {
    correct,
    elementList,
    incorrect,
    onDrop,
    reset,
    setElementList,
    wrong,
  };
}

function randomizeArray(array: IElement[]) {
  const newArray = [...array];
  return newArray.sort(() => Math.random() - 0.5).splice(0, COUNT);
}
