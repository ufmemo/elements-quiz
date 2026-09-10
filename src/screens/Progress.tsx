import styled from "styled-components";
import { CATEGORY_LABEL, elements, type Category } from "../core/elements";
import { BOX_LABEL, type Box } from "../core/mastery";
import { BOX_COLOR, C, FONT, MONO } from "../ui/theme";
import { Ghost, Screen } from "../ui/primitives";
import type { Save } from "../store/save";

const ORDER: Category[] = [
  "alkali",
  "alkaline",
  "transition",
  "post-transition",
  "metalloid",
  "nonmetal",
  "halogen",
  "noble",
  "lanthanide",
  "actinide",
];

export function Progress({ save, onBack }: { save: Save; onBack(): void }) {
  const counts = [0, 0, 0, 0, 0, 0];
  for (const e of elements) counts[save.mastery[e.symbol]?.box ?? 0]++;

  return (
    <Screen>
      <Head>
        <Ghost type="button" onClick={onBack}>
          &lsaquo; Today
        </Ghost>
      </Head>

      <Legend>
        {([5, 4, 3, 2, 1, 0] as Box[]).map((b) => (
          <Key key={b}>
            <Swatch $c={BOX_COLOR[b]} />
            {BOX_LABEL[b]} {counts[b]}
          </Key>
        ))}
      </Legend>

      <Groups>
        {ORDER.map((cat) => {
          const inCat = elements.filter((e) => e.category === cat);
          if (inCat.length === 0) return null;
          return (
            <Group key={cat}>
              <GroupName>{CATEGORY_LABEL[cat]}</GroupName>
              <Row>
                {inCat.map((e) => {
                  const m = save.mastery[e.symbol];
                  return (
                    <Cell key={e.symbol} $c={BOX_COLOR[m?.box ?? 0]} title={`${e.name} — ${BOX_LABEL[(m?.box ?? 0) as Box]}`}>
                      {e.symbol}
                    </Cell>
                  );
                })}
              </Row>
            </Group>
          );
        })}
      </Groups>
    </Screen>
  );
}

const Head = styled.div`
  display: flex;
  padding-bottom: 14px;
`;

const Legend = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  padding-bottom: 20px;
`;

const Key = styled.span`
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: ${MONO};
  font-size: 0.66rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${C.muted};
  font-variant-numeric: tabular-nums;
`;

const Swatch = styled.i<{ $c: string }>`
  width: 10px;
  height: 10px;
  border-radius: 2px;
  background: ${({ $c }) => $c};
`;

const Groups = styled.div`
  display: flex;
  flex-direction: column;
  gap: 18px;
  overflow-y: auto;
  padding-bottom: 20px;
`;

const Group = styled.div``;

const GroupName = styled.p`
  font-family: ${MONO};
  font-size: 0.62rem;
  font-weight: 600;
  letter-spacing: 0.13em;
  text-transform: uppercase;
  color: ${C.muted};
  margin: 0 0 7px;
`;

const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
`;

const Cell = styled.span<{ $c: string }>`
  min-width: 34px;
  height: 34px;
  padding: 0 5px;
  display: grid;
  place-items: center;
  border-radius: 7px;
  background: ${({ $c }) => $c};
  color: #fff;
  font-family: ${FONT};
  font-size: 0.82rem;
  font-weight: 700;
  user-select: none;
`;
