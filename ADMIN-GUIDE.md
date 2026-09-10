# Category Admin Guide

This page explains how to manage the calendar's event categories — what they do, how to edit them, and how to write good keyword rules so events get sorted automatically.

---

## Accessing the admin page

Go to:

```
https://your-calendar-url.com/admincat
```

(Locally: `http://localhost:4200/admincat`)

There's no login on this page currently — anyone with the URL can edit categories. Don't share the `/admincat` link publicly; only use it yourself or share with trusted co-admins.

You can get back to the calendar anytime with the **← Calendar** link in the top-left.

---

## What a category controls

Every event pulled from the Google Calendar feeds gets automatically sorted into one category, based on keyword matching against the event **title**. That category controls:

- Which colored card/group it shows up in on the homepage
- The icon and color shown next to the event
- Whether it's grouped under **"Your Government"** or **"Your Community"**
- Whether it appears as one of the filter buttons above the event list
- The icon/color/label shown on its card when it turns up in **search results**

---

## The fields, explained

| Field | What it does |
|---|---|
| **Order (▲▼)** | Controls the left-to-right / top-to-bottom order categories appear in on the homepage and filter bar. |
| **Key** | Internal ID for the category. Auto-generated from the label for new categories — you can't edit it for existing ones (changing it would break historical event data). |
| **Icon** | The emoji shown next to the category name. Click into the box and paste/type any emoji. |
| **Color** | Used for the colored left-border on cards, filter button highlight, and badge colors. Use the color swatch or type a hex code directly. |
| **Label** | The human-readable name shown everywhere (card headers, filter buttons, badges). |
| **Hex** | Same value as Color, shown as text — handy for copy/pasting an exact brand color. |
| **Group** | Either **Your Government** or **Your Community** — determines which section of the homepage the category's cards appear under. |
| **Keywords** | The list of words/phrases used to auto-match events into this category (see below). |

---

## Adding a category

1. Click **+ Add Category** (top right)
2. A new row appears just above "Other" with default placeholder values
3. Fill in label, icon, color, group, and keywords
4. Click **Save Changes**

The category's key is generated automatically from the label when you save (lowercased, spaces → underscores).

## Editing a category

Just click into any field and change it. Changes aren't saved until you click **Save Changes** — you'll see an "unsaved changes" badge in the header as a reminder.

## Deleting a category

Click the 🗑 trash icon on that row. Note: any events currently matching that category's keywords will automatically fall into **Other** once the category is gone — they aren't deleted, just re-sorted on the next calendar refresh.

## Reordering categories

Use the ▲ / ▼ arrows on the left of each row. The **Other** category is always locked to the bottom — it's the catch-all for events that don't match anything else, so it doesn't get keywords and can't be reordered or deleted.

## Group preview

At the bottom of the page, you'll see a live preview of which categories are currently assigned to "Your Government" vs "Your Community" — useful for sanity-checking your group assignments before saving.

---

## Writing good keywords

Keywords are how the system decides which category an event belongs to. Here's how matching works and how to get it right:

### The basics
- Each keyword is checked against the event **title** first. If nothing matches the title, multi-word keyword phrases (like "american blues theater") are also checked against the event **description** as a fallback — single-word keywords and keywords using regex wildcards are never checked against the description, only titles (see "A note on description matching" below)
- Matching is **case-insensitive** — `Ward Night` and `ward night` behave the same
- If **any** keyword in the list matches, the event goes into that category
- Categories are checked in the order they appear on the admin page — if an event could match two categories, the one listed higher wins. Order your most specific/important categories first.

### Adding a keyword
Type it into the keyword box and press **Enter** or **,** (comma) to add it as a tag. Click the **×** on a tag to remove it.

### Simple word matches
Most keywords are just plain words or short phrases:
```
farmer's market
food distribution
cooking class
```
These match anywhere in the title — `"North Side Farmer's Market Kickoff"` matches `farmer's market`.

### Regex tips (optional, for power users)
Keywords actually support regex syntax, so you can get more precise if needed:

| Pattern | Matches | Use case |
|---|---|---|
| `.*` | any characters | `community.*budget` matches "Community FY26 Budget Town Hall" |
| `\b` | word boundary | `\bart\b` matches "Art Fair" but *not* "Smart Home Workshop" |
| `(a\|b)` | either option | `ald(er)?.*person` matches "Ald Person" or "Alderperson" |
| `.?` | optional single character | `e.?bike` matches "ebike" or "e-bike" or "e bike" |
| `[0-9]` | any digit | `q[0-9]` matches "Q1", "Q2", etc. |
| `^` | must start with | `^community` only matches titles that *begin* with "Community" |

You don't need to use regex — plain phrases work great for 90% of categories. Reach for regex only when:
- A word has multiple common spellings/spacings (`e-bike` vs `ebike`)
- You want to avoid false positives (`\bart\b` avoids matching "Smart", "Start", etc.)
- You want to combine a few variations into one rule instead of ten separate keywords

### Avoiding false matches
Be careful with very short or common keywords — `"art"` alone will match "Smart Home Workshop," "Start of Summer," etc. Use `\bart\b` (word-boundary) instead of bare `art` when the word is short and common.

### Testing your keywords
After saving, go back to the homepage and refresh (🔄 icon, top right). Check that:
- New events show up under the category you expect
- No unrelated events accidentally got swept in
- Nothing that should match is landing in **Other**

If something's miscategorized, tweak the keyword list and save again — no need to touch code.

---

## Example: the new "Ainslie Arts Plaza" category

As a reference, here's how a venue-specific category was set up:

```
Label:    Ainslie Arts Plaza
Icon:     🎪
Color:    #c026d3
Group:    Your Community
Keywords: ainslie arts plaza
          ainslie plaza
          ainslie arts
          plaza.*ainslie
          \bainslie\b
```

The last keyword (`\bainslie\b`) is a catch-all safety net — it matches any event title containing the standalone word "Ainslie," even if it's phrased differently than the other rules expect.

---

## A note on description matching

If no keyword matches an event's title, the system also checks the event's **description** — but only for keywords that are:
- **Multi-word phrases** (contain a space), like `american blues theater` or `elderberry social club`
- **Plain text** with no regex wildcards (`.*`, `.?`, `^`, etc.)

Single words are deliberately excluded from description matching, even if they'd otherwise be safe-looking. A word like `groundbreaking` is precise when it appears in a short event *title* (almost certainly an actual groundbreaking ceremony), but in a full paragraph *description* it might just be an adjective ("a groundbreaking new musical") with nothing to do with the category. Multi-word phrases don't have this problem — they're specific enough to safely match against long-form text.

**Practical implication:** if an event keeps landing in Other despite an obviously-relevant single word appearing only in its description, don't widen that keyword — instead add the event's specific title (or another multi-word phrase unique to it) as its own keyword. This is the same fix used for one-off events like specific play titles.

## Questions or issues

If categories aren't loading, events aren't refreshing, or the admin page looks broken, that's likely a hosting/server issue rather than something fixable from this page — reach out to whoever manages the deployment.

---

## Current categories (for reference)

As of this writing there are 15 categories, in display order: Ward Office, Zoning & Development, Public Safety, Community Events, Environment & Parks, Arts & Culture, Health & Wellness, Education & Learning, Immigration & Rights, Food & Markets, Celebrations & Holidays, Social & Gatherings, Housing & Property, Ainslie Arts Plaza, and the catch-all Other. This list will drift as categories are added/edited/removed from `/admincat` — the admin page is always the source of truth, not this document.
