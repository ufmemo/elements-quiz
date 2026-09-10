import { css } from "styled-components";
import { C } from "./theme";

/**
 * Every interactive surface carries the same touch hardening:
 * - touch-action: manipulation kills double-tap zoom on fast repeated answers
 * - user-select: none stops long-press selecting an element name mid-Rush
 * - the tap highlight is removed so we can design a real :active state
 * - 44px minimum, the iOS hit-target floor
 */
export const tappable = css`
  touch-action: manipulation;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  min-height: 44px;
  cursor: pointer;
  &:disabled {
    cursor: default;
  }
  &:focus-visible {
    outline: 3px solid ${C.correct};
    outline-offset: 2px;
  }
`;
