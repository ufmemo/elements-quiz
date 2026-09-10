export const C = {
  ink: "#14181a",
  paper: "#f4f6f5",
  surface: "#ffffff",
  muted: "#6b7a78",
  faint: "#dde4e1",
  correct: "#0f7a52",
  correctBg: "#e0f1e9",
  wrong: "#bd332b",
  wrongBg: "#fbe7e5",
} as const;

/** Mastery box -> colour. Used by the progress strip and the results list. */
export const BOX_COLOR = [
  "#c3ccca", // 0 new
  "#bd332b", // 1 learning
  "#c07a1a", // 2 learning
  "#6d51c0", // 3 familiar
  "#1f9d63", // 4 strong
  "#0f7a52", // 5 fluent
] as const;

export const FONT = `Helvetica Neue, Helvetica, Arial, sans-serif`;
export const MONO = `ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace`;
