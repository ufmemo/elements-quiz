import { useCallback, useEffect, useMemo, useState } from "react";
import { createGlobalStyle } from "styled-components";
import { dayKey, today } from "../core/day";
import {
  buildDailyCards,
  buildFreeCards,
  buildReviewCards,
  buildRushCards,
  type Card,
  type SessionKind,
  type Summary,
} from "../core/session";
import { setEnabled, unlock } from "../audio/engine";
import { prefersReducedMotion } from "../motion/tokens";
import { touchDay } from "../store/save";
import { useSave } from "../store/useSave";
import { Today } from "../screens/Today";
import { Session } from "../screens/Session";
import { Results } from "../screens/Results";
import { Progress } from "../screens/Progress";
import { C, FONT } from "../ui/theme";

/** Three destinations don't earn a tab bar. One stack, three levels. */
type Route =
  | { at: "today" }
  | { at: "session"; kind: SessionKind; cards: Card[] }
  | { at: "results"; summary: Summary }
  | { at: "progress" };

export default function App() {
  const { save, update } = useSave();
  const [route, setRoute] = useState<Route>({ at: "today" });

  const day = today();
  const key = dayKey();
  const reduced = useMemo(prefersReducedMotion, []);

  useEffect(() => setEnabled(save.settings.sound), [save.settings.sound]);

  const open = useCallback(
    (kind: SessionKind, cards: Card[]) => {
      // The AudioContext can only be resumed from inside a real tap handler.
      if (save.settings.sound) unlock();
      update((s) => touchDay(s, day));
      setRoute({ at: "session", kind, cards });
    },
    [save.settings.sound, update, day],
  );

  const onFinish = useCallback(
    (summary: Summary) => {
      update((s) => {
        const next = { ...s };
        if (summary.kind === "rush" && summary.correct > s.rushBest) {
          next.rushBest = summary.correct;
        }
        if (summary.kind === "daily") {
          next.daily = {
            ...s.daily,
            [key]: { correct: summary.correct, total: summary.total, ms: summary.durationMs },
          };
        }
        return next;
      });
      setRoute({ at: "results", summary });
    },
    [update, key],
  );

  const home = useCallback(() => setRoute({ at: "today" }), []);

  /**
   * iOS Safari's left-edge swipe fires history.back(). Without an entry of our
   * own that navigates the learner out of the app entirely, mid-session.
   *
   * Both effects below must be idempotent: StrictMode double-invokes them in
   * dev, and popstate is delivered asynchronously — so a pushState paired with
   * a back() in cleanup lands the queued popstate on the *remounted* listener
   * and bounces you straight home.
   */
  useEffect(() => {
    const onPop = () => setRoute({ at: "today" });
    addEventListener("popstate", onPop);
    return () => removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    if (route.at === "today") return;
    // One marker entry covers every non-root screen; never stack them.
    if ((history.state as { eq?: boolean } | null)?.eq) return;
    history.pushState({ eq: true }, "");
  }, [route.at]);

  return (
    <>
      <GlobalStyle $reduced={reduced} />
      {route.at === "today" && (
        <Today
          save={save}
          day={day}
          dailyDone={save.daily[key] !== undefined}
          onReview={() => open("review", buildReviewCards({ mastery: save.mastery, day }))}
          onFree={() => open("free", buildFreeCards(save.mastery))}
          onRush={() =>
            open("rush", buildRushCards(save.mastery, save.settings.timerless ? 20 : 60))
          }
          onDaily={() => open("daily", buildDailyCards(key))}
          onProgress={() => setRoute({ at: "progress" })}
          onToggleSound={() =>
            update((s) => ({ ...s, settings: { ...s.settings, sound: !s.settings.sound } }))
          }
          onToggleTimer={() =>
            update((s) => ({ ...s, settings: { ...s.settings, timerless: !s.settings.timerless } }))
          }
        />
      )}

      {route.at === "session" && (
        <Session
          kind={route.kind}
          cards={route.cards}
          day={day}
          save={save}
          update={update}
          onExit={home}
          onFinish={onFinish}
        />
      )}

      {route.at === "results" && <Results summary={route.summary} onDone={home} />}

      {route.at === "progress" && <Progress save={save} onBack={home} />}
    </>
  );
}

const GlobalStyle = createGlobalStyle<{ $reduced: boolean }>`
  * { box-sizing: border-box; }

  html, body, #root {
    margin: 0;
    padding: 0;
    background: ${C.paper};
    color: ${C.ink};
    font-family: ${FONT};
    /* Stops the whole page rubber-banding behind a session. */
    overscroll-behavior: none;
  }

  button { font: inherit; }

  ${({ $reduced }) =>
    $reduced &&
    `*, *::before, *::after {
       animation-duration: 0.001ms !important;
       transition-duration: 0.001ms !important;
     }`}
`;
