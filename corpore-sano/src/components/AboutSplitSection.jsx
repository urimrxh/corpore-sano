import "../style/aboutSplit.css";

const VALID_TEXT_PANEL_THEMES = new Set([
  "grey",
  "green-teal",
  "green-mint",
  "white",
  "navy",
  "black",
]);

function AboutSplitSection({ id, image, imageAlt, title, body, imageLeft, textPanelTheme }) {
  const headingId = `${id}-heading`;
  const panel =
    textPanelTheme && VALID_TEXT_PANEL_THEMES.has(textPanelTheme)
      ? textPanelTheme
      : "grey";

  return (
    <section
      className={`about-split${imageLeft ? "" : " about-split--image-right"}`}
      aria-labelledby={headingId}
    >
      <div className="about-split__media">
        <img src={image} alt={imageAlt || ""} loading="lazy" decoding="async" />
      </div>
      <div className={`about-split__text about-split__text--${panel}`}>
        <h2 id={headingId} className="about-split__heading">
          {title}
        </h2>
        <p className="about-split__body">{body}</p>
      </div>
    </section>
  );
}

export default AboutSplitSection;
