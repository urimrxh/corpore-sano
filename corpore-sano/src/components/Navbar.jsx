import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { MdCheck, MdDarkMode, MdKeyboardArrowDown, MdLightMode } from "react-icons/md";
import { useSiteContent } from "../context/SiteContentContext";
import { isSectionHidden } from "../lib/sectionVisibility";
import { useI18n } from "../context/I18nContext";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { fetchNavPostTags } from "../lib/postsApi";
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

function LanguageSwitcher({ compact = false }) {
  const { locale, setLocale, t } = useI18n();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const options = useMemo(
    () => [
      { value: "sq", label: t("language.sq"), code: "SQ" },
      { value: "en", label: t("language.en"), code: "EN" },
    ],
    [t],
  );

  const currentOption = options.find((o) => o.value === locale) ?? options[0];
  const currentLabel = currentOption.label;
  const triggerText = compact ? currentOption.code : currentLabel;
  const triggerAriaLabel = `${t("language.label")}: ${currentLabel}`;

  useEffect(() => {
    if (!open) return;

    const onDoc = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pick(next) {
    setLocale(next);
    setOpen(false);
  }

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <label className="sr-only" htmlFor="site-language-trigger">
        {t("language.label")}
      </label>
      <button
        type="button"
        id="site-language-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls="site-language-listbox"
        aria-label={triggerAriaLabel}
        onClick={() => setOpen((v) => !v)}
        className={`relative flex h-[42px] items-center rounded-lg border border-[#e1e5ec] bg-[#f5f8fa] text-[#103152] shadow-sm outline-none transition-[border-color,box-shadow,background-color,transform] duration-200 ease-out hover:bg-[#e8ecf1] focus-visible:border-[#218c77] focus-visible:ring-2 focus-visible:ring-[#218c77]/35 dark:border-[#2a3441] dark:bg-[#1e2835] dark:text-[#e8ecf1] dark:hover:bg-[#2a3441] dark:focus-visible:border-[#4dc89f] dark:focus-visible:ring-[#4dc89f]/30 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 ${
          compact
            ? "min-w-[2.875rem] max-w-[3.35rem] justify-center px-1.5 pr-7 text-xs font-semibold tracking-wide tabular-nums"
            : "min-w-[7.5rem] max-w-[8.5rem] justify-start py-2 pl-3 pr-10 text-left text-sm"
        }`}
      >
        <span
          className={`transition-opacity duration-150 ease-out motion-reduce:transition-none ${
            compact ? "w-full text-center" : "min-w-0 flex-1 truncate"
          }`}
        >
          {triggerText}
        </span>
        <MdKeyboardArrowDown
          className={`pointer-events-none absolute top-1/2 h-5 w-5 shrink-0 -translate-y-1/2 text-[#103152]/70 transition-transform duration-200 ease-out dark:text-[#e8ecf1]/75 motion-reduce:transition-none ${compact ? "right-1.5" : "right-2.5"} ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      <div
        id="site-language-listbox"
        role="listbox"
        aria-label={t("language.label")}
        className={`absolute right-0 z-[120] mt-1.5 min-w-[11rem] origin-top-right rounded-lg border border-[#e1e5ec] bg-white py-1 shadow-lg shadow-[#103152]/10 transition-[opacity,transform,visibility] duration-200 ease-out dark:border-[#2a3441] dark:bg-[#1e2835] dark:shadow-black/40 motion-reduce:transition-none ${
          open
            ? "visible translate-y-0 scale-100 opacity-100"
            : "invisible pointer-events-none -translate-y-1 scale-[0.97] opacity-0"
        }`}
      >
        {options.map((opt) => {
          const selected = locale === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={selected}
              onClick={() => pick(opt.value)}
              className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors duration-150 ease-out motion-reduce:transition-none ${
                selected
                  ? "bg-[#218c77]/12 font-medium text-[#218c77] dark:bg-[#4dc89f]/15 dark:text-[#4dc89f]"
                  : "text-[#103152] hover:bg-[#f0f4f8] dark:text-[#e8ecf1] dark:hover:bg-[#2a3441]"
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center transition-opacity duration-150 motion-reduce:transition-none ${
                  selected ? "opacity-100" : "opacity-0"
                }`}
                aria-hidden
              >
                <MdCheck className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1 truncate">{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Navbar() {
  const { content, siteBilingualEnabled } = useSiteContent();
  const postsHidden = isSectionHidden(content, "posts");
  const { t, setLocale } = useI18n();

  useEffect(() => {
    if (!siteBilingualEnabled) setLocale("sq");
  }, [siteBilingualEnabled, setLocale]);
  const { theme, toggleTheme } = useTheme();
  const { session } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [headerHidden, setHeaderHidden] = useState(false);
  const [postTags, setPostTags] = useState([]);
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
    if (postsHidden) return undefined;
    let cancelled = false;

    (async () => {
      const { data, error } = await fetchNavPostTags();
      if (!cancelled && !error) {
        setPostTags(data || []);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [postsHidden]);

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
              aria-label={menuOpen ? t("nav.closeMenu") : t("nav.openMenu")}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span className="navbar-burger-line" aria-hidden />
              <span className="navbar-burger-line" aria-hidden />
              <span className="navbar-burger-line" aria-hidden />
            </button>
            <Link
              to="/"
              className="logo-mobile flex items-center shrink-0"
              aria-label={t("nav.homeAria")}
            >
              <img src={logo} alt="" className="w-[40px] h-[40px] shrink-0" />
            </Link>
          </div>
        )}

        {!isMobileNav && (
          <Link
            to="/"
            className="logo-desktop text-[#218c77] dark:text-[#4dc89f] text-[24px] font-semibold flex items-center shrink-0 min-w-0"
          >
            <img src={logo} alt="Corpore Sano" className="w-[40px] h-[40px] shrink-0" />
            <span className="truncate logo-text">Corpore Sano</span>
          </Link>
        )}

        <nav className="nav-links hidden md:flex items-center shrink-0" aria-label={t("nav.mainNav")}>
          <Link
            to="/"
            className={navLinkClass("/")}
            aria-current={isNavActive("/") ? "page" : undefined}
          >
            {t("nav.home")}
          </Link>
          <Link
            to="/contact"
            className={navLinkClass("/contact")}
            aria-current={isNavActive("/contact") ? "page" : undefined}
          >
            {t("nav.contact")}
          </Link>
          <Link
            to="/about"
            className={navLinkClass("/about")}
            aria-current={isNavActive("/about") ? "page" : undefined}
          >
            {t("nav.about")}
          </Link>

          {!postsHidden
            ? postTags.map((tag) => {
                const tagPath = `/posts/tag/${tag.slug}`;
                return (
                  <Link
                    key={tag.id}
                    to={tagPath}
                    className={navLinkClass(tagPath)}
                    aria-current={isNavActive(tagPath) ? "page" : undefined}
                  >
                    {tag.name}
                  </Link>
                );
              })
            : null}

          {session && (
            <Link
              to="/admin"
              className={navLinkClass("/admin")}
              aria-current={isNavActive("/admin") ? "page" : undefined}
            >
              {t("nav.admin")}
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <BookConsultationLink className="shrink-0 py-[10px] px-[16px] md:py-[8px] md:px-[24px] text-sm md:text-base font-semibold rounded-md bg-[#3aa57d] text-white hover:bg-[#3aa57d]/80 transition-all duration-300 whitespace-nowrap">
            {content.global.consultationCta}
          </BookConsultationLink>

          {siteBilingualEnabled ? <LanguageSwitcher compact={isMobileNav} /> : null}

          <button
            type="button"
            onClick={toggleTheme}
            className="shrink-0 rounded-lg border border-[#e1e5ec] bg-[#f5f8fa] p-2 text-[#103152] transition-colors hover:bg-[#e8ecf1] dark:border-[#2a3441] dark:bg-[#1e2835] dark:text-[#e8ecf1] dark:hover:bg-[#2a3441] hover:cursor-pointer"
            aria-label={theme === "dark" ? t("nav.themeLight") : t("nav.themeDark")}
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
            {t("nav.home")}
          </Link>
          <Link
            to="/contact"
            className={`${navLinkClass("/contact")} nav-links-item--mobile`}
            aria-current={isNavActive("/contact") ? "page" : undefined}
          >
            {t("nav.contact")}
          </Link>
          <Link
            to="/about"
            className={`${navLinkClass("/about")} nav-links-item--mobile`}
            aria-current={isNavActive("/about") ? "page" : undefined}
          >
            {t("nav.about")}
          </Link>

          {!postsHidden
            ? postTags.map((tag) => {
                const tagPath = `/posts/tag/${tag.slug}`;
                return (
                  <Link
                    key={tag.id}
                    to={tagPath}
                    className={`${navLinkClass(tagPath)} nav-links-item--mobile`}
                    aria-current={isNavActive(tagPath) ? "page" : undefined}
                  >
                    {tag.name}
                  </Link>
                );
              })
            : null}

          {session && (
            <Link
              to="/admin"
              className={`${navLinkClass("/admin")} nav-links-item--mobile`}
              aria-current={isNavActive("/admin") ? "page" : undefined}
            >
              {t("nav.admin")}
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}

export default Navbar;