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
  accent: string;       // red — top bar, footer bar only (used as a FILL)
  accentDark: string;
  teal: string;         // teal — active UI controls (used as a FILL)
  // ── Text-safe variants ──────────────────────────────────────────────────
  // `accent`/`teal` are tuned as background fills with white text on top
  // (both clear 5:1 that way). Painted as TEXT on the page background they
  // fall to ~2.8:1 in dark mode, failing WCAG 1.4.3. Use these whenever the
  // brand colour is the foreground.
  accentText: string;
  tealText: string;
  focusRing: string;    // visible keyboard focus indicator (WCAG 2.4.7)
  rowHover: string;
  eventBorder: string;
  popupBg: string;
  popupBorder: string;
  fontDisplay: string;
  fontBody: string;
}

// 40th Ward brand palette:
// Deep teal #0b3e4a, teal #147671, light teal #5bb5b1, cream #fffbf4
// Red/orange accent #CF2C28, secondary #ca482b, text #333333

const DARK: Theme = {
  mode: "dark",
  bg: "#0b2a33",
  bgHeader: "#0b2a33ee",
  surface: "#0d3340",
  border: "#1a4a58",
  textPrimary: "#fffbf4",
  textMuted: "#8ab8c0",    // 6.96:1 on bg — do NOT stack extra opacity on this
  textFaint: "#7aa8b0",    // was #2a5060 (~1.5:1, unreadable); now 5.78:1
  accent: "#CF2C28",
  accentDark: "#a01e1b",
  teal: "#147671",         // 40th ward teal — active controls (fill only)
  accentText: "#f0736e",   // #CF2C28 is only 2.9:1 on dark bg; this is 5.3:1
  tealText: "#5bb5b1",     // #147671 is only 2.77:1 on dark bg; this is 6.24:1
  focusRing: "#7fd0cb",
  rowHover: "#0f3d4d",
  eventBorder: "#1c4a5a",
  popupBg: "#0a2530",
  popupBorder: "#2a6070",
  fontDisplay: "'Anton', 'Arial Black', sans-serif",
  fontBody: "'Public Sans', 'Arial', sans-serif",
};

const LIGHT: Theme = {
  mode: "light",
  bg: "#fffbf4",
  bgHeader: "#fffbf4f5",
  surface: "#ffffff",
  border: "#c8dde1",
  textPrimary: "#0b3e4a",
  textMuted: "#4d7178",    // was #0b3e4a99 (3.59:1); solid now, 5.16:1 on cream
  textFaint: "#54777d",    // was #0b3e4a44 (~1.9:1, unreadable); now 4.72:1
  accent: "#CF2C28",
  accentDark: "#a01e1b",
  teal: "#147671",         // 40th ward teal — active controls (fill only)
  accentText: "#CF2C28",   // 5.03:1 on cream — already safe as foreground
  tealText: "#147671",     // 5.27:1 on cream — already safe as foreground
  focusRing: "#0f5d59",
  rowHover: "#f0fafb",
  eventBorder: "#c8e4e8",
  popupBg: "#ffffff",
  popupBorder: "#8ab8c0",
  fontDisplay: "'Anton', 'Arial Black', sans-serif",
  fontBody: "'Public Sans', 'Arial', sans-serif",
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
