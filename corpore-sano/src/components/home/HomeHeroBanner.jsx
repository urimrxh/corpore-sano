import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import { useI18n } from "../../context/I18nContext";
import { bannerTextColorStyle, getActiveHeroBanners, normalizeCtaUrl } from "../../lib/heroBannersApi";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "../../style/homeHeroBanner.css";

/**
 * @param {'sq'|'en'} locale
 * @param {string} sq
 * @param {string} en
 */
function pickLine(locale, sq, en) {
  const primary = (locale === "en" ? en : sq) || "";
  const trimmed = primary.trim();
  if (trimmed) return trimmed;
  const fallback = (locale === "en" ? sq : en) || "";
  return fallback.trim();
}

/**
 * @param {object} banner
 * @param {'sq'|'en'} locale
 */
function bannerTexts(banner, locale) {
  const title = pickLine(locale, banner.title_sq, banner.title_en);
  const subtitle = pickLine(locale, banner.subtitle_sq, banner.subtitle_en);
  const ctaLabel = pickLine(locale, banner.cta_label_sq, banner.cta_label_en);
  const ctaUrl = normalizeCtaUrl(banner.cta_url);
  const showCta = Boolean(ctaUrl && ctaLabel);
  return { title, subtitle, ctaLabel, ctaUrl, showCta };
}

function HeroCta({ href, children, className }) {
  const raw = (href || "").trim();
  const lower = raw.toLowerCase();
  const isMailOrTel = lower.startsWith("mailto:") || lower.startsWith("tel:");
  const isHttp = /^https?:\/\//i.test(raw) || raw.startsWith("//");
  if (!isHttp && raw.startsWith("/")) {
    return (
      <Link to={raw} className={className}>
        {children}
      </Link>
    );
  }
  const openInNewTab = (isHttp || raw.startsWith("//")) && !isMailOrTel;
  return (
    <a
      href={raw}
      className={className}
      {...(openInNewTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
    </a>
  );
}

export default function HomeHeroBanner() {
  const { locale } = useI18n();
  const [banners, setBanners] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await getActiveHeroBanners();
      if (cancelled) return;
      if (error) {
        setBanners([]);
        return;
      }
      setBanners(data || []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const slides = useMemo(() => {
    if (!banners?.length) return [];
    return banners.filter(
      (b) => b.image_url && pickLine(locale, b.title_sq, b.title_en),
    );
  }, [banners, locale]);

  if (banners === null || slides.length === 0) {
    return null;
  }

  const useLoop = slides.length > 1;

  return (
    <div className="home-hero-banner mb-6 md:mb-8">
      <div className="home-hero-banner__viewport">
        <Swiper
          className="home-hero-banner__swiper"
          modules={[Autoplay, Navigation, Pagination]}
          spaceBetween={0}
          slidesPerView={1}
          loop={useLoop}
          speed={650}
          autoplay={{
            delay: 3300,
            disableOnInteraction: false,
            pauseOnMouseEnter: true,
          }}
          pagination={{ clickable: true }}
          navigation={useLoop}
        >
          {slides.map((banner) => {
            const { title, subtitle, ctaLabel, ctaUrl, showCta } = bannerTexts(banner, locale);
            const titleStyle = bannerTextColorStyle(banner.title_color);
            const subtitleStyle = bannerTextColorStyle(banner.subtitle_color);
            return (
              <SwiperSlide key={banner.id} className="home-hero-banner__slide">
                <div className="home-hero-banner__media">
                  <img
                    src={banner.image_url}
                    alt={title}
                    className="home-hero-banner__img"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="home-hero-banner__overlay" aria-hidden />
                  <div className="home-hero-banner__inner">
                    <h2 className="home-hero-banner__title" style={titleStyle}>
                      {title}
                    </h2>
                    {subtitle ? (
                      <p className="home-hero-banner__subtitle" style={subtitleStyle}>
                        {subtitle}
                      </p>
                    ) : null}
                    {showCta ? (
                      <HeroCta href={ctaUrl} className="home-hero-banner__cta">
                        {ctaLabel}
                      </HeroCta>
                    ) : null}
                  </div>
                </div>
              </SwiperSlide>
            );
          })}
        </Swiper>
      </div>
    </div>
  );
}
