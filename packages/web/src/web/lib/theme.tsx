import { createContext, useContext, useState, type ReactNode } from "react";

export type ThemeMode = "dark" | "light";

export interface Theme {
  mode: ThemeMode;
  bg: string;
  bgHeader: string;
  surface: string;
  border: string;
  textPrimary: string;
  textMuted: string;
  textFaint: string;
  accent: string;       // red — kept as a small secondary accent (top bar, footer bar)
  accentDark: string;
  primary: string;      // deep purple — active UI controls (used as a FILL)
  // ── Text-safe variants ──────────────────────────────────────────────────
  // `accent`/`primary` are tuned as background fills with white text on top
  // (both clear 5:1 that way). Painted as TEXT on the page background they
  // can fall below 4.5:1 in dark mode, failing WCAG 1.4.3. Use these
  // whenever the brand colour is the foreground.
  accentText: string;
  primaryText: string;
  focusRing: string;    // visible keyboard focus indicator (WCAG 2.4.7)
  rowHover: string;
  eventBorder: string;
  popupBg: string;
  popupBorder: string;
  fontDisplay: string;
  fontBody: string;
}

// Greater Rockwell Organization brand palette (matched from thegreaterrockwell.org):
// Deep purple #3e1859, lavender #c99fe8, near-black text #333333, light
// gray #f2f2f2, white. Red #CF2C28 kept as a small secondary accent only
// (top bar, footer bar) — not part of GRW's palette, but not asked to remove.
// Font: Work Sans everywhere, no separate display face.

const DARK: Theme = {
  mode: "dark",
  bg: "#1a0f22",
  bgHeader: "#1a0f22ee",
  surface: "#241531",
  border: "#3d2650",
  textPrimary: "#f3edf7",
  textMuted: "#c3b0d6",    // ~8.3:1 on bg
  textFaint: "#a68fc0",    // ~5.4:1 on bg
  accent: "#CF2C28",
  accentDark: "#a01e1b",
  primary: "#8a5cc4",       // brighter than GRW's own #3e1859 so it reads on a dark bg (fill only)
  accentText: "#f0736e",   // #CF2C28 is only 2.9:1 on dark bg; this is 5.3:1
  primaryText: "#c99fe8",  // GRW's own lavender accent — safe as foreground on dark bg
  focusRing: "#c99fe8",
  rowHover: "#2a1a38",
  eventBorder: "#3d2650",
  popupBg: "#1f1329",
  popupBorder: "#4a2f63",
  fontDisplay: "'Work Sans', 'Arial', sans-serif",
  fontBody: "'Work Sans', 'Arial', sans-serif",
};

const LIGHT: Theme = {
  mode: "light",
  bg: "#ffffff",
  bgHeader: "#fffffff5",
  surface: "#f2f2f2",       // GRW's own section background
  border: "#e2d8ea",
  textPrimary: "#262626",
  textMuted: "#404040",     // darkened from #595959 for readability — ~10.4:1 on white
  textFaint: "#6b6b6b",     // darkened from #767676 — ~5.5:1 on white
  accent: "#CF2C28",
  accentDark: "#a01e1b",
  primary: "#3e1859",       // GRW's own deep purple — active controls (fill only)
  accentText: "#CF2C28",    // already safe as foreground on white
  primaryText: "#3e1859",   // ~13:1 on white — safe as foreground too
  focusRing: "#6a2f95",
  rowHover: "#f7f2fa",
  eventBorder: "#e2d8ea",
  popupBg: "#ffffff",
  popupBorder: "#c99fe8",   // GRW's own lavender accent
  fontDisplay: "'Work Sans', 'Arial', sans-serif",
  fontBody: "'Work Sans', 'Arial', sans-serif",
};

const ThemeCtx = createContext<{ theme: Theme; toggle: () => void }>({
  theme: LIGHT,
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>("light");
  const theme = mode === "dark" ? DARK : LIGHT;
  const toggle = () => setMode(m => (m === "dark" ? "light" : "dark"));
  return <ThemeCtx.Provider value={{ theme, toggle }}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  return useContext(ThemeCtx);
}
