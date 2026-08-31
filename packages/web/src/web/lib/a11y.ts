// ── Accessibility helpers ────────────────────────────────────────────────────
//
// WCAG 2.1 SC 1.4.3 (Contrast, Minimum) requires 4.5:1 for normal text and
// 3:1 for large text (>=18.66px bold, or >=24px). Category colours in this
// calendar are admin-editable data, not design tokens, so they cannot be
// hand-tuned in the palette — a colour that reads fine on the cream light
// background can drop to ~2.3:1 on the dark teal one. `readableOn()` keeps
// the author's chosen hue but nudges its lightness until it clears the
// threshold against whatever background it is actually painted on.

function srgbToLinear(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map(c => c + c).join("");
  // Ignore any alpha pair — contrast is computed against the composited value
  // by the caller, and a bare 8-digit hex would otherwise parse as garbage.
  if (h.length === 8) h = h.slice(0, 6);
  const n = parseInt(h, 16);
  if (Number.isNaN(n) || h.length !== 6) return [0, 0, 0];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const to = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

export function contrastRatio(fg: string, bg: string): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) { const v = l * 255; return [v, v, v]; }
  const hue = (t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [hue(h + 1 / 3) * 255, hue(h) * 255, hue(h - 1 / 3) * 255];
}

/**
 * Return `color` adjusted just enough to meet `target` contrast against `bg`,
 * preserving hue and saturation. Walks lightness away from the background —
 * lighter on dark backgrounds, darker on light ones — and falls back to plain
 * white/black only if the hue can never reach the target.
 */
export function readableOn(color: string, bg: string, target = 4.5): string {
  if (!color) return color;
  if (contrastRatio(color, bg) >= target) return color;

  const [r, g, b] = hexToRgb(color);
  const [h, s] = rgbToHsl(r, g, b);
  const bgIsDark = relativeLuminance(bg) < 0.18;

  // 1% lightness steps: fine enough that the adjusted colour still reads as
  // the same hue, cheap enough to run per render.
  for (let i = 1; i <= 100; i++) {
    const l = bgIsDark ? Math.min(1, i / 100) : Math.max(0, 1 - i / 100);
    const [nr, ng, nb] = hslToRgb(h, s, l);
    const candidate = rgbToHex(nr, ng, nb);
    if (contrastRatio(candidate, bg) >= target) return candidate;
  }
  return bgIsDark ? "#ffffff" : "#000000";
}

/**
 * Composite a translucent colour over an opaque background and return the
 * solid hex that actually gets painted.
 *
 * Category chips, date badges and pills are drawn as `${color}22` over the
 * card surface, so contrast has to be measured against that blend — not
 * against the surface itself, which is what a naive check gets wrong.
 *
 * @param color  base colour, e.g. "#CF2C28"
 * @param alpha  two-digit hex alpha as used in the style, e.g. "22"
 * @param bg     opaque background the tint sits on
 */
export function tintOver(color: string, alpha: string, bg: string): string {
  const a = parseInt(alpha, 16) / 255;
  const [r1, g1, b1] = hexToRgb(color);
  const [r2, g2, b2] = hexToRgb(bg);
  const mix = (f: number, b: number) => f * a + b * (1 - a);
  return rgbToHex(mix(r1, r2), mix(g1, g2), mix(b1, b2));
}

/**
 * Contrast-safe foreground for text drawn on top of a `${color}${alpha}` tint
 * of itself — the pattern used by every category chip, badge and pill here.
 */
export function readableOnTint(color: string, alpha: string, bg: string, target = 5.2): string {
  return readableOn(color, tintOver(color, alpha, bg), target);
}

/**
 * Best text colour for an opaque `bg` fill — white or near-black, whichever
 * has more contrast. Used for badges that paint a category colour solid, where
 * a hardcoded dark text can land at 3.8:1 on a mid-tone red.
 */
export function onSolid(bg: string): string {
  return contrastRatio("#ffffff", bg) >= contrastRatio("#0A0A0A", bg) ? "#ffffff" : "#0A0A0A";
}

/** Screen-reader-only text: visually hidden, still announced. */
export const srOnly: React.CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
  border: 0,
};
