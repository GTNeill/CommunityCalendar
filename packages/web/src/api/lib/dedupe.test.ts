// Run: bun test packages/web/src/api/lib/dedupe.test.ts
//
// The cases below are taken from real 40th Ward feed data, including the
// near-miss pairs that a similarity-ratio matcher gets wrong.

import { describe, expect, test } from "bun:test";
import { dedupeEvents, isDuplicate, normalizeTitle, locationsCompatible } from "./dedupe";

const ev = (o: Partial<any> & { id: string }) => ({
  summary: "",
  start: {},
  end: {},
  location: "",
  description: "",
  organizer: { displayName: "src" },
  status: "CONFIRMED",
  htmlLink: "",
  ...o,
});

const timed = (id: string, title: string, start: string, opts: Partial<any> = {}) =>
  ev({
    id,
    summary: title,
    start: { dateTime: start },
    end: { dateTime: start },
    ...opts,
  });

describe("normalizeTitle", () => {
  test("keeps digits that distinguish real events", () => {
    expect(normalizeTitle("Creative Movement (Ages 5-7)"))
      .not.toBe(normalizeTitle("Creative Movement (Ages 7-10)"));
  });

  test("strips the :: publisher suffix", () => {
    expect(normalizeTitle("Yoga :: September - November 2026")).toBe("yoga");
  });

  test("strips a trailing | org tag", () => {
    expect(normalizeTitle("Fall Fest | Heart of Lincoln Square")).toBe("fall fest");
  });

  test("strips 'presented by'", () => {
    expect(normalizeTitle("Open House (Presented by the Chamber)")).toBe("open house");
  });

  test("normalizes entities, curly punctuation and articles", () => {
    expect(normalizeTitle("The Kids &amp; Family Day")).toBe("kids family day");
    expect(normalizeTitle("Movie Night – Outdoors")).toBe("movie night outdoors");
  });
});

describe("locationsCompatible", () => {
  test("blank matches anything", () => {
    expect(locationsCompatible("", "Sulzer Regional Library")).toBe(true);
  });
  test("one containing the other is the same venue", () => {
    expect(locationsCompatible("Sulzer Regional Library", "Sulzer Regional Library, 4455 N Lincoln Ave, Chicago IL 60625")).toBe(true);
  });
  test("clearly different venues do not match", () => {
    expect(locationsCompatible("Sulzer Regional Library", "Welles Park Fieldhouse")).toBe(false);
  });
});

describe("isDuplicate — true positives from live data", () => {
  test("same event on both ward calendars", () => {
    const a = timed("a", "Bike the Drive", "2026-09-06T06:00:00", { location: "Ainslie Arts Plaza" });
    const b = timed("b", "Bike the Drive", "2026-09-06T06:00:00", { location: "Ainslie Arts Plaza" });
    expect(isDuplicate(a, b)).toBe(true);
  });

  test("same event, one source omits the venue", () => {
    const a = timed("a", "Building Resilient Neighborhoods in a Changing Climate", "2026-09-02T18:00:00", { location: "Sulzer Regional Library" });
    const b = timed("b", "Building Resilient Neighborhoods in a Changing Climate", "2026-09-02T18:00:00", { location: "" });
    expect(isDuplicate(a, b)).toBe(true);
  });

  test("token-subset title at an identical start", () => {
    const a = timed("a", "Bike the Drive", "2026-09-06T06:00:00");
    const b = timed("b", "Bike the Drive 2026", "2026-09-06T06:00:00");
    expect(isDuplicate(a, b)).toBe(true);
  });

  test("all-day listing vs timed listing on the same day", () => {
    const a = ev({ id: "a", summary: "Ward Night", start: { date: "2026-09-10" }, end: { date: "2026-09-10" } });
    const b = timed("b", "Ward Night", "2026-09-10T18:00:00");
    expect(isDuplicate(a, b)).toBe(true);
  });

  test("15 minutes apart at the same venue is one event rounded differently", () => {
    const a = timed("a", "Farmers Market", "2026-09-12T09:00:00", { location: "Lincoln Square Plaza" });
    const b = timed("b", "Farmers Market", "2026-09-12T09:15:00", { location: "Lincoln Square Plaza" });
    expect(isDuplicate(a, b)).toBe(true);
  });
});

describe("isDuplicate — the false positives that matter", () => {
  test("different age groups at different times are different classes", () => {
    const a = timed("a", "Creative Movement Class for Kids (Ages 5-7) at Indian Boundary Cultural Center :: September - November 2026", "2026-09-11T16:00:00", { location: "Indian Boundary Park Cultural Center" });
    const b = timed("b", "Creative Movement Class for Kids (Ages 7-10) at Indian Boundary Cultural Center :: September - November 2026", "2026-09-11T17:00:00", { location: "Indian Boundary Park Cultural Center" });
    expect(isDuplicate(a, b)).toBe(false);
  });

  test("two yard sales on one day are not one yard sale", () => {
    const a = timed("a", "WANT Block Club's Annual Neighborhood Yard Sale", "2026-09-19T09:00:00");
    const b = timed("b", "Lakewood Balmoral Annual Yard Sale", "2026-09-19T09:00:00");
    expect(isDuplicate(a, b)).toBe(false);
  });

  test("same title twice in one day is two sessions, not a duplicate", () => {
    const a = timed("a", "Story Time", "2026-09-15T10:00:00", { location: "Sulzer Regional Library" });
    const b = timed("b", "Story Time", "2026-09-15T14:00:00", { location: "Sulzer Regional Library" });
    expect(isDuplicate(a, b)).toBe(false);
  });

  test("near-identical starts with no venue on either side stays split", () => {
    const a = timed("a", "Open Gym", "2026-09-15T10:00:00");
    const b = timed("b", "Open Gym", "2026-09-15T10:20:00");
    expect(isDuplicate(a, b)).toBe(false);
  });

  test("same title, same time, clearly different venues", () => {
    const a = timed("a", "Coffee with the Alderman", "2026-09-15T10:00:00", { location: "Sulzer Regional Library" });
    const b = timed("b", "Coffee with the Alderman", "2026-09-15T10:00:00", { location: "Welles Park Fieldhouse" });
    expect(isDuplicate(a, b)).toBe(false);
  });

  test("same title on different days", () => {
    const a = timed("a", "Farmers Market", "2026-09-12T09:00:00");
    const b = timed("b", "Farmers Market", "2026-09-19T09:00:00");
    expect(isDuplicate(a, b)).toBe(false);
  });

  test("a token subset is not enough when the times differ", () => {
    const a = timed("a", "Yoga", "2026-09-12T09:00:00", { location: "Welles Park" });
    const b = timed("b", "Yoga for Seniors", "2026-09-12T09:20:00", { location: "Welles Park" });
    expect(isDuplicate(a, b)).toBe(false);
  });
});

describe("dedupeEvents", () => {
  test("keeps the higher-ranked source and credits both", () => {
    const a = timed("a", "Bike the Drive", "2026-09-06T06:00:00", {
      organizer: { displayName: "40th Ward Events" }, _rank: 0, location: "Ainslie Arts Plaza",
    });
    const b = timed("b", "Bike the Drive", "2026-09-06T06:00:00", {
      organizer: { displayName: "40th Ward Community" }, _rank: 1, location: "Ainslie Arts Plaza",
    });
    const { events, clusters } = dedupeEvents([b, a]);
    expect(events).toHaveLength(1);
    expect(events[0].id).toBe("a");
    expect((events[0] as any).sources).toEqual(["40th Ward Events", "40th Ward Community"]);
    expect((events[0] as any).duplicateCount).toBe(2);
    expect(clusters[0].dropped[0].id).toBe("b");
  });

  test("backfills fields the survivor is missing", () => {
    const a = timed("a", "Bike the Drive", "2026-09-06T06:00:00", { _rank: 0, location: "", description: "" });
    const b = timed("b", "Bike the Drive", "2026-09-06T06:00:00", {
      _rank: 1, location: "Ainslie Arts Plaza", description: "Ride the lakefront", htmlLink: "https://x.test",
    });
    const { events } = dedupeEvents([a, b]);
    expect(events).toHaveLength(1);
    expect(events[0].id).toBe("a");
    expect(events[0].location).toBe("Ainslie Arts Plaza");
    expect(events[0].description).toBe("Ride the lakefront");
    expect(events[0].htmlLink).toBe("https://x.test");
  });

  test("a live record outranks a cancelled one regardless of source", () => {
    const a = timed("a", "Ward Night", "2026-09-10T18:00:00", { _rank: 0, status: "CANCELLED" });
    const b = timed("b", "Ward Night", "2026-09-10T18:00:00", { _rank: 9, status: "CONFIRMED" });
    const { events } = dedupeEvents([a, b]);
    expect(events).toHaveLength(1);
    expect(events[0].id).toBe("b");
  });

  test("collapses transitively across three orgs", () => {
    const a = timed("a", "Fall Fest", "2026-09-20T12:00:00", { _rank: 0, location: "Giddings Plaza" });
    const b = timed("b", "Fall Fest", "2026-09-20T12:00:00", { _rank: 1, location: "" });
    const c = timed("c", "Fall Fest 2026", "2026-09-20T12:00:00", { _rank: 2, location: "Giddings Plaza" });
    const { events } = dedupeEvents([a, b, c]);
    expect(events).toHaveLength(1);
    expect((events[0] as any).duplicateCount).toBe(3);
  });

  test("still removes exact id collisions", () => {
    const a = timed("dup", "X", "2026-09-20T12:00:00");
    const b = timed("dup", "X", "2026-09-20T12:00:00");
    expect(dedupeEvents([a, b]).events).toHaveLength(1);
  });

  test("leaves untouched events with no sources array", () => {
    const a = timed("a", "Solo Event", "2026-09-20T12:00:00");
    const { events, clusters } = dedupeEvents([a]);
    expect(clusters).toHaveLength(0);
    expect((events[0] as any).sources).toBeUndefined();
  });
});
