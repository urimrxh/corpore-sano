import { Link } from "react-router-dom";
import { normalizeCtaUrl } from "../lib/heroBannersApi";
import "../style/aboutSplit.css";

/** Like hero CTA normalization, but keeps mailto:/tel:/# intact. */
function resolveAboutHref(url) {
  const t = (url || "").trim();
  if (!t) return "";
  const lower = t.toLowerCase();
  if (lower.startsWith("mailto:") || lower.startsWith("tel:")) return t;
  if (lower.startsWith("#")) return t;
  return normalizeCtaUrl(t);
}

const VALID_TEXT_PANEL_THEMES = new Set([
  "grey",
  "green-teal",
  "green-mint",
  "white",
  "navy",
  "black",
]);

function AboutCtaLink({ href, children, className }) {
  const raw = (href || "").trim();
  const lower = raw.toLowerCase();
  const isMailOrTel = lower.startsWith("mailto:") || lower.startsWith("tel:");
  const isHash = lower.startsWith("#");
  const isHttp = /^https?:\/\//i.test(raw) || raw.startsWith("//");
  if (!isHttp && !isHash && raw.startsWith("/")) {
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

/** Full-section hit target: empty visual link, sits under content with pointer-events layering. */
function AboutSectionHitLink({ href, ariaLabel, className }) {
  const raw = (href || "").trim();
  const lower = raw.toLowerCase();
  const isMailOrTel = lower.startsWith("mailto:") || lower.startsWith("tel:");
  const isHash = lower.startsWith("#");
  const isHttp = /^https?:\/\//i.test(raw) || raw.startsWith("//");
  if (!isHttp && !isHash && raw.startsWith("/")) {
    return <Link to={raw} className={className} aria-label={ariaLabel} />;
  }
  const openInNewTab = (isHttp || raw.startsWith("//")) && !isMailOrTel;
  return (
    <a
      href={raw}
      className={className}
      aria-label={ariaLabel}
      {...(openInNewTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    />
  );
}

function AboutSplitSection({
  id,
  image,
  imageAlt,
  title,
  body,
  imageLeft,
  textPanelTheme,
  buttonLabel = "",
  buttonUrl = "",
  sectionUrl = "",
  isSectionClickable = false,
}) {
  const headingId = `${id}-heading`;
  const panel =
    textPanelTheme && VALID_TEXT_PANEL_THEMES.has(textPanelTheme)
      ? textPanelTheme
      : "grey";

  const btnHref = resolveAboutHref(buttonUrl);
  const showButton = Boolean((buttonLabel || "").trim() && btnHref);
  const secHref = resolveAboutHref(sectionUrl);
  const showHitLayer = Boolean(isSectionClickable && secHref);
  const hitLabel = (title || "").trim() || "Section link";

  const rootClass = [
    "about-split",
    imageLeft ? "" : "about-split--image-right",
    showHitLayer ? "about-split--hit-layer" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={rootClass} aria-labelledby={headingId}>
      {showHitLayer ? (
        <AboutSectionHitLink href={secHref} ariaLabel={hitLabel} className="about-split__hit" />
      ) : null}
      <div className="about-split__media">
        <img src={image} alt={imageAlt || ""} loading="lazy" decoding="async" />
      </div>
      <div className={`about-split__text about-split__text--${panel}`}>
        <h2 id={headingId} className="about-split__heading">
          {title}
        </h2>
        <p className="about-split__body">{body}</p>
        {showButton ? (
          <AboutCtaLink href={btnHref} className="about-split__cta">
            {(buttonLabel || "").trim()}
          </AboutCtaLink>
        ) : null}
      </div>
    </section>
  );
}

export default AboutSplitSection;
