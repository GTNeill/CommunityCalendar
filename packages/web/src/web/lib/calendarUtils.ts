export interface CalEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  isAllDay: boolean;
  location: string;
  description: string;
  organizer: string;
  status: string;
  htmlLink: string;
  category: string;
  categoryLabel: string;
  categoryIcon: string;
  categoryColor: string;
  /**
   * Every organization that published this event, most authoritative first.
   * Set only when the API merged duplicate listings from overlapping sources.
   */
  sources?: string[];
  duplicateCount?: number;
}

// Category order and grouping now come from the live /api/categories data
// (see hooks/useCategories.ts) instead of being hardcoded here — this used
// to silently drift out of sync every time a category was added, renamed,
// reordered, or moved between groups via /admincat.

export type RangeUnit = "week" | "month";

export function parseLocalDate(str: string): Date {
  if (!str) return new Date();
  if (str.length === 10) return new Date(str + "T00:00:00");
  return new Date(str);
}

export function fmtTime(str: string, isAllDay: boolean): string {
  if (isAllDay) return "All day";
  const d = parseLocalDate(str);
  return d.toLocaleString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

export function fmtDuration(start: string, end: string, isAllDay: boolean): string {
  if (isAllDay || !end) return "";
  const ms = parseLocalDate(end).getTime() - parseLocalDate(start).getTime();
  if (ms <= 0) return "";
  const totalMins = Math.round(ms / 60000);
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}

export function fmtWeekday(str: string): string {
  const d = parseLocalDate(str);
  return d.toLocaleString("en-US", { weekday: "short" });
}

export function fmtDayNum(str: string): number {
  return parseLocalDate(str).getDate();
}

export function fmtMonthShort(str: string): string {
  return parseLocalDate(str).toLocaleString("en-US", { month: "short" });
}

export function isToday(str: string): boolean {
  const d = parseLocalDate(str);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

export function isSameDay(a: string, b: Date): boolean {
  const da = parseLocalDate(a);
  return da.toDateString() === b.toDateString();
}

/** Midnight today */
export function todayMidnight(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Rolling range anchored to today, offset by N weeks/months.
 *  week  → today+offset*7 through +7 days
 *  month → today+offset months through +1 month
 */
export function getRollingRange(unit: RangeUnit, offset: number): { start: Date; end: Date } {
  const today = todayMidnight();
  const start = new Date(today);
  if (unit === "week") {
    start.setDate(today.getDate() + offset * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  } else {
    start.setMonth(today.getMonth() + offset);
    const end = new Date(start);
    end.setMonth(start.getMonth() + 1);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }
}

/** Calendar-aligned range (used for the Calendar grid view).
 *  week  → Sunday–Saturday containing today + offset*7 days
 *  month → 1st–last day of the calendar month, offset months from today
 */
export function getRange(unit: RangeUnit, offset: number): { start: Date; end: Date } {
  const today = todayMidnight();

  if (unit === "week") {
    // Anchor to this week's Sunday, then shift by offset weeks
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - today.getDay() + offset * 7);
    const saturday = new Date(sunday);
    saturday.setDate(sunday.getDate() + 6);
    saturday.setHours(23, 59, 59, 999);
    return { start: sunday, end: saturday };
  } else {
    // Calendar month: first day of month (today + offset months)
    const d = new Date(today.getFullYear(), today.getMonth() + offset, 1);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0); // last day
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }
}

/** Format a range label: week shows "Jun 29 – Jul 5, 2026"; month shows "July 2026" */
export function fmtRangeLabel(start: Date, end: Date): string {
  // If same month+year, it's a calendar month view
  if (start.getDate() === 1 && end.getDate() === new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate()) {
    return start.toLocaleString("en-US", { month: "long", year: "numeric" });
  }
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const endOpts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
  return `${start.toLocaleString("en-US", opts)} – ${end.toLocaleString("en-US", endOpts)}`;
}

/** Generate array of Date objects for a range */
export function getDayRange(start: Date, end: Date): Date[] {
  const result: Date[] = [];
  const cur = new Date(start);
  while (cur < end) {
    result.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}

export function toISO(d: Date): string {
  return d.toISOString().replace(/\.\d{3}Z$/, "-05:00");
}

export function timeSince(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Description link handling ─────────────────────────────────────────────
// Google Calendar's public iCal export produces messy description text —
// sometimes clean markdown links `[text](url)`, sometimes a markdown link
// wrapping a raw HTML anchor (whose href is often a Google redirect wrapper
// like https://www.google.com/url?q=REAL_URL&sa=D&...). This normalizes all
// of that into clean <a> tags, auto-linkifies any remaining bare URLs, and
// strips any other stray HTML so nothing else can break the layout.

function unwrapGoogleRedirect(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname === "www.google.com" && u.pathname === "/url" && u.searchParams.has("q")) {
      return u.searchParams.get("q")!;
    }
  } catch {
    // not a valid absolute URL — leave as-is
  }
  return url;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function safeAnchor(label: string, href: string, color: string): string {
  const cleanHref = unwrapGoogleRedirect(href);
  if (!/^https?:\/\//i.test(cleanHref)) return escapeHtml(label);
  const style = `color:${color};text-decoration:underline;font-weight:600;`;
  return `<a href="${escapeHtml(cleanHref)}" target="_blank" rel="noopener noreferrer" style="${style}">${escapeHtml(label)}</a>`;
}

export function linkifyDescription(raw: string, linkColor: string = "#147671"): string {
  if (!raw) return "";

  // Placeholder-based pipeline: pull out every link form we recognize,
  // replacing each with a token, so later steps (bare-URL linkify, tag
  // stripping) never touch already-processed links.
  const placeholders: string[] = [];
  const stash = (html: string) => {
    placeholders.push(html);
    return `\u0000${placeholders.length - 1}\u0000`;
  };

  let text = raw;

  // 1) Markdown link wrapping a raw HTML anchor:
  //    [Display Text](<a href="URL" ...>anything</a>)
  text = text.replace(
    /\[([^\]]+)\]\(\s*<a\s+href="([^"]+)"[^>]*>[^<]*<\/a>\s*\)/gi,
    (_m, label, href) => stash(safeAnchor(label, href, linkColor))
  );

  // 2) Plain markdown link: [Display Text](https://example.com)
  text = text.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gi,
    (_m, label, href) => stash(safeAnchor(label, href, linkColor))
  );

  // 3) Any remaining raw HTML anchor tags — keep them, just normalize
  //    target/rel and unwrap Google redirects.
  text = text.replace(
    /<a\s+href="([^"]+)"[^>]*>([^<]*)<\/a>/gi,
    (_m, href, label) => stash(safeAnchor(label || href, href, linkColor))
  );

  // 4) Strip any other stray HTML tags (safe now — real links are stashed).
  text = text.replace(/<[^>]*>/g, " ");

  // 5) Auto-linkify any bare URLs left in the plain text.
  text = text.replace(
    /(https?:\/\/[^\s<)]+)/gi,
    (url) => stash(safeAnchor(url, url, linkColor))
  );

  // 6) Re-insert stashed links, escaping everything else.
  const parts = text.split(/\u0000(\d+)\u0000/g);
  return parts
    .map((part, i) => (i % 2 === 1 ? placeholders[Number(part)] : escapeHtml(part)))
    .join("")
    .trim();
}

export function googleMapsUrl(location: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

// ── "Add to Google Calendar" link ─────────────────────────────────────────
// Event start/end strings are naive Chicago wall-clock ISO (no "Z"), so we
// convert them to true UTC using the same DST-aware technique as the server
// (works identically in the browser — both implement the ECMA-402 Intl API).
function chicagoISOToUTC(isoNaive: string): Date {
  const asUTC = new Date(isoNaive + "Z");
  const tzStr = asUTC.toLocaleString("en-US", { timeZone: "America/Chicago" });
  const utcStr = asUTC.toLocaleString("en-US", { timeZone: "UTC" });
  const offsetMs = new Date(utcStr).getTime() - new Date(tzStr).getTime();
  return new Date(asUTC.getTime() + offsetMs);
}

function fmtUTCForGoogle(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

export function googleCalendarAddUrl(ev: CalEvent): string {
  let datesParam: string;

  if (ev.isAllDay) {
    // Google's all-day "dates" end is EXCLUSIVE — add one day.
    const startDate = ev.start.slice(0, 10).replace(/-/g, "");
    const endObj = new Date(`${ev.end ? ev.end.slice(0, 10) : ev.start.slice(0, 10)}T00:00:00Z`);
    endObj.setUTCDate(endObj.getUTCDate() + 1);
    const endDate = endObj.toISOString().slice(0, 10).replace(/-/g, "");
    datesParam = `${startDate}/${endDate}`;
  } else {
    const startUTC = chicagoISOToUTC(ev.start);
    const endUTC = ev.end ? chicagoISOToUTC(ev.end) : new Date(startUTC.getTime() + 60 * 60 * 1000);
    datesParam = `${fmtUTCForGoogle(startUTC)}/${fmtUTCForGoogle(endUTC)}`;
  }

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: ev.title,
    dates: datesParam,
    details: (ev.description || "").replace(/<[^>]*>/g, " ").trim().slice(0, 900),
    location: ev.location || "",
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}


