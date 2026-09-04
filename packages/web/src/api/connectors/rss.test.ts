// Run: bun test packages/web/src/api/connectors/rss.test.ts
//
// Fixtures are taken verbatim from the live dankhaus.com/events/rss payload,
// which is what proved pubDate is the event start rather than a publication
// date. The two behaviours worth guarding hardest:
//
//   1. A recurring series repeats the same <guid>/<link> for every occurrence,
//      so ids must differ by date or the whole series collapses to one row.
//   2. Events must never gain an invented end time.

import { describe, expect, test } from "bun:test";
import { mapRssItem, parseRss, parseTitleDate } from "./rss";

const SOURCE = { url: "https://www.dankhaus.com/events/rss", name: "DANK Haus" };

/** Real item shapes from the live feed. */
const LIVE_XML = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0"><channel>
  <title>DANK Haus upcoming events</title>
  <item>
    <pubDate>Fri, 11 Sep 2026 00:00:00 GMT</pubDate>
    <title>Neighborhood Nights 2026 (Thursday, September 10, 2026)</title>
    <description>&lt;p&gt;Join us&lt;/p&gt;</description>
    <link>https://dankhaus.com/event-6482571</link>
    <guid>https://dankhaus.com/event-6482571</guid>
  </item>
  <item>
    <pubDate>Fri, 25 Sep 2026 00:00:00 GMT</pubDate>
    <title>Neighborhood Nights 2026 (Thursday, September 24, 2026)</title>
    <description><![CDATA[<p>Join us <strong>again</strong></p>]]></description>
    <link>https://dankhaus.com/event-6482571</link>
    <guid>https://dankhaus.com/event-6482571</guid>
  </item>
  <item>
    <pubDate>Mon, 31 Aug 2026 05:00:00 GMT</pubDate>
    <title>Exhibition | Ausstellung: Better than Sliced Bread (Monday, August 31, 2026)</title>
    <description>An exhibition</description>
    <link>https://dankhaus.com/event-6808398</link>
    <guid>https://dankhaus.com/event-6808398</guid>
  </item>
</channel></rss>`;

const item = (over: Partial<ReturnType<typeof parseRss>[0]> = {}) => ({
  title: "Blutspende | Blood Drive (Saturday, September 19, 2026)",
  link: "https://dankhaus.com/event-6808373",
  guid: "https://dankhaus.com/event-6808373",
  description: "Give blood",
  pubDate: "Sat, 19 Sep 2026 14:30:00 GMT",
  ...over,
});

describe("parseTitleDate", () => {
  test("strips the trailing date and returns it as ISO", () => {
    const { clean, date } = parseTitleDate("Neighborhood Nights 2026 (Thursday, September 10, 2026)");
    expect(clean).toBe("Neighborhood Nights 2026");
    expect(date).toBe("2026-09-10");
  });

  test("handles a title with no weekday", () => {
    expect(parseTitleDate("Oktoberfest (September 19, 2026)").date).toBe("2026-09-19");
  });

  test("leaves a title without a date suffix untouched", () => {
    const { clean, date } = parseTitleDate("Oktoberfest 2026");
    expect(clean).toBe("Oktoberfest 2026");
    expect(date).toBe("");
  });

  test("does not eat a legitimate trailing parenthetical", () => {
    const { clean, date } = parseTitleDate("German Class (Beginners)");
    expect(clean).toBe("German Class (Beginners)");
    expect(date).toBe("");
  });

  test("keeps a year in the title itself, only stripping the suffix", () => {
    expect(parseTitleDate("DANK Haus Oktoberfest 2026 (Saturday, September 19, 2026)").clean)
      .toBe("DANK Haus Oktoberfest 2026");
  });
});

describe("parseRss", () => {
  test("extracts every item", () => {
    expect(parseRss(LIVE_XML)).toHaveLength(3);
  });

  test("decodes entity-escaped and CDATA descriptions alike", () => {
    const items = parseRss(LIVE_XML);
    expect(items[0].description).toContain("<p>Join us</p>");
    expect(items[1].description).toContain("<strong>again</strong>");
  });

  test("returns nothing for a page that is not RSS", () => {
    expect(parseRss("<!DOCTYPE html><html><body>nope</body></html>")).toEqual([]);
  });
});

describe("mapRssItem", () => {
  test("reads pubDate as the event start, converted to Chicago time", () => {
    // Sep 11 00:00 UTC is Sep 10, 7:00 PM in Chicago (CDT).
    const ev = mapRssItem(item({
      title: "Neighborhood Nights 2026 (Thursday, September 10, 2026)",
      pubDate: "Fri, 11 Sep 2026 00:00:00 GMT",
    }), SOURCE);
    expect(ev.start).toEqual({ dateTime: "2026-09-10T19:00:00" });
  });

  test("never invents an end time", () => {
    expect(mapRssItem(item(), SOURCE).end).toBeUndefined();
  });

  test("treats local midnight as an all-day event", () => {
    // Aug 31 05:00 UTC is Aug 31 00:00 in Chicago.
    const ev = mapRssItem(item({
      title: "Exhibition (Monday, August 31, 2026)",
      pubDate: "Mon, 31 Aug 2026 05:00:00 GMT",
    }), SOURCE);
    expect(ev.start).toEqual({ date: "2026-08-31" });
  });

  test("gives each occurrence of a recurring series its own id", () => {
    const evs = parseRss(LIVE_XML).map(i => mapRssItem(i, SOURCE));
    // First two share a guid and link; only the date separates them.
    expect(evs[0].id).not.toBe(evs[1].id);
    expect(evs[0].id).toContain("2026-09-10");
    expect(evs[1].id).toContain("2026-09-24");
  });

  test("namespaces ids so they cannot collide with ICS or Squarespace", () => {
    expect(mapRssItem(item(), SOURCE).id).toStartWith("rss:https://www.dankhaus.com:");
  });

  test("falls back to the title's date when pubDate disagrees with it", () => {
    // A feed where pubDate really is the publication date: trusting it would
    // put the event on the wrong day, so the title wins and the time is dropped.
    const ev = mapRssItem(item({
      title: "Blood Drive (Saturday, September 19, 2026)",
      pubDate: "Mon, 01 Jun 2026 09:00:00 GMT",
    }), SOURCE);
    expect(ev.start).toEqual({ date: "2026-09-19" });
  });

  test("uses the title date when pubDate is missing entirely", () => {
    const ev = mapRssItem(item({ pubDate: "" }), SOURCE);
    expect(ev.start).toEqual({ date: "2026-09-19" });
  });

  test("skips an item with no usable date at all", () => {
    expect(mapRssItem(item({ title: "Mystery Event", pubDate: "" }), SOURCE)).toBeNull();
  });

  test("cleans the date suffix off the displayed title", () => {
    expect(mapRssItem(item(), SOURCE).summary).toBe("Blutspende | Blood Drive");
  });

  test("flattens the HTML description to plain text", () => {
    const ev = mapRssItem(item({ description: "<p>Give <strong>blood</strong></p><p>2nd floor</p>" }), SOURCE);
    // Each closing </p> yields one newline — the same flattening the
    // Squarespace connector has always used, now shared via lib/html.ts.
    expect(ev.description).toBe("Give blood\n2nd floor");
  });

  test("carries the source name through as the organizer", () => {
    expect(mapRssItem(item(), SOURCE).organizer).toEqual({ displayName: "DANK Haus" });
  });

  test("leaves location blank rather than guessing — the feed has none", () => {
    expect(mapRssItem(item(), SOURCE).location).toBe("");
  });

  test("links to the event page", () => {
    expect(mapRssItem(item(), SOURCE).htmlLink).toBe("https://dankhaus.com/event-6808373");
  });
});
