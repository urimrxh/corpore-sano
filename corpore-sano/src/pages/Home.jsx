import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import { useSiteContent } from "../context/SiteContentContext";
import "../style/home.css";
import BookingScheduler from "../components/BookMeeting";
import HeroWaves from "../components/HeroWaves";
import VideosSection from "../components/VideoSection";

function Home() {
  const { content } = useSiteContent();
  const { heroTitle, heroDescription } = content.home;
  const location = useLocation();

  useLayoutEffect(() => {
    const raw = location.hash.replace(/^#/, "");
    if (raw !== "book-consultation" && raw !== "schedule-datetime") return;

    const id = raw === "schedule-datetime" ? "schedule-datetime" : "book-consultation";
    const el = document.getElementById(id);
    if (!el) return;

    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [location.pathname, location.hash]);

  return (
    <>
      <section className="hero">
        <HeroWaves />

        <div className="container hero-inner">
          <div id="book-consultation">
            <h1 className="hero-banner-title text-[#103152] dark:text-[#e8ecf1] text-[32px] md:text-[48px] font-semibold leading-[36px] md:leading-normal mb-[24px] md:mb-[auto]">
              {heroTitle}
            </h1>

            <p className="hero-banner-description text-[#4d515c] dark:text-[#b8c4d0]">{heroDescription}</p>
          </div>

          <BookingScheduler />
          <VideosSection />
        </div>
      </section>
    </>
  );
}

export default Home;
