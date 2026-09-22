import { useCallback, useRef, useState } from "react";
import { deleteCookie, getCookie, setCookie } from "../lib/cookies";

/** Cookie holds a comma-separated list of category keys; absent/empty = "All". */
const FILTER_COOKIE = "cc_category_filter";
/** Cookie holds "1" when the visitor has opted in to remembering their filter. */
const REMEMBER_COOKIE = "cc_remember_filter";

function readRemember(): boolean {
  return getCookie(REMEMBER_COOKIE) === "1";
}

function readInitialSelected(remember: boolean): Set<string> {
  if (!remember) return new Set();
  const raw = getCookie(FILTER_COOKIE);
  if (!raw) return new Set();
  return new Set(raw.split(",").filter(Boolean));
}

function writeFilterCookie(selected: Set<string>): void {
  if (selected.size === 0) deleteCookie(FILTER_COOKIE);
  else setCookie(FILTER_COOKIE, [...selected].join(","));
}

/**
 * The category filter (the pill row above the cards/calendar view) used to
 * reset to "All" every time the page reloaded, and Cards and Calendar kept
 * separate selections even within the same visit. This lifts it to one
 * shared selection, and — only when the visitor opts in via the "Remember my
 * filter" checkbox next to the pills — backs it with a cookie so it opens
 * as their default view next time. Left unchecked (the default), the filter
 * behaves exactly as before: shared between Cards and Calendar for the
 * current visit, but back to "All" on the next one.
 *
 * An empty Set means "All" throughout the app — same convention the filter
 * bars already used — so "All" is stored as no cookie at all rather than a
 * value, and picking "All" clears the stored value instead of writing an
 * empty one.
 */
export function useCategoryFilter() {
  const [remember, setRememberState] = useState<boolean>(readRemember);
  const rememberRef = useRef(remember);
  const [selected, setSelectedState] = useState<Set<string>>(() => readInitialSelected(rememberRef.current));

  const setSelected = useCallback((next: Set<string>) => {
    setSelectedState(next);
    if (rememberRef.current) writeFilterCookie(next);
  }, []);

  const setRemember = useCallback((next: boolean) => {
    rememberRef.current = next;
    setRememberState(next);
    if (next) {
      setCookie(REMEMBER_COOKIE, "1");
      setSelectedState(current => {
        writeFilterCookie(current);
        return current;
      });
    } else {
      deleteCookie(REMEMBER_COOKIE);
      deleteCookie(FILTER_COOKIE);
      // Keep whatever's selected for the rest of this visit — opting out
      // only stops it from being remembered next time, it doesn't reset it now.
    }
  }, []);

  return { selected, setSelected, remember, setRemember };
}
