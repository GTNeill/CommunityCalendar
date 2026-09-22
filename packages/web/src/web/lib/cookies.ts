// ── Tiny first-party cookie helpers ──────────────────────────────────────────
//
// Used to remember a visitor's own UI preferences (e.g. which category
// filter they last picked) across visits, without an account or a server
// round-trip. Not used for anything the server reads — this is
// browser-local state that happens to survive longer than a tab.
//
// Note for the embedded (?embed=1) use on Squarespace: a cookie set here is
// scoped to this app's own domain. Inside a same-site page that's a normal
// first-party cookie; inside a cross-site <iframe> (the Squarespace embed)
// most browsers now treat it as third-party and may block or partition it
// (Safari ITP always has, Chrome is moving the same way) — the filter still
// applies for that page view, it just may not be *remembered* between visits
// there. It always persists normally when visiting the calendar's own URL
// directly.

export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function setCookie(name: string, value: string, maxAgeDays = 365): void {
  if (typeof document === "undefined") return;
  const secure = typeof location !== "undefined" && location.protocol === "https:" ? "; Secure" : "";
  document.cookie =
    `${name}=${encodeURIComponent(value)}; Max-Age=${maxAgeDays * 86400}; Path=/; SameSite=Lax${secure}`;
}

export function deleteCookie(name: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
}
