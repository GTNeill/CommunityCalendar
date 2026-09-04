# Community Calendar — Design System

_Last synced with the live app: reflects the actual theme, categories, and components in production._

## Brand
- App name: **40th Ward Community Events Calendar**
- Audience: public-facing, ward residents
- Vibe: matches 40thward.org — clean civic/editorial, light by default, dark mode available
- Alderperson: Andre Vasquez

## Colors

Two theme modes, toggled via the header sun/moon button (light is default).

**Light mode**
```
bg:            #fffbf4   (cream page background)
bg-header:     #fffbf4f5 (translucent, blurred sticky header)
surface:       #ffffff   (cards, panels, inputs)
border:        #c8dde1
text-primary:  #0b3e4a   (deep teal)
text-muted:    #0b3e4a99
text-faint:    #0b3e4a44
accent (red):  #CF2C28   (top bar, badges, error states, save button)
teal:          #147671   (active controls, tabs, links, primary actions)
row-hover:     #f0fafb
event-border:  #c8e4e8
popup-bg:      #ffffff
popup-border:  #8ab8c0
```

**Dark mode**
```
bg:            #0b2a33
bg-header:     #0b2a33ee
surface:       #0d3340
border:        #1a4a58
text-primary:  #fffbf4
text-muted:    #8ab8c0
text-faint:    #2a5060
accent (red):  #CF2C28   (same red across both modes)
teal:          #147671   (same teal across both modes)
row-hover:     #0f3d4d
event-border:  #1c4a5a
popup-bg:      #0a2530
popup-border:  #2a6070
```

## Category Colors (current 15 categories, in display order)

| # | Key | Label | Icon | Color | Group |
|---|---|---|---|---|---|
| 0 | ward | Ward Office | 🏛️ | `#CF2C28` | Government |
| 1 | zoning | Zoning & Development | 🏗️ | `#e07b39` | Government |
| 2 | publicSafety | Public Safety | 🚔 | `#1a6fbf` | Community |
| 3 | community | Community Events | 🤝 | `#147671` | Community |
| 4 | environment | Environment & Parks | 🌿 | `#2d8a4e` | Community |
| 5 | arts | Arts & Culture | 🎭 | `#7c3d9e` | Community |
| 6 | health | Health & Wellness | 🩺 | `#1a9e72` | Community |
| 7 | education | Education & Learning | 🎓 | `#3b6dbf` | Community |
| 8 | immigration | Immigration & Rights | 🌐 | `#d47a1e` | Government |
| 9 | food | Food & Markets | 🍎 | `#c44e2a` | Community |
| 10 | celebrations | Celebrations & Holidays | 🎊 | `#d4a017` | Community |
| 11 | social | Social & Gatherings | 🎉 | `#b03070` | Community |
| 12 | housing | Housing & Property | 🏠 | `#5c7a3e` | Government |
| 13 | ainslieArts | Ainslie Arts Plaza | 🎪 | `#c026d3` | Community |
| 14 | other | Other (catch-all) | 📌 | `#5A5A5A` | Community |

Categories are fully editable at `/admincat` — this table reflects current data, not hardcoded design. See `ADMIN-GUIDE.md`.

## Typography
- Display/Headers: `'Anton', 'Arial Black', sans-serif` — app title "40th Ward"
- Body/UI: `'Public Sans', 'Arial', sans-serif` — everything else
- Monospace: used for category `key` fields in the admin page only
- Scale: ~0.6rem micro-labels → 0.72–0.85rem body/meta → 1rem–1.85rem headings

## Layout
- Max width: 1152px, centered
- Gutter: 48px sides, 40px top (main content)
- Card grid: `auto-fill, minmax(340px, 1fr)`, 12px gap
- Calendar/timeline view: month grid or week columns depending on selected unit

## Components

- **Header** (sticky, blurred backdrop): logo/title left; Week/Month toggle, Prev/Today/Next, Cards/Calendar tab switcher, Refresh (icon-only, tooltip), theme toggle (icon-only, tooltip) — right
- **Zoom slider**: vertical slider fixed to the top-right of the content area (below header, not part of it). 75%–150% range, scales all content text/layout via CSS `zoom`. Includes +/- buttons and a click-to-reset percentage label.
- **Search bar**: text input above the filter row. Searches title, location, description, and category label — scoped to whatever date range/view is currently loaded (not the whole calendar). Clearing it returns to the normal Cards/Calendar view.
- **Category Filter Bar**: pill buttons per category (icon + label), "All" resets. Tap to solo a category, tap more to add others, tap the same one again to remove it.
- **Category Card** (Cards view): white/dark surface, colored top accent + left border, header with icon + label, event rows below, past/future split with scroll for overflow.
- **Event Row** (compact, in Cards view): date badge (weekday/day-number/month, colored) + title/time/location. Hover reveals a floating Google Calendar–style popup (`pointer-events: none`, purely informational, not clickable).
- **Event Detail Card** (wide, in Search Results): same visual language as the hover popup but static, ~960px wide, clickable throughout — location links to Google Maps, description links are parsed and clickable (including unwrapping Google's redirect URLs), category badge, duration pill, and "Open in Google Calendar" link. Body content indents to align with the title, not the card edge.
- **Timeline/Calendar Grid**: month or week grid, events plotted by actual day/time, same floating popup on hover as Cards view.
- **TODAY badge**: colored per active category, uppercase, small pill.
- **Admin Category Manager** (`/admincat`): full CRUD table — reorder (▲▼), key/icon/color/label/hex/group fields, chip-style keyword editor, add/delete rows, live "Your Government" vs "Your Community" group preview, unsaved-changes indicator, save button.

## Motion
- Tab switch: instant (no transition currently)
- Card/row hover: background + border-color transition ~150–180ms, no transform
- Zoom slider: live CSS `zoom` update, no animation
- Auto-refresh: silent background refetch every 4 hours during daytime (6am–6pm); manual refresh always available

## UX Patterns
- Loading: skeleton shimmer (`SkeletonCards`, `SkeletonTimeline`)
- Error state: red banner with retry button if the calendar feed fails to load
- Empty state: "No events match the selected filters" / "No events match '<query>' in the current view"
- All interactive header controls have native `title` tooltips
- Times are always Central Time (America/Chicago), DST-aware automatically — no manual seasonal adjustment needed
- Accessibility: zoom slider for text/content scaling, in addition to standard browser zoom
