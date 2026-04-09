import { Link } from "react-router-dom";
import BookConsultationLink from "./BookConsultationLink";
import { FaFacebook, FaInstagram, FaLinkedin } from "react-icons/fa";
import { MdEmail } from "react-icons/md";
import { useSiteContent } from "../context/SiteContentContext";
import { useI18n } from "../context/I18nContext";
import logo from "../assets/logo.png";

const FOOTER_INFO_ITEMS_PER_COLUMN = 5;

function chunkArray(items, size) {
  const chunks = [];

  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }

  return chunks;
}

function Footer({ headerNavItems = [] }) {
  const { content } = useSiteContent();
  const { t } = useI18n();
  const {
    brandName,
    phone,
    phoneHref,
    cityLine,
    address,
    email,
    social,
    copyright,
    extraInfoFields = [],
  } = content.footer;

  const baseNavItems = [
    { label: t("nav.home"), to: "/" },
    { label: t("nav.contact"), to: "/contact" },
    { label: t("nav.about"), to: "/about" },
  ];

  const allNavItems = [...baseNavItems, ...headerNavItems].filter(
    (item, index, self) =>
      item?.label &&
      item?.to &&
      index === self.findIndex((navItem) => navItem.to === item.to)
  );

  const footerInfoItems = [
    brandName
      ? { id: "brandName", type: "title", value: brandName }
      : null,
    phone
      ? {
          id: "phone",
          type: "phone",
          value: phone,
          href: phoneHref,
        }
      : null,
    cityLine
      ? { id: "cityLine", type: "text", value: cityLine, multiline: false }
      : null,
    address
      ? { id: "address", type: "text", value: address, multiline: true }
      : null,
    email
      ? { id: "email", type: "email", value: email }
      : null,
    ...(Array.isArray(extraInfoFields) ? extraInfoFields : []),
  ].filter((item) => item?.value?.trim());

  const footerInfoColumns = chunkArray(
    footerInfoItems,
    FOOTER_INFO_ITEMS_PER_COLUMN
  );

  function renderFooterInfoItem(item) {
    const value = item?.value?.trim();
    if (!value) return null;

    if (item.type === "title") {
      return (
        <p className="text-base font-semibold leading-snug text-[#103152] dark:text-[#e8ecf1]">
          {value}
        </p>
      );
    }

    if (item.type === "phone") {
      const href = (item.href || value).trim();
      return (
        <a
          href={`tel:${href}`}
          className="text-sm text-[#4d515c] transition-colors hover:text-[#218c77] dark:text-[#b8c4d0] dark:hover:text-[#4dc89f]"
        >
          {value}
        </a>
      );
    }

    if (item.type === "email") {
      const href = (item.href || value).trim();
      return (
        <a
          href={`mailto:${href}`}
          className="text-sm text-[#4d515c] transition-colors hover:text-[#218c77] dark:text-[#b8c4d0] dark:hover:text-[#4dc89f]"
        >
          {value}
        </a>
      );
    }

    return (
      <p
        className={`text-sm text-[#4d515c] dark:text-[#b8c4d0] ${
          item.multiline ? "leading-relaxed" : "leading-snug"
        }`}
      >
        {value}
      </p>
    );
  }

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

            <div className="ml-auto flex w-full min-w-0 flex-col gap-10 sm:w-auto sm:flex-row sm:justify-end sm:gap-10 lg:gap-14">
              <nav
                className="footer-nav flex shrink-0 flex-col gap-3 sm:w-36 md:items-end"
                aria-label={t("footer.navAria")}
              >
                {allNavItems.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="mr-auto text-sm font-medium text-[#4d515c] transition-colors hover:text-[#218c77] dark:text-[#b8c4d0] dark:hover:text-[#4dc89f] md:text-right"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              <div className="footer-brand flex min-w-0 max-w-4xl flex-col gap-4 md:items-end md:text-right">
                <div className="grid w-full gap-8 sm:grid-cols-2 lg:grid-cols-3 md:w-auto">
                  {footerInfoColumns.map((column, columnIndex) => (
                    <address
                      key={`footer-info-column-${columnIndex}`}
                      className="footer-contact flex min-w-0 flex-col gap-2 not-italic md:items-end"
                    >
                      {column.map((item) => (
                        <div key={item.id}>{renderFooterInfoItem(item)}</div>
                      ))}
                    </address>
                  ))}
                </div>

                <div
                  className="footer-social flex flex-wrap items-center gap-0.5 border-t border-[#e8ecf1] pt-4 dark:border-[#2a3441] md:justify-end"
                  aria-label={t("footer.socialAria")}
                >
                  <a
                    href={social.facebook}
                    className="inline-flex items-center justify-center rounded-md p-1.5 text-[#103152] transition-colors hover:bg-[#e8ecf1] dark:text-[#e8ecf1] dark:hover:bg-[#1e2835]"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t("footer.facebook")}
                  >
                    <FaFacebook className="h-5 w-5" aria-hidden />
                  </a>

                  <a
                    href={social.instagram}
                    className="inline-flex items-center justify-center rounded-md p-1.5 text-[#103152] transition-colors hover:bg-[#e8ecf1] dark:text-[#e8ecf1] dark:hover:bg-[#1e2835]"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t("footer.instagram")}
                  >
                    <FaInstagram className="h-5 w-5" aria-hidden />
                  </a>

                  <a
                    href={social.linkedin}
                    className="inline-flex items-center justify-center rounded-md p-1.5 text-[#103152] transition-colors hover:bg-[#e8ecf1] dark:text-[#e8ecf1] dark:hover:bg-[#1e2835]"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t("footer.linkedin")}
                  >
                    <FaLinkedin className="h-5 w-5" aria-hidden />
                  </a>

                  <a
                    href={social.emailMailto}
                    className="inline-flex items-center justify-center rounded-md p-1.5 text-[#103152] transition-colors hover:bg-[#e8ecf1] dark:text-[#e8ecf1] dark:hover:bg-[#1e2835]"
                    aria-label={t("footer.email")}
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