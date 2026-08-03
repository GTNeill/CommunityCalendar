import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import type { CalEvent } from "../lib/calendarUtils";
import {
  fmtDayNum, fmtMonthShort, fmtWeekday, fmtTime, fmtDuration, isToday, parseLocalDate, googleCalendarAddUrl
} from "../lib/calendarUtils";
import { MapPin, Clock, ExternalLink, User, Calendar, AlarmClock, X, CalendarPlus } from "lucide-react";
import { useTheme } from "../lib/theme";
import { useIsMobile } from "../hooks/useIsMobile";
import { useCategories, buildCategoryGroups } from "../hooks/useCategories";
import CategoryIcon from "./CategoryIcon";

interface Props {
  grouped: Record<string, CalEvent[]>;
}

/* ─────────────────────────────────────────────
   Google Calendar-style popup
───────────────────────────────────────────── */
function EventPopup({
  ev,
  categoryColor,
  rowRef,
  isMobile,
  onClose,
  onMouseEnter,
  onMouseLeave,
}: {
  ev: CalEvent;
  categoryColor: string;
  rowRef: React.RefObject<HTMLDivElement | null>;
  isMobile?: boolean;
  onClose?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  const { theme } = useTheme();
  const popupRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!rowRef.current || !popupRef.current) return;
    const row = rowRef.current.getBoundingClientRect();
    const popup = popupRef.current.getBoundingClientRect();
    const viewW = window.innerWidth;
    const viewH = window.innerHeight;
    const GAP = 12;

    if (isMobile) {
      // Mobile: horizontally centered (clamped), positioned below the row
      // (or above if there isn't room below) — left/right placement doesn't
      // work when the row is nearly as wide as the viewport itself.
      const left = Math.max(8, Math.min((viewW - popup.width) / 2, viewW - popup.width - 8));
      let top = row.bottom + GAP;
      if (top + popup.height > viewH - 8) top = row.top - popup.height - GAP;
      top = Math.max(8, Math.min(top, viewH - popup.height - 8));
      setPos({ top, left });
      return;
    }

    // Prefer right; fall back to left
    let left = row.right + GAP;
    if (left + popup.width > viewW - 8) left = row.left - popup.width - GAP;

    // Vertically center on the row, clamp to viewport
    let top = row.top + row.height / 2 - popup.height / 2;
    top = Math.max(8, Math.min(top, viewH - popup.height - 8));

    setPos({ top, left });
  }, [rowRef, isMobile]);

  const dur = fmtDuration(ev.start, ev.end, ev.isAllDay);
  const timeStr = ev.isAllDay
    ? "All day"
    : `${fmtTime(ev.start, false)} – ${ev.end ? fmtTime(ev.end, false) : ""}`;

  return (
    <div
      ref={popupRef}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: "fixed",
        zIndex: 9999,
        width: isMobile ? "calc(100vw - 32px)" : 320,
        maxWidth: 320,
        top: pos ? pos.top : -9999,
        left: pos ? pos.left : -9999,
        background: theme.popupBg,
        border: `1.5px solid ${theme.popupBorder}`,
        borderRadius: 14,
        boxShadow: theme.mode === "dark"
          ? "0 0 0 1px #000, 0 12px 48px rgba(0,0,0,0.85), 0 2px 10px rgba(0,0,0,0.6)"
          : "0 0 0 1px rgba(0,0,0,0.08), 0 12px 48px rgba(0,0,0,0.22), 0 2px 10px rgba(0,0,0,0.12)",
        // Interactive on both mobile and desktop now, so the "Open in
        // Google Calendar" / "Add to Calendar" links are clickable.
        pointerEvents: "auto",
        overflow: "hidden",
      }}
    >
      {/* Colour bar — mimics GCal's left accent bar at top; on mobile doubles as a close button */}
      {isMobile ? (
        <div
          onClick={onClose}
          style={{
            height: 6,
            background: categoryColor,
            cursor: "pointer",
          }}
        />
      ) : (
        <div style={{ height: 6, background: categoryColor }} />
      )}
      {isMobile && (
        <button
          onClick={onClose}
          aria-label="Close"
          title="Close"
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            width: 26,
            height: 26,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 8,
            border: "none",
            background: theme.mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
            color: theme.textMuted,
            cursor: "pointer",
          }}
        >
          <X size={14} />
        </button>
      )}

      {/* Header */}
      <div style={{ padding: "14px 16px 10px" }}>
        <div
          style={{
            fontSize: "0.72rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: categoryColor,
            marginBottom: 4,
          }}
        >
          <CategoryIcon icon={ev.categoryIcon} size={12} /> {ev.categoryLabel}
        </div>
        <div
          style={{
            fontSize: "1rem",
            fontWeight: 700,
            lineHeight: 1.3,
            color: theme.textPrimary,
          }}
        >
          {ev.title}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: theme.border, margin: "0 16px" }} />

      {/* Body */}
      <div style={{ padding: "12px 16px 14px", display: "flex", flexDirection: "column", gap: 10 }}>

        {/* Date + time + duration */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <Clock size={14} style={{ color: categoryColor, flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontSize: "0.875rem", fontWeight: 600, color: theme.textPrimary }}>
              {fmtWeekday(ev.start)}, {fmtMonthShort(ev.start)} {fmtDayNum(ev.start)}
            </div>
            <div style={{ fontSize: "0.8rem", color: theme.textPrimary, opacity: 0.7, marginTop: 1 }}>
              {timeStr}
              {dur && (
                <span
                  style={{
                    marginLeft: 8,
                    padding: "1px 7px",
                    borderRadius: 99,
                    background: `${categoryColor}22`,
                    color: categoryColor,
                    fontSize: "0.72rem",
                    fontWeight: 700,
                  }}
                >
                  {dur}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Location */}
        {ev.location && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <MapPin size={14} style={{ color: categoryColor, flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: "0.825rem", color: theme.textMuted, lineHeight: 1.4 }}>
              {ev.location}
            </div>
          </div>
        )}

        {/* Description */}
        {ev.description && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <AlarmClock size={14} style={{ color: categoryColor, flexShrink: 0, marginTop: 2 }} />
            <div
              style={{
                fontSize: "0.8rem",
                color: theme.textMuted,
                lineHeight: 1.5,
                maxHeight: 72,
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
              }}
              // strip HTML tags from description
              dangerouslySetInnerHTML={{ __html: ev.description.replace(/<[^>]*>/g, " ").trim() }}
            />
          </div>
        )}

        {/* Organizer */}
        {ev.organizer && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <User size={14} style={{ color: categoryColor, flexShrink: 0 }} />
            <div style={{ fontSize: "0.8rem", color: theme.textMuted }}>{ev.organizer}</div>
          </div>
        )}

        {/* Calendar label */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Calendar size={14} style={{ color: categoryColor, flexShrink: 0 }} />
          <div style={{ fontSize: "0.8rem", color: theme.textMuted }}>{ev.categoryLabel}</div>
        </div>

        {/* Links — real clickable anchors now that the popup is interactive */}
        <div style={{ height: 1, background: theme.border }} />
        {ev.htmlLink && (
          <a
            href={ev.htmlLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}
          >
            <ExternalLink size={13} style={{ color: categoryColor }} />
            <span style={{ fontSize: "0.8rem", fontWeight: 600, color: categoryColor }}>
              Open in Google Calendar
            </span>
          </a>
        )}
        <a
          href={googleCalendarAddUrl(ev)}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}
        >
          <CalendarPlus size={13} style={{ color: categoryColor }} />
          <span style={{ fontSize: "0.8rem", fontWeight: 600, color: categoryColor }}>
            Add to my calendar
          </span>
        </a>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Event Row
───────────────────────────────────────────── */
function EventRow({ ev, categoryColor }: { ev: CalEvent; categoryColor: string }) {
  const { theme } = useTheme();
  const isMobile = useIsMobile();
  const today = isToday(ev.start);
  const [hovered, setHovered] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);
  const dur = fmtDuration(ev.start, ev.end, ev.isAllDay);

  // Delay popup by 300ms to avoid flicker on quick mouse-overs
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Hide is also delayed (and cancelable) so the mouse can travel from the
  // row across the small gap into the popup itself — e.g. to click "Open in
  // Google Calendar" — without the popup disappearing first.
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelHide = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
  }, []);
  const scheduleHide = useCallback(() => {
    cancelHide();
    hideTimerRef.current = setTimeout(() => setHovered(false), 250);
  }, [cancelHide]);

  const handleEnter = useCallback(() => {
    if (isMobile) return; // no hover on touch devices
    cancelHide();
    timerRef.current = setTimeout(() => setHovered(true), 300);
  }, [isMobile, cancelHide]);
  const handleLeave = useCallback(() => {
    if (isMobile) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    scheduleHide();
  }, [isMobile, scheduleHide]);

  // On mobile, tapping the row shows the detail popup instead of navigating
  // straight to Google Calendar (which would otherwise open off-screen/
  // unexpectedly and skip the preview entirely). Tapping outside closes it.
  useEffect(() => {
    if (!isMobile || !hovered) return;
    const handleOutside = (e: MouseEvent) => {
      if (rowRef.current && !rowRef.current.contains(e.target as Node)) {
        setHovered(false);
      }
    };
    document.addEventListener("click", handleOutside, true);
    return () => document.removeEventListener("click", handleOutside, true);
  }, [isMobile, hovered]);

  const handleRowClick = (e: React.MouseEvent) => {
    if (isMobile) {
      e.preventDefault();
      setHovered(v => !v);
      return;
    }
    if (ev.htmlLink) window.open(ev.htmlLink, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <div
        ref={rowRef}
        className="flex gap-4"
        style={{
          padding: "10px 14px",
          margin: "6px 8px",
          borderRadius: 10,
          // Card-like background for each event
          background: hovered
            ? `${categoryColor}18`
            : theme.mode === "dark" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
          border: `1px solid ${hovered ? categoryColor + "55" : theme.eventBorder}`,
          // Left accent bar via box-shadow so it doesn't shift layout
          boxShadow: hovered ? `inset 3px 0 0 ${categoryColor}` : "none",
          transition: "background 0.18s, border-color 0.18s, box-shadow 0.18s",
          cursor: "pointer",
        }}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        onClick={handleRowClick}
      >
        {/* Date column */}
        <div
          className="flex-shrink-0 text-center"
          style={{
            minWidth: 52,
            padding: "6px 8px",
            borderRadius: 8,
            background: hovered ? `${categoryColor}28` : `${categoryColor}14`,
            border: `1px solid ${categoryColor}44`,
            transition: "background 0.18s",
          }}
        >
          <div style={{ fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, color: categoryColor }}>
            {fmtWeekday(ev.start)}
          </div>
          <div style={{ fontSize: "1.4rem", fontWeight: 800, lineHeight: 1.1, color: theme.textPrimary }}>
            {fmtDayNum(ev.start)}
          </div>
          <div style={{ fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, color: categoryColor, opacity: 0.8 }}>
            {fmtMonthShort(ev.start)}
          </div>
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1" style={{ paddingTop: 3 }}>
          {/* Title row */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <a
              href={ev.htmlLink ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: "0.9rem",
                fontWeight: 700,
                color: hovered ? categoryColor : theme.textPrimary,
                textDecoration: "none",
                transition: "color 0.15s",
                lineHeight: 1.3,
              }}
            >
              {ev.title}
            </a>
            {today && (
              <span
                style={{
                  fontSize: "0.6rem",
                  fontWeight: 800,
                  padding: "2px 7px",
                  borderRadius: 99,
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  background: categoryColor,
                  color: "#0A0A0A",
                }}
              >
                Today
              </span>
            )}
          </div>

          {/* Time + duration */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5, flexWrap: "wrap" }}>
            <Clock size={12} style={{ color: categoryColor, flexShrink: 0 }} />
            <span style={{ fontSize: "0.8rem", fontWeight: 600, color: theme.textPrimary }}>
              {fmtTime(ev.start, ev.isAllDay)}
              {ev.end && !ev.isAllDay && (
                <span style={{ color: theme.textMuted, fontWeight: 500 }}> – {fmtTime(ev.end, false)}</span>
              )}
            </span>
            {dur && (
              <span
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  padding: "1px 7px",
                  borderRadius: 99,
                  background: `${categoryColor}22`,
                  color: categoryColor,
                }}
              >
                {dur}
              </span>
            )}
          </div>

          {/* Location */}
          {ev.location && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
              <MapPin size={12} style={{ color: categoryColor, flexShrink: 0 }} />
              <span style={{ fontSize: "0.78rem", color: theme.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {ev.location}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Portal-like fixed popup — rendered outside the row so it doesn't affect layout */}
      {hovered && (
        <EventPopup
          ev={ev}
          categoryColor={categoryColor}
          rowRef={rowRef}
          isMobile={isMobile}
          onClose={() => setHovered(false)}
          onMouseEnter={cancelHide}
          onMouseLeave={scheduleHide}
        />
      )}
    </>
  );
}

/* ─────────────────────────────────────────────
   Category Filter Bar
───────────────────────────────────────────── */
function CategoryFilterBar({
  catMeta,
  selected,
  onChange,
}: {
  catMeta: Record<string, { icon: string; label: string; color: string }>;
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const { theme } = useTheme();
  const cats = Object.entries(catMeta);
  const allSelected = selected.size === 0;

  const toggle = (key: string) => {
    if (allSelected) {
      // Solo this category — turn off all others
      onChange(new Set([key]));
      return;
    }
    const next = new Set(selected);
    if (next.has(key)) {
      // Deselecting — if it would empty the set, go back to All
      next.delete(key);
      onChange(next.size === 0 ? new Set() : next);
    } else {
      // Adding another category
      next.add(key);
      // If all categories are now selected, revert to All
      onChange(next.size === cats.length ? new Set() : next);
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "6px", marginBottom: "16px" }}>
      <button
        onClick={() => onChange(new Set())}
        style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "4px 12px", borderRadius: 99, fontSize: "0.72rem", fontWeight: 700,
          cursor: "pointer",
          border: `1.5px solid ${allSelected ? theme.teal : theme.border}`,
          background: allSelected ? `${theme.teal}22` : "transparent",
          color: allSelected ? theme.teal : theme.textMuted,
          transition: "all 0.15s", outline: "none",
        }}
      >
        All
      </button>
      {cats.map(([key, { icon, label, color }]) => {
        const active = !allSelected && selected.has(key);
        return (
          <button
            key={key}
            onClick={() => toggle(key)}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "4px 11px", borderRadius: 99, fontSize: "0.72rem", fontWeight: 700,
              cursor: "pointer",
              border: `1.5px solid ${active ? color : theme.border}`,
              background: active ? `${color}22` : "transparent",
              color: active ? color : theme.textMuted,
              transition: "all 0.15s", outline: "none",
            }}
          >
            <CategoryIcon icon={icon} size={12} />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Category Cards grid
───────────────────────────────────────────── */

const MAX_VISIBLE = 5;

// Approx height of one event row — used to size the scrollable area
const ROW_HEIGHT_PX = 90;

export default function CategoryCards({ grouped }: Props) {
  const { theme } = useTheme();
  const [selectedCats, setSelectedCats] = useState<Set<string>>(new Set());
  const { data: categoriesData } = useCategories();

  // Today at midnight for filtering past events
  const todayMid = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Live order + groups straight from categories.json (via /admincat), not
  // a hardcoded frontend list — stays correct automatically when categories
  // are added, renamed, reordered, or moved between groups.
  const categoryOrder = useMemo(
    () => [...(categoriesData ?? [])].sort((a, b) => a.order - b.order).map(c => c.key),
    [categoriesData]
  );
  const categoryGroups = useMemo(
    () => buildCategoryGroups(categoriesData ?? []),
    [categoriesData]
  );

  if (!categoriesData) return null; // brief loading window before category order/groups are known

  const allCats = categoryOrder.filter(k => (grouped[k]?.length ?? 0) > 0);

  const catMeta: Record<string, { icon: string; label: string; color: string }> = {};
  for (const evList of Object.values(grouped)) {
    for (const ev of evList) {
      if (!catMeta[ev.category]) {
        catMeta[ev.category] = {
          icon: ev.categoryIcon,
          label: ev.categoryLabel,
          color: ev.categoryColor,
        };
      }
    }
  }

  // Apply category filter
  const visibleCats = selectedCats.size === 0
    ? allCats
    : allCats.filter(k => selectedCats.has(k));

  if (allCats.length === 0) {
    return (
      <div className="text-center py-20" style={{ color: theme.textMuted }}>
        No upcoming events in the selected range.
      </div>
    );
  }

  return (
    <div>
      <div style={{
        fontSize: "0.72rem",
        color: theme.textMuted,
        marginBottom: "8px",
        lineHeight: 1.5,
      }}>
        Tap a category to show only that type of event. Tap more to add them to the view.
        Tap the same one again to remove it, or tap <strong style={{ color: theme.textMuted }}>All</strong> to reset.
      </div>
      <CategoryFilterBar catMeta={catMeta} selected={selectedCats} onChange={setSelectedCats} />

      {visibleCats.length === 0 ? (
        <div className="text-center py-20" style={{ color: theme.textMuted }}>
          No events match the selected filters.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          {categoryGroups.map(group => {
            const groupCats = visibleCats.filter(k => group.keys.includes(k));
            if (groupCats.length === 0) return null;
            return (
              <div key={group.label}>
                {/* Group heading */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 12, marginBottom: 14,
                }}>
                  <div style={{
                    fontSize: "0.65rem", fontWeight: 800, textTransform: "uppercase",
                    letterSpacing: "0.14em", color: theme.textMuted,
                    fontFamily: theme.fontBody,
                  }}>
                    {group.label}
                  </div>
                  <div style={{ flex: 1, height: 1, background: theme.border }} />
                </div>

                {/* Cards grid */}
                <div
                  style={{
                    display: "grid",
                    gap: "12px",
                    gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
                  }}
                >
                  {groupCats.map(key => {
            const allEvents = grouped[key] ?? [];
            const meta = catMeta[key] ?? { icon: "📌", label: key, color: "#5A5A5A" };

            // Split into future (today onward) and past, each sorted ascending
            const futureEvents = allEvents
              .filter(ev => parseLocalDate(ev.start) >= todayMid)
              .sort((a, b) => parseLocalDate(a.start).getTime() - parseLocalDate(b.start).getTime());
            const pastEvents = allEvents
              .filter(ev => parseLocalDate(ev.start) < todayMid)
              .sort((a, b) => parseLocalDate(b.start).getTime() - parseLocalDate(a.start).getTime()); // most recent first

            // Total visible = future events up front; past events scroll below
            const totalEvents = allEvents.length;
            const hasMore = futureEvents.length > MAX_VISIBLE || pastEvents.length > 0;
            // Scroll area height: show exactly MAX_VISIBLE rows, scroll for the rest
            const scrollHeight = MAX_VISIBLE * ROW_HEIGHT_PX;

            return (
              <div
                key={key}
                style={{
                  background: theme.surface,
                  border: `2px solid ${meta.color}`,
                  borderRadius: 16,
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {/* Card header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "14px 20px",
                    background: `${meta.color}1e`,
                    borderBottom: `2px solid ${meta.color}`,
                    flexShrink: 0,
                  }}
                >
                  <CategoryIcon icon={meta.icon} size={20} />
                  <span
                    style={{
                      fontFamily: theme.fontBody,
                      fontSize: "0.8rem",
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      color: meta.color,
                    }}
                  >
                    {meta.label}
                  </span>
                  <div
                    style={{
                      marginLeft: "auto",
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: meta.color,
                      color: "#fff",
                      fontSize: "0.7rem",
                      fontWeight: 800,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {totalEvents}
                  </div>
                </div>

                {/* Event rows — future first, scrollable, past below a divider */}
                {futureEvents.length === 0 && pastEvents.length === 0 ? (
                  <div
                    style={{
                      padding: "20px",
                      textAlign: "center",
                      fontSize: "0.8rem",
                      color: theme.textMuted,
                      fontStyle: "italic",
                    }}
                  >
                    No events in this range
                  </div>
                ) : (
                  <div
                    style={{
                      overflowY: hasMore ? "auto" : "visible",
                      maxHeight: hasMore ? scrollHeight : "none",
                      padding: "6px 0 8px",
                      scrollbarWidth: "thin",
                      scrollbarColor: `${meta.color}66 transparent`,
                    }}
                  >
                    {/* Future events (today onward) */}
                    {futureEvents.map(ev => (
                      <EventRow key={ev.id} ev={ev} categoryColor={meta.color} />
                    ))}

                    {/* Past events divider + rows */}
                    {pastEvents.length > 0 && (
                      <>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            margin: "6px 14px",
                          }}
                        >
                          <div style={{ flex: 1, height: 1, background: theme.border }} />
                          <span
                            style={{
                              fontSize: "0.65rem",
                              fontWeight: 700,
                              textTransform: "uppercase",
                              letterSpacing: "0.1em",
                              color: theme.textMuted,
                              opacity: 0.6,
                            }}
                          >
                            Earlier this period
                          </span>
                          <div style={{ flex: 1, height: 1, background: theme.border }} />
                        </div>
                        {pastEvents.map(ev => (
                          <div key={ev.id} style={{ opacity: 0.45 }}>
                            <EventRow ev={ev} categoryColor={meta.color} />
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
