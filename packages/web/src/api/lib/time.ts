// Shared time helpers used by the ICS parser and by the feed connectors, so
// every source emits identical wall-clock strings for the calendar's home
// timezone.

export const DEFAULT_TZ = "America/Chicago";

// "2026-08-27T19:00:00" in Chicago wall-clock time, from an absolute instant.
// sv-SE gives ISO-ish "YYYY-MM-DD HH:mm:ss" which we just re-join with a T.
export function toChicagoISO(d: Date): string {
  return d.toLocaleString("sv-SE", { timeZone: DEFAULT_TZ }).replace(" ", "T");
}
