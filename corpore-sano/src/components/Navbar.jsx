import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { MdDarkMode, MdLightMode } from "react-icons/md";
import { useSiteContent } from "../context/SiteContentContext";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import BookConsultationLink from "./BookConsultationLink";
import "../style/navbar.css";
import logo from "../assets/logo.png";

const MOBILE_NAV_MQ = "(max-width: 767px)";
const SCROLL_DOWN_THRESHOLD = 6;

function useIsMobileNav() {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(MOBILE_NAV_MQ).matches : false,
  );

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_NAV_MQ);
    setMatches(mq.matches);
    const onChange = () => setMatches(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return matches;
}

function Navbar() {
  const { content } = useSiteContent();
  const { theme, toggleTheme } = useTheme();
  const { session } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [headerHidden, setHeaderHidden] = useState(false);
  const location = useLocation();
  const isMobileNav = useIsMobileNav();
  const headerRef = useRef(null);
  const lastScrollY = useRef(0);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMobileNav) setMenuOpen(false);
  }, [isMobileNav]);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    const setHeightVar = () => {
      const h = el.offsetHeight;
      document.documentElement.style.setProperty("--site-header-height", `${h}px`);
    };

    setHeightVar();
    const ro = new ResizeObserver(setHeightVar);
    ro.observe(el);
    window.addEventListener("resize", setHeightVar);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", setHeightVar);
    };
  }, [isMobileNav, menuOpen]);

  useEffect(() => {
    lastScrollY.current = window.scrollY;

    const onScroll = () => {
      if (menuOpen) {
        setHeaderHidden(false);
        lastScrollY.current = window.scrollY;
        return;
      }

      const y = window.scrollY;
      const delta = y - lastScrollY.current;
      lastScrollY.current = y;

      if (y <= 48) {
        setHeaderHidden(false);
        return;
      }
      if (delta > SCROLL_DOWN_THRESHOLD) {
        setHeaderHidden(true);
      } else if (delta < -SCROLL_DOWN_THRESHOLD) {
        setHeaderHidden(false);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [menuOpen]);

  const pathname = location.pathname;

  function isNavActive(to) {
    if (to === "/") return pathname === "/";
    if (to === "/admin") {
      return pathname === "/admin" || pathname === "/admin-login";
    }
    return pathname === to;
  }

  function navLinkClass(to) {
    return `nav-links-item${isNavActive(to) ? " nav-links-item--active" : ""}`;
  }

  return (
    <header
      ref={headerRef}
      className={`site-header site-header--sticky border-b border-transparent bg-white dark:border-[#2a3441] dark:bg-[#121a22] ${headerHidden ? "site-header--hidden" : ""}`}
    >
      <div className="container-navbar nav flex items-center justify-between gap-3 m-auto py-[8px] md:py-[12px] px-[12px] md:px-0">
        {isMobileNav && (
          <div className="burger-menu-container flex items-center gap-1 sm:gap-2 min-w-0 shrink">
            <button
              type="button"
              className="navbar-burger shrink-0 -ml-2"
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span className="navbar-burger-line" aria-hidden />
              <span className="navbar-burger-line" aria-hidden />
              <span className="navbar-burger-line" aria-hidden />
            </button>
            <Link
              to="/"
              className="logo-mobile flex items-center shrink-0"
              aria-label="Corpore Sano home"
            >
              <img src={logo} alt="" className="w-[40px] h-[40px] shrink-0" />
            </Link>
          </div>
        )}

        {!isMobileNav && (
          <Link to="/" className="logo-desktop text-[#218c77] dark:text-[#4dc89f] text-[24px] font-semibold flex items-center shrink-0 min-w-0">
            <img src={logo} alt="Corpore Sano" className="w-[40px] h-[40px] shrink-0" />
            <span className="truncate logo-text">Corpore Sano</span>
          </Link>
        )}

        <nav className="nav-links hidden md:flex items-center shrink-0" aria-label="Main">
          <Link
            to="/"
            className={navLinkClass("/")}
            aria-current={isNavActive("/") ? "page" : undefined}
          >
            Home
          </Link>
          <Link
            to="/contact"
            className={navLinkClass("/contact")}
            aria-current={isNavActive("/contact") ? "page" : undefined}
          >
            Contact
          </Link>
          <Link
            to="/about"
            className={navLinkClass("/about")}
            aria-current={isNavActive("/about") ? "page" : undefined}
          >
            About
          </Link>
          {session && (
            <Link
              to="/admin"
              className={navLinkClass("/admin")}
              aria-current={isNavActive("/admin") ? "page" : undefined}
            >
              Admin
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <BookConsultationLink className="shrink-0 py-[10px] px-[16px] md:py-[8px] md:px-[24px] text-sm md:text-base font-semibold rounded-md bg-[#3aa57d] text-white hover:bg-[#3aa57d]/80 transition-all duration-300 whitespace-nowrap">
            {content.global.consultationCta}
          </BookConsultationLink>

          <button
            type="button"
            onClick={toggleTheme}
            className="shrink-0 rounded-lg border border-[#e1e5ec] bg-[#f5f8fa] p-2 text-[#103152] transition-colors hover:bg-[#e8ecf1] dark:border-[#2a3441] dark:bg-[#1e2835] dark:text-[#e8ecf1] dark:hover:bg-[#2a3441]"
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? (
              <MdLightMode className="h-5 w-5" aria-hidden />
            ) : (
              <MdDarkMode className="h-5 w-5" aria-hidden />
            )}
          </button>
        </div>
      </div>


      {isMobileNav && (
        <nav
          id="mobile-nav"
          className={`nav-links-mobile ${menuOpen ? "nav-links-mobile--open pointer-events-auto" : "pointer-events-none"}`}
          aria-hidden={!menuOpen}
        >
          <Link
            to="/"
            className={`${navLinkClass("/")} nav-links-item--mobile`}
            aria-current={isNavActive("/") ? "page" : undefined}
          >
            Home
          </Link>
          <Link
            to="/contact"
            className={`${navLinkClass("/contact")} nav-links-item--mobile`}
            aria-current={isNavActive("/contact") ? "page" : undefined}
          >
            Contact
          </Link>
          <Link
            to="/about"
            className={`${navLinkClass("/about")} nav-links-item--mobile`}
            aria-current={isNavActive("/about") ? "page" : undefined}
          >
            About
          </Link>
          {session && (
            <Link
              to="/admin"
              className={`${navLinkClass("/admin")} nav-links-item--mobile`}
              aria-current={isNavActive("/admin") ? "page" : undefined}
            >
              Admin
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}

export default Navbar;