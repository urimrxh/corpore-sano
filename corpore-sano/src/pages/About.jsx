import AboutSplitSection from "../components/AboutSplitSection";
import { useSiteContent } from "../context/SiteContentContext";
import Seo from "../components/Seo";
import { SEO_ABOUT_DESCRIPTION, SEO_ABOUT_TITLE } from "../seoCopy";

function About() {
  const { content } = useSiteContent();
  const { pageTitle, pageIntro, sections } = content.about;

  return (
    <>
      <Seo title={SEO_ABOUT_TITLE} description={SEO_ABOUT_DESCRIPTION} path="/about" />
      <section className="page-section">
        <div className="container">
          <h1 className="mb-3 text-center text-[28px] font-semibold leading-tight text-[#103152] dark:text-[#e8ecf1] md:text-[36px]">
            {pageTitle}
          </h1>
          <p className="mx-auto mb-2 max-w-2xl text-center text-[15px] leading-relaxed text-[#4d515c] dark:text-[#b8c4d0] md:text-base">
            {pageIntro}
          </p>
        </div>
      </section>

      {sections.map((section) => (
        <AboutSplitSection
          key={section.id}
          id={section.id}
          image={section.image}
          imageAlt={section.imageAlt}
          title={section.title}
          body={section.body}
          imageLeft={section.imageLeft}
          textPanelTheme={section.textPanelTheme}
        />
      ))}
    </>
  );
}

export default About;
