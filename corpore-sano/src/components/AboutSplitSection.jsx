import "../style/aboutSplit.css";

function AboutSplitSection({ id, image, imageAlt, title, body, imageLeft }) {
  const headingId = `${id}-heading`;

  return (
    <section
      className={`about-split${imageLeft ? "" : " about-split--image-right"}`}
      aria-labelledby={headingId}
    >
      <div className="about-split__media">
        <img src={image} alt={imageAlt || ""} loading="lazy" decoding="async" />
      </div>
      <div className="about-split__text">
        <h2 id={headingId} className="about-split__heading">
          {title}
        </h2>
        <p className="about-split__body">{body}</p>
      </div>
    </section>
  );
}

export default AboutSplitSection;
