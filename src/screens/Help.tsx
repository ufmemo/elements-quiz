import styled from "styled-components";
import { RUSH_MIN } from "../core/scheduler";
import { BOX_COLOR, C, FONT, MONO } from "../ui/theme";
import { Ghost, Screen } from "../ui/primitives";

const MODES = [
  {
    name: "Review",
    what: "Your actual practice. It picks what you're due to see — new elements plus older ones coming back round — and makes the question harder as you get better: first pick the name, then pick the symbol, then spell the symbol yourself.",
    moves: true,
  },
  {
    name: "Rush",
    what: `A 60-second speed round using only elements you already know. It trains how fast you can remember, not what you remember. Locked until ${RUSH_MIN} elements are learned, because there's nothing to be quick at before then.`,
    moves: false,
  },
  {
    name: "Drop",
    what: "The element's name falls down the screen and you tap its symbol before it lands. Three lives; a wrong tap costs one just like running out of time, and anything you miss comes back later in the run. Every ten you catch, it speeds up and adds another choice. Some of the wrong answers are made-up abbreviations that look like they ought to be right.",
    moves: false,
  },
  {
    name: "Daily",
    what: "Six elements, the same six for everybody, changing at midnight. A quick habit rather than a lesson — play it even on days when nothing is due.",
    moves: false,
  },
];

const LADDER = [
  { box: 0, name: "New", note: "Not seen yet" },
  { box: 1, name: "Learning", note: "Seen once or twice" },
  { box: 3, name: "Familiar", note: "Comes back in a week" },
  { box: 4, name: "Strong", note: "Comes back in three weeks" },
  { box: 5, name: "Fluent", note: "Comes back in two months" },
];

export function Help({ onBack }: { onBack(): void }) {
  return (
    <Screen>
      <Head>
        <Ghost type="button" onClick={onBack}>
          &lsaquo; Today
        </Ghost>
      </Head>

      <Body>
        <Section>
          <H>The four ways to play</H>
          {MODES.map((m) => (
            <Mode key={m.name}>
              <Name>{m.name}</Name>
              <What>{m.what}</What>
              <Moves $on={m.moves}>
                {m.moves ? "Moves your progress" : "Doesn't change your schedule"}
              </Moves>
            </Mode>
          ))}
        </Section>

        <Section>
          <H>What the colours mean</H>
          <P>
            Every element sits in one of six steps. Answer it right and it moves up, and you
            won't see it again for longer. Get it wrong and it drops back two steps and
            returns the same day.
          </P>
          {LADDER.map((l) => (
            <Rung key={l.box}>
              <Swatch $c={BOX_COLOR[l.box]} />
              <RungName>{l.name}</RungName>
              <RungNote>{l.note}</RungNote>
            </Rung>
          ))}
        </Section>

        <Section>
          <H>Leaving early</H>
          <P>
            Every answer is saved the moment you tap it, so closing a session part-way
            through never loses anything. Stop whenever you like.
          </P>
        </Section>
      </Body>
    </Screen>
  );
}

const Head = styled.div`
  display: flex;
  padding-bottom: 14px;
`;

const Body = styled.div`
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 26px;
  padding-bottom: 24px;
`;

const Section = styled.section``;

const H = styled.h2`
  font-family: ${MONO};
  font-size: 0.66rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: ${C.muted};
  margin: 0 0 12px;
`;

const P = styled.p`
  font-size: 0.92rem;
  line-height: 1.55;
  color: ${C.muted};
  margin: 0 0 14px;
`;

const Mode = styled.div`
  border: 2px solid ${C.faint};
  border-radius: 13px;
  background: ${C.surface};
  padding: 14px 15px;
  margin-bottom: 10px;
`;

const Name = styled.h3`
  font-family: ${FONT};
  font-size: 1.15rem;
  font-weight: 700;
  margin: 0 0 5px;
`;

const What = styled.p`
  font-size: 0.9rem;
  line-height: 1.5;
  color: ${C.muted};
  margin: 0 0 9px;
`;

const Moves = styled.span<{ $on: boolean }>`
  font-family: ${MONO};
  font-size: 0.6rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: ${({ $on }) => ($on ? C.correct : C.muted)};
`;

const Rung = styled.div`
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 5px 0;
`;

const Swatch = styled.i<{ $c: string }>`
  width: 11px;
  height: 11px;
  border-radius: 3px;
  background: ${({ $c }) => $c};
  flex-shrink: 0;
`;

const RungName = styled.span`
  font-size: 0.92rem;
  font-weight: 600;
  min-width: 82px;
`;

const RungNote = styled.span`
  font-size: 0.85rem;
  color: ${C.muted};
`;
