// ── HTML → plain text ────────────────────────────────────────────────────────
//
// Third-party event descriptions arrive as rich HTML (inline styles, <font>
// tags, CDN <img>s, RTE data attributes) which is far more markup than the
// calendar needs. The UI renders description text and linkifies bare URLs
// itself, so flatten to readable plain text and let it do that.
//
// Shared by the Squarespace and RSS connectors so both produce descriptions
// that look the same in the UI.

export function htmlToText(html: string): string {
  return (html ?? "")
    .replace(/<\s*(br|\/p|\/div|\/h[1-6]|\/li|\/tr)\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&rsquo;/gi, "'")
    .replace(/&ldquo;|&rdquo;/gi, '"')
    .replace(/&mdash;/gi, "—")
    .replace(/&ndash;/gi, "–")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
