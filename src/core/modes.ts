import type { Box } from "./mastery";

/**
 * The exercise ladder. Each rung is a different retrieval operation, which is
 * the point — varied retrieval builds more durable memory than one drill
 * repeated. The old app only ever performed the first one.
 */
export type ModeId = "match" | "reverse" | "spell";

export const MODE_LABEL: Record<ModeId, string> = {
  match: "Match",
  reverse: "Reverse",
  spell: "Spell",
};

/** Which exercise an element has earned, given its box. */
export function modeForBox(box: Box): ModeId {
  if (box <= 1) return "match";
  if (box === 2) return "reverse";
  return "spell";
}
