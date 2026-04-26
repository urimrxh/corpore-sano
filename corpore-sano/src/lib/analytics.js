const MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

/** @returns {boolean} */
export function isAnalyticsEnabled() {
  return typeof MEASUREMENT_ID === "string" && MEASUREMENT_ID.trim().length > 0;
}

/**
 * Public routes only; admin UI must not send data to GA.
 * @param {string} pathname
 */
export function shouldTrackAnalyticsPath(pathname) {
  if (pathname.startsWith("/admin")) return false;
  if (pathname === "/admin-login") return false;
  return true;
}

let initPromise = null;

/**
 * Loads gtag.js once, defines window.gtag, runs config with send_page_view: false.
 * @returns {Promise<void>}
 */
export function initAnalytics() {
  if (!isAnalyticsEnabled()) {
    return Promise.resolve();
  }
  if (initPromise) {
    return initPromise;
  }

  initPromise = new Promise((resolve, reject) => {
    window.dataLayer = window.dataLayer || [];
    function gtag() {
      window.dataLayer.push(arguments);
    }
    window.gtag = gtag;
    gtag("js", new Date());

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(MEASUREMENT_ID.trim())}`;
    script.onload = () => {
      window.gtag("config", MEASUREMENT_ID.trim(), { send_page_view: false });
      resolve();
    };
    script.onerror = () => {
      initPromise = null;
      reject(new Error("Failed to load Google Analytics script"));
    };
    document.head.appendChild(script);
  });

  return initPromise;
}

/**
 * Manual SPA page_view (initial config disables automatic page views).
 * @param {string} pathname
 * @param {string} [search]
 */
export function trackPageView(pathname, search = "") {
  if (!isAnalyticsEnabled() || typeof window.gtag !== "function") {
    return;
  }
  const path = `${pathname}${search || ""}`;
  window.gtag("event", "page_view", {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  });
}
