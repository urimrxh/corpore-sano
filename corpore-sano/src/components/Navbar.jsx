import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "../style/navbar.css";
import logo from "../assets/logo.png";

const MOBILE_NAV_MQ = "(max-width: 767px)";

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
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const isMobileNav = useIsMobileNav();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMobileNav) setMenuOpen(false);
  }, [isMobileNav]);

  return (
    <header className="site-header bg-white relative">
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
            <Link to="/" className="logo-mobile text-[#218c77] text-[18px] font-semibold flex items-center shrink-0 min-w-0">
              <img src={logo} alt="Corpore Sano" className="w-[40px] h-[40px] shrink-0" />
              <span className="truncate logo-text">Corpore Sano</span>
            </Link>
          </div>
        )}

        {!isMobileNav && (
          <Link to="/" className="logo-desktop text-[#218c77] text-[24px] font-semibold flex items-center shrink-0 min-w-0">
            <img src={logo} alt="Corpore Sano" className="w-[40px] h-[40px] shrink-0" />
            <span className="truncate logo-text">Corpore Sano</span>
          </Link>
        )}

        <nav className="nav-links hidden md:flex items-center shrink-0" aria-label="Main">
          <Link to="/" className="nav-links-item">Home</Link>
          <Link to="/contact" className="nav-links-item">Contact</Link>
          <Link to="/about" className="nav-links-item">About</Link>
        </nav>

        <Link
          to="/"
          className="shrink-0 py-[10px] px-[16px] md:py-[8px] md:px-[24px] text-sm md:text-base font-semibold rounded-md bg-[#3aa57d] text-white hover:bg-[#3aa57d]/80 transition-all duration-300 whitespace-nowrap"
        >
          Free Consultation
        </Link>
      </div>


      {isMobileNav && (
        <nav
          id="mobile-nav"
          className={`nav-links-mobile ${menuOpen ? "nav-links-mobile--open pointer-events-auto" : "pointer-events-none"}`}
          aria-hidden={!menuOpen}
        >
          <Link to="/" className="nav-links-item nav-links-item--mobile">
            Home
          </Link>
          <Link to="/contact" className="nav-links-item nav-links-item--mobile">
            Contact
          </Link>
          <Link to="/about" className="nav-links-item nav-links-item--mobile">
            About
          </Link>
        </nav>
      )}
    </header>
  );
}

export default Navbar;