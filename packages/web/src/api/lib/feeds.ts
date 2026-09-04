// ── Calendar feed sources ────────────────────────────────────────────────────
//
// Which calendars the site reads used to be hardcoded in api/index.ts, so
// adding or swapping a source meant a code change and a deploy. The WordPress
// plugin has always exposed these under Settings → Calendar Cats, and this
// brings the site itself to parity.
//
// The line format is deliberately identical to the plugin's textarea
// (includes/class-wpcc-settings.php::get_feeds) so the two can be copied
// between each other verbatim:
//
//   https://example.com/events.ics | Village Events
//   abc123@group.calendar.google.com | Ward Events
//   # blank lines and comments are ignored
//
// A bare value with no scheme is treated as a Google Calendar id and expanded
// to its public iCal URL, exactly as the plugin does.

/** Google's public iCal URL template, used when a feed is given as a calendar id. */
const GCAL_ICAL = "https://calendar.google.com/calendar/ical/%s/public/basic.ics";

const GCAL_ICAL_RE =
  /^https?:\/\/(?:www\.)?calendar\.google\.com\/calendar\/ical\/([^/]+)\/public\/basic\.ics/i;

export interface IcsFeed {
  /** Fully-resolved .ics URL to fetch. */
  url: string;
  /** Display name, surfaced as the event's organizer. */
  name: string;
  /**
   * The Google Calendar id, when this feed is a Google calendar. Needed to
   * build per-event calendar.google.com links; empty for other providers,
   * which makes buildGCalLink() correctly return no link.
   */
  gcalId: string;
}

export interface SquarespaceFeed {
  url: string;
  name: string;
}

export interface FeedSettings {
  /** Raw textarea contents, preserved verbatim so comments and order survive a round-trip. */
  ics: string;
  squarespace: string;
}

/** The sources that were hardcoded before this was configurable. */
export const DEFAULT_FEEDS: FeedSettings = {
  ics:
    "c_50dc8883383193a9f6ba4d86cd23a836978e1d42028f0e7bb263955d5539912c@group.calendar.google.com | 40th Ward Events\n" +
    "c_05dba706bb25f28f63bfc0b821c9f8d5e29d9f2b105e78949388b675eb801572@group.calendar.google.com | 40th Ward Community",
  squarespace:
    "https://www.thegreaterrockwell.org/events | Greater Rockwell Organization\n" +
    "https://www.heartoflincolnsquare.org/events | Heart of Lincoln Square",
};

/** Split a textarea into `{ value, name }`, dropping blanks and # comments. */
function parseLines(raw: string): { value: string; name: string }[] {
  const out: { value: string; name: string }[] = [];
  for (const line of (raw ?? "").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    let value = trimmed;
    let name = "";
    const pipe = trimmed.indexOf("|");
    if (pipe !== -1) {
      value = trimmed.slice(0, pipe).trim();
      name = trimmed.slice(pipe + 1).trim();
    }
    if (!value) continue;
    out.push({ value, name });
  }
  return out;
}

/**
 * Resolve one feed value to a URL plus, when applicable, its Google Calendar
 * id. Mirrors the plugin's normalize_feed().
 */
export function normalizeFeed(value: string): { url: string; gcalId: string } {
  let v = (value ?? "").trim();
  if (!v) return { url: "", gcalId: "" };

  // webcal:// is just https:// for our purposes.
  if (/^webcal:\/\//i.test(v)) v = `https://${v.slice(9)}`;

  if (/^https?:\/\//i.test(v)) {
    // Recover the calendar id from a Google iCal URL so event deep-links
    // keep working when a feed is pasted as a full URL rather than an id.
    const m = v.match(GCAL_ICAL_RE);
    let gcalId = "";
    if (m) {
      try { gcalId = decodeURIComponent(m[1]); } catch { gcalId = m[1]; }
    }
    return { url: v, gcalId };
  }

  // Anything else is treated as a Google Calendar id. Reject values with
  // whitespace or slashes, which cannot be one.
  if (/^[^\s/\\]+$/.test(v)) {
    return { url: GCAL_ICAL.replace("%s", encodeURIComponent(v)), gcalId: v };
  }

  return { url: "", gcalId: "" };
}

/** Parse the ICS textarea into fetchable feeds. Invalid lines are skipped. */
export function parseIcsFeeds(raw: string): IcsFeed[] {
  const feeds: IcsFeed[] = [];
  for (const { value, name } of parseLines(raw)) {
    const { url, gcalId } = normalizeFeed(value);
    if (!url) continue;
    feeds.push({ url, name: name || "Calendar", gcalId });
  }
  return feeds;
}

/**
 * Parse the Squarespace textarea. These must be real http(s) URLs of an
 * events collection page — there is no id shorthand to expand.
 */
export function parseSquarespaceFeeds(raw: string): SquarespaceFeed[] {
  const feeds: SquarespaceFeed[] = [];
  for (const { value, name } of parseLines(raw)) {
    if (!/^https?:\/\//i.test(value)) continue;
    feeds.push({ url: value, name: name || "Events" });
  }
  return feeds;
}

/**
 * Per-line validation for the admin UI, so a typo is reported on save
 * instead of silently dropping a calendar.
 */
export function validateFeeds(settings: FeedSettings): string[] {
  const errors: string[] = [];

  (settings.ics ?? "").split(/\r?\n/).forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const value = trimmed.includes("|") ? trimmed.slice(0, trimmed.indexOf("|")).trim() : trimmed;
    if (!value) return;
    if (!normalizeFeed(value).url) {
      errors.push(`Calendar feeds, line ${i + 1}: "${value}" is not a URL or a Google Calendar id.`);
    }
  });

  (settings.squarespace ?? "").split(/\r?\n/).forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const value = trimmed.includes("|") ? trimmed.slice(0, trimmed.indexOf("|")).trim() : trimmed;
    if (!value) return;
    if (!/^https?:\/\//i.test(value)) {
      errors.push(`Squarespace sources, line ${i + 1}: "${value}" must be a full http(s) URL.`);
    }
  });

  return errors;
}
