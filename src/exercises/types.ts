import type { FC } from "react";
import type { Card } from "../core/session";
import type { ModeId } from "../core/modes";

export interface ExerciseProps {
  card: Card;
  /** The symbol the learner is asserting is the answer. */
  onChoose(symbol: string): void;
  /** True while feedback is showing — stop accepting input. */
  locked: boolean;
  /** What they picked, once locked. */
  chosen: string | null;
}

export interface Mode {
  id: ModeId;
  label: string;
  /** Not every element can be asked every way. */
  canAsk(symbol: string): boolean;
  Component: FC<ExerciseProps>;
}
