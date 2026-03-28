import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Scrolls the window to the top when the route path changes.
 * - Same pathname + hash-only updates do not run this (pathname unchanged).
 * - If the new URL has a hash, we skip so targets like /#book-consultation can scroll into view.
 */
function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) return;

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, [pathname, hash]);

  return null;
}

export default ScrollToTop;
