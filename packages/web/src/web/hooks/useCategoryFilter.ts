import { useState, useCallback } from "react";
import { getCookie, setCookie, deleteCookie } from "../lib/cookies";

/** Cookie holds a comma-separated list of category keys; absent/empty = "All". */
const COOKIE_NAME = "cc_category_filter";

function readInitial(): Set<string> {
  const raw = getCookie(COOKIE_NAME);
  if (!raw) return new Set();
  return new Set(raw.split(",").filter(Boolean));
}

/**
 * The category filter (the pill row above the cards/calendar view) used to
 * reset to "All" every time the page reloaded, and Cards and Calendar kept
 * separate selections even within the same visit. This lifts it to one
 * shared, cookie-backed selection: whatever a visitor last picked opens as
 * their default view next time, and switching between Cards and Calendar
 * keeps the same filter instead of losing it.
 *
 * An empty Set means "All" throughout the app — same convention the filter
 * bars already used — so "All" is stored as no cookie at all rather than a
 * value, and picking "All" clears the cookie instead of writing an empty one.
 */
export function useCategoryFilter() {
  const [selected, setSelectedState] = useState<Set<string>>(readInitial);

  const setSelected = useCallback((next: Set<string>) => {
    setSelectedState(next);
    if (next.size === 0) deleteCookie(COOKIE_NAME);
    else setCookie(COOKIE_NAME, [...next].join(","));
  }, []);

  return [selected, setSelected] as const;
}
