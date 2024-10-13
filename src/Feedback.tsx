import styled, { keyframes } from "styled-components";

export function Feedback({ type }: { type: "correct" | "wrong" }) {
  return (
    <Wrapper>
      <Icon
        className={`fas ${type === "correct" ? "fa-check" : "fa-times"}`}
        style={{
          color: type === "correct" ? "green" : "red",
          background: "white",
          fontSize: "48rem",
          padding: "0px",
          borderRadius: "50%",
        }}
      />
    </Wrapper>
  );
}

const scaleDown = keyframes`
  from {
    transform: scale(1);
  }
  to {
    transform: scale(0);
  }
`;

const Wrapper = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;

  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 2rem;
  color: white;
  font-weight: bold;
  z-index: 1001;
`;

const Icon = styled.i`
  animation: ${scaleDown} 0.5s forwards;
`;
