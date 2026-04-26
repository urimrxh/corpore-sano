import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { initAnalytics, shouldTrackAnalyticsPath, trackPageView } from "../lib/analytics";

/**
 * Sends GA4 page_view on route changes only (not on admin routes).
 */
export default function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await initAnalytics();
        if (cancelled) return;
        if (!shouldTrackAnalyticsPath(location.pathname)) return;
        trackPageView(location.pathname, location.search);
      } catch {
        /* ignore load/config failures */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [location.pathname, location.search]);

  return null;
}
