import type { CalEvent } from "../lib/calendarUtils";
import { parseLocalDate } from "../lib/calendarUtils";
import EventDetailCard from "./EventDetailCard";
import { useTheme } from "../lib/theme";
import { SearchX } from "lucide-react";

interface Props {
  query: string;
  events: CalEvent[];
}

export default function SearchResults({ query, events }: Props) {
  const { theme } = useTheme();

  const q = query.trim().toLowerCase();
  const matches = events
    .filter(ev =>
      ev.title.toLowerCase().includes(q) ||
      (ev.location ?? "").toLowerCase().includes(q) ||
      (ev.description ?? "").toLowerCase().includes(q) ||
      ev.categoryLabel.toLowerCase().includes(q)
    )
    .sort((a, b) => parseLocalDate(a.start).getTime() - parseLocalDate(b.start).getTime());

  return (
    <div>
      {/* h2 + live region: the result count changes as the query is typed,
          so it must be announced (WCAG 4.1.3) and sit in the heading outline
          (WCAG 1.3.1) above the h3 event titles in each result card. */}
      <h2
        aria-live="polite"
        style={{
          fontSize: "0.78rem",
          fontWeight: 600,
          margin: "0 0 16px",
          color: theme.textMuted,
        }}
      >
        {matches.length === 0
          ? `No events match "${query}" in the current view.`
          : `${matches.length} event${matches.length === 1 ? "" : "s"} match${matches.length === 1 ? "es" : ""} "${query}" in the current view`}
      </h2>

      {matches.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center text-center"
          style={{ padding: "60px 20px", color: theme.textMuted, gap: 10 }}
        >
          <SearchX size={28} style={{ opacity: 0.5 }} />
          <div style={{ fontSize: "0.85rem" }}>
            Try a different search term, or switch to Week/Month to widen the current view.
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {matches.map(ev => (
            <EventDetailCard key={ev.id} ev={ev} />
          ))}
        </div>
      )}
    </div>
  );
}
