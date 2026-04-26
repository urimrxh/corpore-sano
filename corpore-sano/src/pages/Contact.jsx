import ContactForm from "../components/ContactForm";
import { useSiteContent } from "../context/SiteContentContext";
import defaultContactBg from "../assets/contact-background-image.png";
import "../style/contact.css";
import Seo from "../components/Seo";

function Contact() {
  const { content } = useSiteContent();
  const { pageTitle, pageIntro, backgroundImageUrl } = content.contact;
  const bg =
    backgroundImageUrl?.trim() || defaultContactBg;

  return (
    <>
      <Seo
        title="Contact Corpore Sano | Nutrition and Health Consultations"
        description="Contact Corpore Sano for questions about online consultations, nutrition support, and health-related services."
        path="/contact"
      />
      <section
        className="contact-page"
        style={{ backgroundImage: `url(${bg})` }}
      >
      <div className="container">
        <h1 className="mb-3 text-center text-[28px] font-semibold leading-tight text-[#103152] dark:text-[#e8ecf1] md:text-[36px]">
          {pageTitle}
        </h1>
        <p className="mx-auto mb-6 max-w-2xl text-center text-[15px] leading-relaxed text-[#4d515c] dark:text-[#b8c4d0] md:text-base">
          {pageIntro}
        </p>
        <ContactForm labels={content.contact.form.labels} />
      </div>
    </section>
    </>
  );
}

export default Contact;
