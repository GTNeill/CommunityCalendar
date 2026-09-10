import { useQuery } from "@tanstack/react-query";

export interface CalendarSource {
  name: string;
  /** Public origin URL for the source's own site, when one exists. */
  link: string | null;
}

async function fetchSources(): Promise<CalendarSource[]> {
  const res = await fetch("/api/sources");
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.sources ?? [];
}

const FOUR_HOURS = 4 * 60 * 60 * 1000;

export function useSources() {
  return useQuery<CalendarSource[], Error>({
    queryKey: ["calendar-sources"],
    queryFn: fetchSources,
    staleTime: FOUR_HOURS,
    retry: 2,
  });
}
