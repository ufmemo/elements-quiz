import styled from "styled-components";
import { elements } from "../core/elements";
import { RUSH_MIN, dueCount, rushProgress, rushUnlocked } from "../core/scheduler";
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
  onFall(): void;
  onDaily(): void;
  onProgress(): void;
  onHelp(): void;
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
  onFall,
  onDaily,
  onProgress,
  onHelp,
  onToggleSound,
  onToggleTimer,
}: Props) {
  const due = dueCount(save.mastery, day);
  const canRush = rushUnlocked(save.mastery);
  const towardRush = rushProgress(save.mastery);
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
          <Toggle type="button" onClick={onHelp} aria-label="How this works">
            ?
          </Toggle>
        </Toggles>
      </Top>

      <Spacer />

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
      <Spacer />

      <Extras>Extras &mdash; these don&rsquo;t change your schedule</Extras>
      <Modes>
        <Mode type="button" onClick={onRush} disabled={!canRush} $locked={!canRush}>
          <b>Rush</b>
          <span>{canRush ? "Speed round · 60s" : "Locked"}</span>
          <small>
            {canRush
              ? save.rushBest > 0
                ? `Elements you know · best ${save.rushBest}`
                : "Elements you already know"
              : `Learn ${RUSH_MIN - towardRush} more to unlock`}
          </small>
        </Mode>
        <Mode type="button" onClick={onDaily}>
          <b>Daily</b>
          <span>{dailyDone ? "Played today" : "Today’s six"}</span>
          <small>Same six for everyone</small>
        </Mode>
      </Modes>

      <Wide type="button" onClick={onFall}>
        <b>Drop</b>
        <span>Catch them before they land</span>
        <small>
          All 67 · 3 lives · gets faster
          {save.fallBest > 0 ? ` · best ${save.fallBest}` : ""}
        </small>
      </Wide>

      <Primary type="button" onClick={caughtUp ? onFree : onReview}>
        {caughtUp ? "Free practice · 10 elements" : `Review ${due} element${due === 1 ? "" : "s"}`}
      </Primary>
      <Caption>
        {caughtUp
          ? "Extra practice. Nothing here changes your schedule."
          : "New elements and ones due again. The only mode that moves your progress."}
      </Caption>
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

const Extras = styled.p`
  font-family: ${MONO};
  font-size: 0.6rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: ${C.muted};
  margin: 0 0 7px;
`;

const Caption = styled.p`
  font-size: 0.78rem;
  line-height: 1.4;
  color: ${C.muted};
  text-align: center;
  margin: 9px 2px 0;
  text-wrap: balance;
`;

const Wide = styled.button`
  ${tappable};
  border: 2px solid ${C.faint};
  border-radius: 14px;
  background: ${C.surface};
  padding: 12px 14px;
  text-align: left;
  font-family: ${FONT};
  margin-bottom: 10px;
  b {
    display: block;
    font-size: 1.05rem;
    color: ${C.ink};
    margin-bottom: 1px;
  }
  span {
    display: block;
    font-size: 0.78rem;
    font-weight: 600;
    color: ${C.muted};
  }
  small {
    display: block;
    font-size: 0.68rem;
    color: ${C.muted};
    margin-top: 3px;
  }
`;

const Modes = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 10px;
`;

const Mode = styled.button<{ $locked?: boolean }>`
  ${tappable};
  border: 2px solid ${C.faint};
  border-radius: 14px;
  background: ${C.surface};
  padding: 12px 13px;
  text-align: left;
  font-family: ${FONT};
  opacity: ${({ $locked }) => ($locked ? 0.55 : 1)};
  b {
    display: block;
    font-size: 1.05rem;
    color: ${({ $locked }) => ($locked ? C.muted : C.ink)};
    margin-bottom: 1px;
  }
  span {
    display: block;
    font-size: 0.78rem;
    font-weight: 600;
    color: ${C.muted};
  }
  small {
    display: block;
    font-size: 0.68rem;
    line-height: 1.35;
    color: ${C.muted};
    margin-top: 3px;
  }
`;
