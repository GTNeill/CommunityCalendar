// Run: bun test packages/web/src/api/lib/feeds.test.ts
//
// The line format must stay byte-compatible with the WordPress plugin's
// feeds textarea (includes/class-wpcc-settings.php::get_feeds / normalize_feed)
// so the two can be copied between each other verbatim.

import { describe, expect, test } from "bun:test";
import {
  DEFAULT_FEEDS, normalizeFeed, parseIcsFeeds, parseSquarespaceFeeds, validateFeeds,
} from "./feeds";

const WARD_ID = "c_50dc8883383193a9f6ba4d86cd23a836978e1d42028f0e7bb263955d5539912c@group.calendar.google.com";

describe("normalizeFeed", () => {
  test("expands a bare Google Calendar id to its public iCal URL", () => {
    const { url, gcalId } = normalizeFeed(WARD_ID);
    expect(url).toBe(`https://calendar.google.com/calendar/ical/${encodeURIComponent(WARD_ID)}/public/basic.ics`);
    expect(gcalId).toBe(WARD_ID);
  });

  test("passes a full .ics URL through untouched", () => {
    const { url, gcalId } = normalizeFeed("https://example.com/events.ics");
    expect(url).toBe("https://example.com/events.ics");
    // Not a Google feed, so no id — buildGCalLink must then produce no link.
    expect(gcalId).toBe("");
  });

  test("recovers the calendar id from a full Google iCal URL", () => {
    const full = `https://calendar.google.com/calendar/ical/${encodeURIComponent(WARD_ID)}/public/basic.ics`;
    expect(normalizeFeed(full).gcalId).toBe(WARD_ID);
  });

  test("rewrites webcal:// to https://", () => {
    expect(normalizeFeed("webcal://example.com/f.ics").url).toBe("https://example.com/f.ics");
  });

  test("rejects values that cannot be a URL or an id", () => {
    expect(normalizeFeed("not a calendar").url).toBe("");
    expect(normalizeFeed("foo/bar").url).toBe("");
    expect(normalizeFeed("").url).toBe("");
  });
});

describe("parseIcsFeeds", () => {
  test("parses the seeded defaults into two named feeds", () => {
    const feeds = parseIcsFeeds(DEFAULT_FEEDS.ics);
    expect(feeds).toHaveLength(2);
    expect(feeds[0].name).toBe("40th Ward Events");
    expect(feeds[1].name).toBe("40th Ward Community");
    expect(feeds[0].gcalId).toBe(WARD_ID);
  });

  test("ignores blank lines and # comments", () => {
    const feeds = parseIcsFeeds("# a note\n\nhttps://e.com/a.ics | A\n   \n# another\nhttps://e.com/b.ics | B");
    expect(feeds.map(f => f.name)).toEqual(["A", "B"]);
  });

  test("falls back to a generic name when the pipe is omitted", () => {
    expect(parseIcsFeeds("https://e.com/a.ics")[0].name).toBe("Calendar");
  });

  test("tolerates missing and extra whitespace around the pipe", () => {
    expect(parseIcsFeeds("https://e.com/a.ics|A")[0].name).toBe("A");
    expect(parseIcsFeeds("  https://e.com/a.ics   |   A  ")[0].name).toBe("A");
  });

  test("keeps a display name containing a pipe-free URL", () => {
    expect(parseIcsFeeds("https://e.com/a.ics | Ward Events 2026")[0].name).toBe("Ward Events 2026");
  });

  test("skips invalid lines instead of throwing", () => {
    const feeds = parseIcsFeeds("https://e.com/a.ics | A\nnot a feed at all | B");
    expect(feeds).toHaveLength(1);
    expect(feeds[0].name).toBe("A");
  });

  test("empty input yields no feeds", () => {
    expect(parseIcsFeeds("")).toEqual([]);
    expect(parseIcsFeeds("\n\n# only comments\n")).toEqual([]);
  });

  test("preserves listed order, which dedupe uses as source authority", () => {
    const feeds = parseIcsFeeds("https://e.com/a.ics | First\nhttps://e.com/b.ics | Second");
    expect(feeds.map(f => f.name)).toEqual(["First", "Second"]);
  });
});

describe("parseSquarespaceFeeds", () => {
  test("parses the seeded defaults", () => {
    const feeds = parseSquarespaceFeeds(DEFAULT_FEEDS.squarespace);
    expect(feeds).toHaveLength(2);
    expect(feeds[0].name).toBe("Greater Rockwell Organization");
  });

  test("requires a full URL — no id shorthand here", () => {
    expect(parseSquarespaceFeeds("some-collection | X")).toEqual([]);
  });

  test("ignores comments and blanks", () => {
    expect(parseSquarespaceFeeds("# nope\n\nhttps://x.org/events | X")).toHaveLength(1);
  });
});

describe("validateFeeds", () => {
  test("accepts the seeded defaults", () => {
    expect(validateFeeds(DEFAULT_FEEDS)).toEqual([]);
  });

  test("reports the offending line number for a bad ics value", () => {
    const errors = validateFeeds({ ics: "https://ok.com/a.ics | A\nnot a feed | B", squarespace: "" });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("line 2");
    expect(errors[0]).toContain("not a feed");
  });

  test("requires squarespace entries to be full URLs", () => {
    const errors = validateFeeds({ ics: "", squarespace: "thegreaterrockwell.org/events | GRO" });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("full http(s) URL");
  });

  test("comments and blanks never produce errors", () => {
    expect(validateFeeds({ ics: "# just a note\n\n", squarespace: "\n# and here\n" })).toEqual([]);
  });
});
