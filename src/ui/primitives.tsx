import styled from "styled-components";
import { C, FONT, MONO } from "./theme";
import { tappable } from "./tappable";


export const Primary = styled.button`
  ${tappable};
  width: 100%;
  border: none;
  border-radius: 14px;
  background: ${C.ink};
  color: ${C.paper};
  font-family: ${FONT};
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  padding: 17px 20px;
  transition: transform 120ms cubic-bezier(0.2, 0.8, 0.2, 1);
  &:active {
    transform: scale(0.98);
  }
  &:disabled {
    opacity: 0.4;
  }
`;

export const Ghost = styled.button`
  ${tappable};
  border: 2px solid ${C.faint};
  border-radius: 12px;
  background: ${C.surface};
  color: ${C.ink};
  font-family: ${FONT};
  font-size: 0.95rem;
  font-weight: 600;
  padding: 12px 16px;
`;

export const Label = styled.p`
  font-family: ${MONO};
  font-size: 0.66rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: ${C.muted};
  margin: 0;
`;

/** The atomic-number badge, carried over from the original tile design. */
export const Zbadge = styled.i`
  position: absolute;
  top: -2px;
  left: -2px;
  font-family: ${MONO};
  font-size: 0.66rem;
  font-style: normal;
  font-weight: 600;
  color: ${C.surface};
  background: ${C.ink};
  width: 22px;
  height: 22px;
  border-top-left-radius: 50%;
  border-bottom-right-radius: 50%;
  display: grid;
  place-items: center;
`;

export const Screen = styled.div`
  /* dvh, never vh — Safari's toolbar makes vh wrong for most of a session */
  min-height: 100dvh;
  /* Phone-shaped even in a desktop window, rather than a stretched band. */
  max-width: 460px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  background: ${C.paper};
  color: ${C.ink};
  font-family: ${FONT};
  padding: max(14px, env(safe-area-inset-top)) 16px
    max(16px, env(safe-area-inset-bottom)) 16px;
  overscroll-behavior: none;
`;

export const Spacer = styled.div`
  flex: 1;
  min-height: 12px;
`;
