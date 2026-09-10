import styled from "styled-components";
import { elements } from "../core/elements";
import { dueCount } from "../core/scheduler";
import { C, BOX_COLOR, FONT, MONO } from "../ui/theme";
import { Label, Primary, Screen, Spacer } from "../ui/primitives";
import { tappable } from "../ui/tappable";
import type { Save } from "../store/save";

interface Props {
  save: Save;
  day: number;
  dailyDone: boolean;
  onReview(): void;
  onFree(): void;
  onRush(): void;
  onDaily(): void;
  onProgress(): void;
  onToggleSound(): void;
  onToggleTimer(): void;
}

/**
 * The root screen answers exactly one question: what do I do right now?
 *
 * Reading order runs top to bottom, but importance runs bottom-up — the
 * primary action sits in the lower third, where a thumb rests on a 6" phone,
 * not at the top where it looks tidy in a mockup and can't be reached.
 */
export function Today({
  save,
  day,
  dailyDone,
  onReview,
  onFree,
  onRush,
  onDaily,
  onProgress,
  onToggleSound,
  onToggleTimer,
}: Props) {
  const due = dueCount(save.mastery, day);
  const fluent = Object.values(save.mastery).filter((m) => m.box >= 5).length;
  const caughtUp = due === 0;

  return (
    <Screen>
      <Top>
        <Streak>
          {save.stats.dayStreak > 0 ? `${save.stats.dayStreak} day streak` : "Day one"}
        </Streak>
        <Toggles>
          <Toggle
            type="button"
            onClick={onToggleSound}
            aria-pressed={save.settings.sound}
            aria-label={save.settings.sound ? "Sound on" : "Sound off"}
          >
            {save.settings.sound ? "Sound on" : "Sound off"}
          </Toggle>
          {/* Time pressure motivates some kids and derails others. */}
          <Toggle
            type="button"
            onClick={onToggleTimer}
            aria-pressed={!save.settings.timerless}
            aria-label={save.settings.timerless ? "Timer off" : "Timer on"}
          >
            {save.settings.timerless ? "Timer off" : "Timer on"}
          </Toggle>
        </Toggles>
      </Top>

      <Headline>
        {caughtUp ? (
          <>
            <Big>All caught up</Big>
            <Sub>Nothing is due today. Practice anyway?</Sub>
          </>
        ) : (
          <>
            <Big>{due}</Big>
            <Sub>{due === 1 ? "element due today" : "elements due today"}</Sub>
          </>
        )}
      </Headline>

      <StripButton type="button" onClick={onProgress}>
        <Strip>
          {elements.map((e) => (
            <Cell key={e.symbol} $c={BOX_COLOR[save.mastery[e.symbol]?.box ?? 0]} />
          ))}
        </Strip>
        <StripLabel>
          {fluent} of {elements.length} fluent &rsaquo;
        </StripLabel>
      </StripButton>

      <Spacer />

      <Modes>
        <Mode type="button" onClick={onRush}>
          <b>Rush</b>
          {save.rushBest > 0 ? `Best ${save.rushBest}` : "60 seconds"}
        </Mode>
        <Mode type="button" onClick={onDaily}>
          <b>Daily</b>
          {dailyDone ? "Played today" : "Not played"}
        </Mode>
      </Modes>

      <Primary type="button" onClick={caughtUp ? onFree : onReview}>
        {caughtUp ? "Free practice · 10 elements" : `Review ${due} element${due === 1 ? "" : "s"}`}
      </Primary>
    </Screen>
  );
}

const Top = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
`;

const Streak = styled(Label)`
  color: ${C.ink};
`;

const Toggles = styled.div`
  display: flex;
  gap: 14px;
`;

const Toggle = styled.button`
  ${tappable};
  border: none;
  background: none;
  padding: 0 0 0 12px;
  font-family: ${MONO};
  font-size: 0.66rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: ${C.muted};
`;

const Headline = styled.div`
  padding: 26px 0 18px;
`;

const Big = styled.div`
  font-family: ${FONT};
  font-size: 4.6rem;
  font-weight: 700;
  line-height: 0.95;
  letter-spacing: -0.045em;
  text-wrap: balance;
`;

const Sub = styled.div`
  font-size: 1rem;
  color: ${C.muted};
  margin-top: 8px;
`;

const StripButton = styled.button`
  ${tappable};
  border: none;
  background: none;
  padding: 0;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Strip = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
`;

const Cell = styled.i<{ $c: string }>`
  width: 12px;
  height: 12px;
  border-radius: 3px;
  background: ${({ $c }) => $c};
  transition: background 400ms cubic-bezier(0.2, 0.8, 0.2, 1);
`;

const StripLabel = styled.span`
  font-family: ${MONO};
  font-size: 0.7rem;
  color: ${C.muted};
`;

const Modes = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 10px;
`;

const Mode = styled.button`
  ${tappable};
  border: 2px solid ${C.faint};
  border-radius: 14px;
  background: ${C.surface};
  padding: 13px 14px;
  text-align: left;
  font-family: ${FONT};
  font-size: 0.8rem;
  color: ${C.muted};
  b {
    display: block;
    font-size: 1.05rem;
    color: ${C.ink};
    margin-bottom: 2px;
  }
`;
