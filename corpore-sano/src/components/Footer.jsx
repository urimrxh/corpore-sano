import { Link } from "react-router-dom";
import BookConsultationLink from "./BookConsultationLink";
import { FaFacebook, FaInstagram, FaLinkedin } from "react-icons/fa";
import { MdEmail } from "react-icons/md";
import { useSiteContent } from "../context/SiteContentContext";
import logo from "../assets/logo.png";

function Footer() {
  const { content } = useSiteContent();
  const { brandName, phone, phoneHref, cityLine, address, email, social, copyright } =
    content.footer;

  return (
    <footer className="site-footer border-t border-[#e1e5ec] bg-white dark:border-[#2a3441] dark:bg-[#121a22]">
      <div className="container">
        <div className="py-8 md:py-9">
          <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
            <div className="footer-logo-column order-last flex shrink-0 flex-col items-start gap-4 md:order-none">
              <div className="footer-logo">
                <img
                  src={logo}
                  alt={brandName}
                  className="h-20 w-20 object-contain md:h-24 md:w-24"
                />
              </div>
              <BookConsultationLink className="footer-cta inline-flex items-center justify-center rounded-lg bg-[#3aa57d] px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#3aa57d]/90">
                {content.global.consultationCtaFooter}
              </BookConsultationLink>
            </div>

            <div className="flex w-full min-w-0 flex-col gap-10 sm:w-auto sm:flex-row sm:justify-end sm:gap-10 lg:gap-14 ml-auto">
              <nav
                className="footer-nav flex shrink-0 flex-col gap-3 sm:w-36 md:items-end"
                aria-label="Footer navigation"
              >
                <Link
                  to="/"
                  className="text-sm font-medium text-[#4d515c] transition-colors hover:text-[#218c77] dark:text-[#b8c4d0] dark:hover:text-[#4dc89f] md:text-right mr-auto"
                >
                  Home
                </Link>
                <Link
                  to="/contact"
                  className="text-sm font-medium text-[#4d515c] transition-colors hover:text-[#218c77] dark:text-[#b8c4d0] dark:hover:text-[#4dc89f] md:text-right mr-auto"
                >
                  Contact
                </Link>
                <Link
                  to="/about"
                  className="text-sm font-medium text-[#4d515c] transition-colors hover:text-[#218c77] dark:text-[#b8c4d0] dark:hover:text-[#4dc89f] md:text-right mr-auto"
                >
                  About
                </Link>
              </nav>

              <div className="footer-brand flex min-w-0 max-w-sm flex-col gap-4 md:items-end md:text-right">
                <address className="footer-contact flex flex-col gap-2 not-italic">
                  <p className="text-base font-semibold leading-snug text-[#103152] dark:text-[#e8ecf1]">
                    {brandName}
                  </p>
                  <a
                    href={`tel:${phoneHref}`}
                    className="text-sm text-[#4d515c] transition-colors hover:text-[#218c77] dark:text-[#b8c4d0] dark:hover:text-[#4dc89f]"
                  >
                    {phone}
                  </a>
                  <p className="text-sm leading-snug text-[#4d515c] dark:text-[#b8c4d0]">{cityLine}</p>
                  <p className="text-sm leading-relaxed text-[#4d515c] dark:text-[#b8c4d0]">{address}</p>
                  <a
                    href={`mailto:${email}`}
                    className="text-sm text-[#4d515c] transition-colors hover:text-[#218c77] dark:text-[#b8c4d0] dark:hover:text-[#4dc89f]"
                  >
                    {email}
                  </a>
                </address>

                <div
                  className="footer-social flex flex-wrap items-center gap-0.5 border-t border-[#e8ecf1] pt-4 dark:border-[#2a3441] md:justify-end"
                  aria-label="Social links"
                >
                  <a
                    href={social.facebook}
                    className="inline-flex items-center justify-center rounded-md p-1.5 text-[#103152] transition-colors hover:bg-[#e8ecf1] dark:text-[#e8ecf1] dark:hover:bg-[#1e2835]"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Facebook"
                  >
                    <FaFacebook className="h-5 w-5" aria-hidden />
                  </a>
                  <a
                    href={social.instagram}
                    className="inline-flex items-center justify-center rounded-md p-1.5 text-[#103152] transition-colors hover:bg-[#e8ecf1] dark:text-[#e8ecf1] dark:hover:bg-[#1e2835]"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                  >
                    <FaInstagram className="h-5 w-5" aria-hidden />
                  </a>
                  <a
                    href={social.linkedin}
                    className="inline-flex items-center justify-center rounded-md p-1.5 text-[#103152] transition-colors hover:bg-[#e8ecf1] dark:text-[#e8ecf1] dark:hover:bg-[#1e2835]"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="LinkedIn"
                  >
                    <FaLinkedin className="h-5 w-5" aria-hidden />
                  </a>
                  <a
                    href={social.emailMailto}
                    className="inline-flex items-center justify-center rounded-md p-1.5 text-[#103152] transition-colors hover:bg-[#e8ecf1] dark:text-[#e8ecf1] dark:hover:bg-[#1e2835]"
                    aria-label="Email"
                  >
                    <MdEmail className="h-5 w-5" aria-hidden />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="footer-copyright border-t border-[#e1e5ec] py-4 text-center text-xs text-[#6b7280] dark:border-[#2a3441] dark:text-[#8b95a3]">
          {copyright}
        </p>
      </div>
    </footer>
  );
}

export default Footer;
