/**
 * Day arithmetic, in LOCAL time.
 *
 * Scheduling in milliseconds means a session at 9pm and one at 8am the next
 * morning can land on the same "day", or two different ones, depending on the
 * timezone. Everything that needs a day goes through here.
 */

/** Days since the epoch, counted from LOCAL midnight. */
export function dayIndex(d: Date = new Date()): number {
  const localMs = d.getTime() - d.getTimezoneOffset() * 60_000;
  return Math.floor(localMs / 86_400_000);
}

/** The current local day index. */
export function today(now: Date = new Date()): number {
  return dayIndex(now);
}

/** Local calendar date as "YYYY-MM-DD" — the key for Daily results. */
export function dayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
