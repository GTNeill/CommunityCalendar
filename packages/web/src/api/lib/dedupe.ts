// ── Cross-source event de-duplication ────────────────────────────────────────
//
// The calendar aggregates several organizations whose service areas overlap,
// so the same real-world event is frequently published by more than one of
// them (and sometimes twice by the ward itself, on both the "Events" and
// "Community" calendars). Each source mints its own UID, so the exact-id
// check that fetchICalEvents used to do never fires across sources.
//
// The hard constraint here is asymmetric: **hiding a real event is much worse
// than showing a duplicate.** Real data from the live feeds shows why naive
// fuzzy matching is dangerous — these two are 0.98 similar by character ratio
// and are genuinely different events:
//
//   "Creative Movement Class for Kids (Ages 5-7) ... " 16:00
//   "Creative Movement Class for Kids (Ages 7-10) ..." 17:00
//
// while these two are a true duplicate across two calendars:
//
//   [40th Ward Events]    "Bike the Drive" 2026-09-06T06:00 @ Ainslie Arts Plaza
//   [40th Ward Community] "Bike the Drive" 2026-09-06T06:00 @ Ainslie Arts Plaza
//
// So we deliberately do NOT use similarity ratios. Matching is exact on a
// normalized title within a single day, and then gated a second time on
// whether the times and locations can actually describe one event. Anything
// that survives both gates is a duplicate; anything ambiguous is kept.

/** Two events whose starts differ by more than this are separate sessions. */
export const START_TOLERANCE_MIN = 30;

const ENTITIES: Record<string, string> = {
  "&amp;": "&", "&nbsp;": " ", "&quot;": '"', "&#39;": "'",
  "&apos;": "'", "&ndash;": "-", "&mdash;": "-", "&rsquo;": "'", "&lsquo;": "'",
};

function decodeEntities(s: string): string {
  return s.replace(/&[a-z#0-9]+;/gi, m => ENTITIES[m.toLowerCase()] ?? m);
}

/**
 * Collapse a title to a comparable form.
 *
 * Digits are deliberately PRESERVED — "(ages 5-7)" vs "(ages 7-10)" is the
 * only thing distinguishing two real, different classes in the live feeds.
 */
export function normalizeTitle(raw: string): string {
  let t = decodeEntities(raw ?? "").toLowerCase();

  // Unicode punctuation → ASCII, so sources that curl their quotes/dashes
  // still compare equal to sources that don't.
  t = t.replace(/[‐-―−]/g, "-").replace(/[‘’]/g, "'").replace(/[“”]/g, '"');

  // Trailing publisher noise. Each of these is a separator convention rather
  // than part of the event name:
  //   "Creative Movement ... :: September - November 2026"
  //   "Fall Fest | Heart of Lincoln Square"
  //   "Open House (Presented by the Chamber)"
  t = t.replace(/\s*::.*$/, "");
  t = t.replace(/\s*\|.*$/, "");
  t = t.replace(/\s*[-–—]?\s*\(?\s*(presented|hosted|sponsored|organized)\s+by\b[^)]*\)?\s*$/i, "");

  // Leading "[Org]" / "Org:" tags.
  t = t.replace(/^\s*\[[^\]]{1,40}\]\s*/, "");
  t = t.replace(/^\s*[a-z0-9 .'&-]{2,40}:\s+/, m =>
    // Only strip when it reads like an org tag, not "Q&A: ..." style titles
    // that would leave nothing meaningful behind.
    m.trim().length < raw.length / 2 ? "" : m);

  // Drop everything that isn't a word character or space. Keeps digits.
  t = t.replace(/[^a-z0-9 ]+/g, " ");

  // Leading article carries no meaning for matching.
  t = t.replace(/^(the|a|an)\s+/, "");

  return t.replace(/\s+/g, " ").trim();
}

/** Compare locations loosely: city/state/zip tails and punctuation are noise. */
export function normalizeLocation(raw: string): string {
  let l = decodeEntities(raw ?? "").toLowerCase();
  l = l.replace(/[^a-z0-9 ]+/g, " ");
  l = l.replace(/\b(chicago|illinois|il|usa|united states)\b/g, " ");
  l = l.replace(/\b\d{5}(\d{4})?\b/g, " ");
  l = l.replace(/\b(street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|north|south|east|west|n|s|e|w)\b/g, " ");
  return l.replace(/\s+/g, " ").trim();
}

/**
 * Locations are "compatible" when they could describe the same place.
 * An empty location is compatible with anything — plenty of sources simply
 * omit it, and absence is not evidence of a different venue.
 */
export function locationsCompatible(a: string, b: string): boolean {
  const x = normalizeLocation(a);
  const y = normalizeLocation(b);
  if (!x || !y) return true;
  if (x === y) return true;
  // One venue string containing the other ("Sulzer Regional Library" vs
  // "Sulzer Regional Library, 4455 N Lincoln") is the same venue.
  if (x.includes(y) || y.includes(x)) return true;
  // Otherwise require a meaningful shared token run.
  const xs = new Set(x.split(" ").filter(w => w.length > 3));
  const ys = y.split(" ").filter(w => w.length > 3);
  if (xs.size === 0 || ys.length === 0) return true;
  const shared = ys.filter(w => xs.has(w)).length;
  return shared >= Math.min(2, Math.min(xs.size, ys.length));
}

export interface RawEventLike {
  id: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  location?: string;
  description?: string;
  organizer?: { displayName?: string; email?: string };
  status?: string;
  htmlLink?: string;
  /** Lower is more authoritative. Assigned by the fetch layer, by source order. */
  _rank?: number;
}

function startStr(ev: RawEventLike): string {
  return ev.start?.dateTime ?? ev.start?.date ?? "";
}

function dayOf(ev: RawEventLike): string {
  return startStr(ev).slice(0, 10);
}

function isAllDay(ev: RawEventLike): boolean {
  return !ev.start?.dateTime;
}

function startMinutes(ev: RawEventLike): number | null {
  const s = ev.start?.dateTime;
  if (!s) return null;
  const t = new Date(s).getTime();
  return Number.isFinite(t) ? t / 60000 : null;
}

function tokens(t: string): string[] {
  return t.split(" ").filter(Boolean);
}

/**
 * Would these two titles, already known to fall on the same day, refer to the
 * same event? Exact normalized equality, or one being a strict token subset
 * of the other (which covers "Bike the Drive" vs "Bike the Drive 2026" and
 * org-suffixed variants that survived normalization).
 *
 * Subset matching is only offered to the caller as the weaker tier — it is
 * gated on an exact start-time match below.
 */
function titleRelation(a: string, b: string): "equal" | "subset" | "none" {
  if (a === b) return "equal";
  const ta = tokens(a);
  const tb = tokens(b);
  const [short, long] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  if (short.length < 2) return "none";
  const set = new Set(long);
  return short.every(w => set.has(w)) ? "subset" : "none";
}

/**
 * The core decision. Returns true only when both the title gate and the
 * time/place gate agree.
 */
export function isDuplicate(a: RawEventLike, b: RawEventLike): boolean {
  if (dayOf(a) !== dayOf(b) || !dayOf(a)) return false;

  const rel = titleRelation(normalizeTitle(a.summary ?? ""), normalizeTitle(b.summary ?? ""));
  if (rel === "none") return false;

  const ma = startMinutes(a);
  const mb = startMinutes(b);

  // One source lists it as an all-day entry, the other with real times. Same
  // day + same title is enough; nobody publishes an all-day placeholder and a
  // distinct timed event under one name on one day.
  if (ma === null || mb === null) return isAllDay(a) !== isAllDay(b) || rel === "equal";

  const delta = Math.abs(ma - mb);

  // Identical start is the strongest signal available and is the only tier a
  // subset title match is allowed to use.
  if (delta === 0) return locationsCompatible(a.location ?? "", b.location ?? "");
  if (rel === "subset") return false;

  // Near-but-not-equal starts are the genuinely ambiguous case: it is either
  // two sources rounding differently, or two real sessions. Require the
  // venue to corroborate before collapsing them.
  if (delta <= START_TOLERANCE_MIN) {
    const la = normalizeLocation(a.location ?? "");
    const lb = normalizeLocation(b.location ?? "");
    // Both blank tells us nothing, and "same title, 30 min apart, no venue
    // on either" is exactly how a two-session day looks. Keep both.
    if (!la && !lb) return false;
    return locationsCompatible(a.location ?? "", b.location ?? "");
  }

  return false;
}

/** How much usable information a record carries, used to pick the survivor. */
function richness(ev: RawEventLike): number {
  let n = 0;
  if ((ev.description ?? "").trim()) n += 2;
  if ((ev.location ?? "").trim()) n += 2;
  if ((ev.htmlLink ?? "").trim()) n += 1;
  if (ev.end?.dateTime || ev.end?.date) n += 1;
  if (!isAllDay(ev)) n += 1;   // a timed record beats an all-day one
  return n;
}

function isCancelled(ev: RawEventLike): boolean {
  return (ev.status ?? "").toUpperCase() === "CANCELLED";
}

function sourceName(ev: RawEventLike): string {
  return ev.organizer?.displayName ?? ev.organizer?.email ?? "";
}

export interface DedupeCluster {
  /** id of the record that was kept. */
  keptId: string;
  title: string;
  start: string;
  /** The records that were dropped, for the diagnostics endpoint. */
  dropped: { id: string; source: string; title: string; start: string }[];
}

export interface DedupeResult<T> {
  events: T[];
  clusters: DedupeCluster[];
}

/**
 * Collapse duplicates across all sources.
 *
 * Events are bucketed by day first, so this is O(n · k²) in the number of
 * events sharing a day rather than O(n²) overall. Within a bucket we grow
 * clusters transitively: if A matches B and B matches C, all three collapse,
 * which is what you want when three orgs list one event with slightly
 * different titles.
 */
export function dedupeEvents<T extends RawEventLike>(events: T[]): DedupeResult<T> {
  // An exact id collision is still possible within one feed (and is what the
  // old filter caught), so clear those out first and for free.
  const byId = new Set<string>();
  const input: T[] = [];
  for (const ev of events) {
    if (byId.has(ev.id)) continue;
    byId.add(ev.id);
    input.push(ev);
  }

  const buckets = new Map<string, T[]>();
  const undated: T[] = [];
  for (const ev of input) {
    const d = dayOf(ev);
    if (!d) { undated.push(ev); continue; }
    if (!buckets.has(d)) buckets.set(d, []);
    buckets.get(d)!.push(ev);
  }

  const out: T[] = [...undated];
  const clusters: DedupeCluster[] = [];

  for (const bucket of buckets.values()) {
    const groups: T[][] = [];

    for (const ev of bucket) {
      // Transitive: join the first group containing any matching member.
      const target = groups.find(g => g.some(member => isDuplicate(member, ev)));
      if (target) target.push(ev);
      else groups.push([ev]);
    }

    for (const group of groups) {
      if (group.length === 1) { out.push(group[0]); continue; }

      // Survivor: a live record beats a cancelled one; then the most
      // authoritative source; then the most complete record.
      const sorted = [...group].sort((a, b) => {
        const ca = isCancelled(a) ? 1 : 0;
        const cb = isCancelled(b) ? 1 : 0;
        if (ca !== cb) return ca - cb;
        const ra = a._rank ?? 999;
        const rb = b._rank ?? 999;
        if (ra !== rb) return ra - rb;
        return richness(b) - richness(a);
      });

      const [primary, ...dropped] = sorted;

      // Backfill anything the survivor is missing from the records it
      // replaces, so collapsing never loses information.
      const merged: T = { ...primary };
      for (const d of dropped) {
        if (!(merged.location ?? "").trim() && (d.location ?? "").trim()) merged.location = d.location;
        if (!(merged.description ?? "").trim() && (d.description ?? "").trim()) merged.description = d.description;
        if (!(merged.htmlLink ?? "").trim() && (d.htmlLink ?? "").trim()) merged.htmlLink = d.htmlLink;
      }

      // Credit every organization that published it, primary first, so the
      // UI can say "also listed by ...".
      const names: string[] = [];
      for (const ev of sorted) {
        const n = sourceName(ev);
        if (n && !names.includes(n)) names.push(n);
      }
      (merged as any).sources = names;
      (merged as any).duplicateCount = group.length;

      out.push(merged);
      clusters.push({
        keptId: primary.id,
        title: primary.summary ?? "",
        start: startStr(primary),
        dropped: dropped.map(d => ({
          id: d.id,
          source: sourceName(d),
          title: d.summary ?? "",
          start: startStr(d),
        })),
      });
    }
  }

  return { events: out, clusters };
}
