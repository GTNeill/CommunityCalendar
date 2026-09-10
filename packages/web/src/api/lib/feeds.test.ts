// Run: bun test packages/web/src/api/lib/feeds.test.ts
//
// The line format must stay byte-compatible with the WordPress plugin's
// feeds textarea (includes/class-wpcc-settings.php::get_feeds / normalize_feed)
// so the two can be copied between each other verbatim.

import { describe, expect, test } from "bun:test";
import {
  DEFAULT_FEEDS, normalizeFeed, parseIcsFeeds, parseSquarespaceFeeds, parseRssFeeds, validateFeeds,
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

  test("the seeded defaults carry an explicit page link, since a raw ICS feed has none of its own", () => {
    const feeds = parseIcsFeeds(DEFAULT_FEEDS.ics);
    expect(feeds[0].pageUrl).toBe("https://40thward.org/events/");
    expect(feeds[1].pageUrl).toBe("https://40thward.org/events/");
  });

  test("reads an explicit page link from the optional third pipe field", () => {
    const feeds = parseIcsFeeds("https://e.com/a.ics | A | https://e.com/events/");
    expect(feeds[0].pageUrl).toBe("https://e.com/events/");
  });

  test("has no page link when the third field is omitted", () => {
    expect(parseIcsFeeds("https://e.com/a.ics | A")[0].pageUrl).toBe("");
    expect(parseIcsFeeds("https://e.com/a.ics")[0].pageUrl).toBe("");
  });

  test("drops a third field that isn't a real URL rather than surfacing a bad link", () => {
    expect(parseIcsFeeds("https://e.com/a.ics | A | not a url")[0].pageUrl).toBe("");
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

  test("the feed URL doubles as the page link, since it's already the events page", () => {
    const feeds = parseSquarespaceFeeds(DEFAULT_FEEDS.squarespace);
    expect(feeds[0].pageUrl).toBe("https://www.thegreaterrockwell.org/events");
    expect(feeds[1].pageUrl).toBe("https://www.heartoflincolnsquare.org/events");
  });

  test("an explicit third field overrides the feed URL as the page link", () => {
    const feeds = parseSquarespaceFeeds("https://x.org/events | X | https://x.org/calendar-page");
    expect(feeds[0].pageUrl).toBe("https://x.org/calendar-page");
  });
});

describe("validateFeeds", () => {
  test("accepts the seeded defaults", () => {
    expect(validateFeeds(DEFAULT_FEEDS)).toEqual([]);
  });

  test("reports the offending line number for a bad ics value", () => {
    const errors = validateFeeds({ ics: "https://ok.com/a.ics | A\nnot a feed | B", squarespace: "", rss: "" });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("line 2");
    expect(errors[0]).toContain("not a feed");
  });

  test("requires squarespace entries to be full URLs", () => {
    const errors = validateFeeds({ ics: "", squarespace: "thegreaterrockwell.org/events | GRO", rss: "" });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("full http(s) URL");
  });

  test("comments and blanks never produce errors", () => {
    expect(validateFeeds({ ics: "# just a note\n\n", squarespace: "\n# and here\n", rss: "# none\n" })).toEqual([]);
  });

  test("rejects a page link (third field) that isn't a full http(s) URL", () => {
    const errors = validateFeeds({ ics: "https://ok.com/a.ics | A | not-a-url", squarespace: "", rss: "" });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("line 1");
    expect(errors[0]).toContain("page link");
  });

  test("accepts a well-formed page link on any of the three feed types", () => {
    expect(validateFeeds({
      ics: "https://ok.com/a.ics | A | https://ok.com/events/",
      squarespace: "https://x.org/events | X | https://x.org/calendar",
      rss: "https://y.org/events/rss | Y | https://y.org/events",
    })).toEqual([]);
  });
});

describe("parseRssFeeds", () => {
  test("parses url + display name", () => {
    const feeds = parseRssFeeds("https://www.dankhaus.com/events/rss | DANK Haus");
    expect(feeds).toEqual([{ url: "https://www.dankhaus.com/events/rss", name: "DANK Haus", pageUrl: "" }]);
  });

  test("falls back to a default name when the pipe is omitted", () => {
    expect(parseRssFeeds("https://example.org/events/rss")[0].name).toBe("Events");
  });

  test("skips comments, blanks, and non-URL values", () => {
    const feeds = parseRssFeeds([
      "# DANK Haus",
      "",
      "example.org/events/rss | no scheme",
      "https://example.org/events/rss | Example",
    ].join("\n"));
    expect(feeds).toHaveLength(1);
    expect(feeds[0].name).toBe("Example");
  });

  test("the seeded default includes the DANK Haus feed, with its own page link (not the /rss URL)", () => {
    const feeds = parseRssFeeds(DEFAULT_FEEDS.rss);
    expect(feeds).toHaveLength(1);
    expect(feeds[0].url).toBe("https://www.dankhaus.com/events/rss");
    expect(feeds[0].pageUrl).toBe("https://www.dankhaus.com/events");
  });

  test("has no page link when the third field is omitted — the /rss URL itself is not a page", () => {
    expect(parseRssFeeds("https://example.org/events/rss | Example")[0].pageUrl).toBe("");
  });
});

describe("validateFeeds — rss", () => {
  test("requires rss entries to be full URLs, reporting the line", () => {
    const errors = validateFeeds({ ics: "", squarespace: "", rss: "https://ok.org/rss | A\ndankhaus.com/events/rss | B" });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("line 2");
    expect(errors[0]).toContain("full http(s) URL");
  });
});
