import { useQuery } from "@tanstack/react-query";

export interface SiteSettings {
  headerTitle: string;
  headerSubtitle: string;
  footerText: string;
  footerLinkText: string;
  footerLinkUrl: string;
  submitEventUrl: string;
}

async function fetchSettings(): Promise<SiteSettings> {
  const res = await fetch("/api/settings");
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

const FOUR_HOURS = 4 * 60 * 60 * 1000;

export function useSiteSettings() {
  return useQuery<SiteSettings, Error>({
    queryKey: ["site-settings"],
    queryFn: fetchSettings,
    staleTime: FOUR_HOURS,
    retry: 2,
  });
}
