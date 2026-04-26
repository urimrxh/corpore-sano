import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import { useSiteContent } from "../context/SiteContentContext";
import { isSectionHidden } from "../lib/sectionVisibility";
import "../style/home.css";
import BookingScheduler from "../components/BookMeeting";
import HeroWaves from "../components/HeroWaves";
import VideosSection from "../components/VideoSection";
import HomeLatestPostsSection from "../components/HomeLatestPostsSection";
import HomeHeroBanner from "../components/home/HomeHeroBanner";
import Seo, { SITE_URL } from "../components/Seo";
import { SEO_HOME_DESCRIPTION, SEO_HOME_TITLE } from "../seoCopy";

const HOME_JSON_LD = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Corpore Sano",
    url: SITE_URL,
    logo: "https://corporesano-ks.com/logo.png",
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Corpore Sano",
    url: SITE_URL,
  },
];

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
      <Seo title={SEO_HOME_TITLE} description={SEO_HOME_DESCRIPTION} path="/" jsonLd={HOME_JSON_LD} />
      <HomeHeroBanner />
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
          {!isSectionHidden(content, "homeLatestPosts") ? (
            <HomeLatestPostsSection />
          ) : null}
          {!isSectionHidden(content, "homeVideos") ? <VideosSection /> : null}
        </div>
      </section>
    </>
  );
}

export default Home;
