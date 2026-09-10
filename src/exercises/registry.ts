import type { ModeId } from "../core/modes";
import { MODE_LABEL } from "../core/modes";
import { Match } from "./Match";
import { Reverse } from "./Reverse";
import { Spell } from "./Spell";
import type { Mode } from "./types";

/**
 * Adding a fifth exercise later — the periodic-table builder, the family skill
 * tree — is one file plus one line here. The scheduler and the session machine
 * don't change.
 */
export const MODES: Record<ModeId, Mode> = {
  match: {
    id: "match",
    label: MODE_LABEL.match,
    canAsk: () => true,
    Component: Match,
  },
  reverse: {
    id: "reverse",
    label: MODE_LABEL.reverse,
    canAsk: () => true,
    Component: Reverse,
  },
  spell: {
    id: "spell",
    label: MODE_LABEL.spell,
    // Works for single-letter symbols too: the 12-key tray is what keeps
    // them honest. A two-key tray would make H free.
    canAsk: () => true,
    Component: Spell,
  },
};

export function modeFor(id: ModeId): Mode {
  return MODES[id];
}
