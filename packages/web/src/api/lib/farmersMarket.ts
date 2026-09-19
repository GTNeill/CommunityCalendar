// ── Chicago farmers markets, filtered to zip 60625 ───────────────────────────
//
// DCASE (the city's Dept. of Cultural Affairs & Special Events) publishes the
// season's full farmers-market schedule as a single flat HTML page — no
// .ics, no JSON, no RSS, nothing scrapable into structured events the way
// every other source in feeds.ts is. So unlike an ics/squarespace/rss feed,
// this isn't fetched at request time: it's a small hand-built .ics, checked
// once against https://www.chicago.gov/city/en/depts/dca/supp_info/farmers_market_schedule.html
// and against each market's street address to confirm it actually falls in
// 60625, then hardcoded here. It's parsed through the exact same parseICS()
// as every network feed (see index.ts), so recurrence/all-day/TZID handling
// is identical — it just has no URL to poll and nothing to fail to reach.
//
// Only three of the ~30 markets on that page sit inside 60625:
//   - Lincoln Square Farmers Market   — 2301 W. Leland Ave.
//   - Ravenswood Community Farmers Market — 4900 N. Damen Ave.
//   - North Park Community Market     — 5555 N. Kimball Ave.
// (Horner Park and Northcenter, both nearby, are 60618 and are deliberately
// left out.)
//
// One date is corrected from the source page: DCASE lists Ravenswood as
// "May 14 - October 14" under its "Wednesdays" heading, but May 14, 2026 is
// a Thursday while Oct 14, 2026 is a Wednesday — the end date lines up with
// the stated weekday and the start date doesn't, so this treats "May 14" as
// a typo for May 13 (the first actual Wednesday, matching how neighboring
// Wednesday markets on the same page open that season) rather than encode a
// recurring Wednesday market with a Thursday DTSTART.
//
// Update this file (and re-check addresses/dates against the DCASE page)
// each farmers-market season — the dates below are the published 2026 season.

export const FARMERS_MARKET_FEED_NAME = "Chicago Farmers Markets (60625)";
export const FARMERS_MARKET_PAGE_URL =
  "https://www.chicago.gov/city/en/depts/dca/supp_info/farmers_market_schedule.html";

const LINK_NOTE = "Accepts Link Match — SNAP benefits matched dollar-for-dollar, up to $25 per swipe.";

export const FARMERS_MARKET_ICS = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//George's Community Calendar//Farmers Markets 60625//EN
CALSCALE:GREGORIAN
BEGIN:VEVENT
UID:fm-lincoln-square-tue-2026@60625.communitycalendar
SUMMARY:Lincoln Square Farmers Market
LOCATION:2301 W. Leland Ave.\\, Chicago\\, IL 60625
DESCRIPTION:${LINK_NOTE} Tuesdays through Nov 17.
URL:${FARMERS_MARKET_PAGE_URL}
DTSTART;TZID=America/Chicago:20260505T070000
DTEND;TZID=America/Chicago:20260505T120000
RRULE:FREQ=WEEKLY;BYDAY=TU;UNTIL=20261117T235959Z
STATUS:CONFIRMED
END:VEVENT
BEGIN:VEVENT
UID:fm-lincoln-square-thu-2026@60625.communitycalendar
SUMMARY:Lincoln Square Farmers Market
LOCATION:2301 W. Leland Ave.\\, Chicago\\, IL 60625
DESCRIPTION:${LINK_NOTE} Thursdays through Oct 29.
URL:${FARMERS_MARKET_PAGE_URL}
DTSTART;TZID=America/Chicago:20260507T150000
DTEND;TZID=America/Chicago:20260507T190000
RRULE:FREQ=WEEKLY;BYDAY=TH;UNTIL=20261029T235959Z
STATUS:CONFIRMED
END:VEVENT
BEGIN:VEVENT
UID:fm-ravenswood-wed-2026@60625.communitycalendar
SUMMARY:Ravenswood Community Farmers Market
LOCATION:4900 N. Damen Ave.\\, Chicago\\, IL 60625
DESCRIPTION:Wednesdays through Oct 14.
URL:${FARMERS_MARKET_PAGE_URL}
DTSTART;TZID=America/Chicago:20260513T160000
DTEND;TZID=America/Chicago:20260513T200000
RRULE:FREQ=WEEKLY;BYDAY=WE;UNTIL=20261014T235959Z
STATUS:CONFIRMED
END:VEVENT
BEGIN:VEVENT
UID:fm-northpark-2026-05-17@60625.communitycalendar
SUMMARY:North Park Community Market
LOCATION:5555 N. Kimball Ave.\\, Chicago\\, IL 60625
DESCRIPTION:${LINK_NOTE} One Sunday a month\\, May-Oct.
URL:${FARMERS_MARKET_PAGE_URL}
DTSTART;TZID=America/Chicago:20260517T100000
DTEND;TZID=America/Chicago:20260517T140000
STATUS:CONFIRMED
END:VEVENT
BEGIN:VEVENT
UID:fm-northpark-2026-06-21@60625.communitycalendar
SUMMARY:North Park Community Market
LOCATION:5555 N. Kimball Ave.\\, Chicago\\, IL 60625
DESCRIPTION:${LINK_NOTE} One Sunday a month\\, May-Oct.
URL:${FARMERS_MARKET_PAGE_URL}
DTSTART;TZID=America/Chicago:20260621T100000
DTEND;TZID=America/Chicago:20260621T140000
STATUS:CONFIRMED
END:VEVENT
BEGIN:VEVENT
UID:fm-northpark-2026-07-19@60625.communitycalendar
SUMMARY:North Park Community Market
LOCATION:5555 N. Kimball Ave.\\, Chicago\\, IL 60625
DESCRIPTION:${LINK_NOTE} One Sunday a month\\, May-Oct.
URL:${FARMERS_MARKET_PAGE_URL}
DTSTART;TZID=America/Chicago:20260719T100000
DTEND;TZID=America/Chicago:20260719T140000
STATUS:CONFIRMED
END:VEVENT
BEGIN:VEVENT
UID:fm-northpark-2026-08-16@60625.communitycalendar
SUMMARY:North Park Community Market
LOCATION:5555 N. Kimball Ave.\\, Chicago\\, IL 60625
DESCRIPTION:${LINK_NOTE} One Sunday a month\\, May-Oct.
URL:${FARMERS_MARKET_PAGE_URL}
DTSTART;TZID=America/Chicago:20260816T100000
DTEND;TZID=America/Chicago:20260816T140000
STATUS:CONFIRMED
END:VEVENT
BEGIN:VEVENT
UID:fm-northpark-2026-09-20@60625.communitycalendar
SUMMARY:North Park Community Market
LOCATION:5555 N. Kimball Ave.\\, Chicago\\, IL 60625
DESCRIPTION:${LINK_NOTE} One Sunday a month\\, May-Oct.
URL:${FARMERS_MARKET_PAGE_URL}
DTSTART;TZID=America/Chicago:20260920T100000
DTEND;TZID=America/Chicago:20260920T140000
STATUS:CONFIRMED
END:VEVENT
BEGIN:VEVENT
UID:fm-northpark-2026-10-18@60625.communitycalendar
SUMMARY:North Park Community Market
LOCATION:5555 N. Kimball Ave.\\, Chicago\\, IL 60625
DESCRIPTION:${LINK_NOTE} One Sunday a month\\, May-Oct.
URL:${FARMERS_MARKET_PAGE_URL}
DTSTART;TZID=America/Chicago:20261018T100000
DTEND;TZID=America/Chicago:20261018T140000
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR
`;
