/**
 * Analytics shim.
 *
 * The vendor analytics SDK is no longer bundled. Drop your own provider here
 * (e.g. a PostHog React Native client) if you want mobile analytics.
 */
export const useAnalytics = () => ({
  event: (_name: string, _props?: Record<string, unknown>) => {},
  view: (_pathOrProps?: string | Record<string, unknown>, _props?: Record<string, unknown>) => {},
});
