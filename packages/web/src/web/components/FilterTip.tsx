import { useTheme } from "../lib/theme";

/**
 * Explains how the category filter pills behave. Shared by the Cards and
 * Calendar views so the wording stays identical in both.
 */
export default function FilterTip() {
  const { theme } = useTheme();

  return (
    <div
      style={{
        fontSize: "0.72rem",
        color: theme.textMuted,
        marginBottom: "8px",
        lineHeight: 1.5,
      }}
    >
      Tap a category to show only that type of event. Tap more to add them to the view.
      Tap the same one again to remove it, or tap{" "}
      <strong style={{ color: theme.textMuted }}>All</strong> to reset.
    </div>
  );
}
