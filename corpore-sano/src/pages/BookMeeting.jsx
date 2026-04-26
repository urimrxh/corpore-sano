import { useSiteContent } from "../context/SiteContentContext";
import { useI18n } from "../context/I18nContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import BookingScheduler from "../components/BookMeeting";
import Seo from "../components/Seo";
import { SEO_BOOK_MEETING_DESCRIPTION, SEO_BOOK_MEETING_TITLE } from "../seoCopy";

function BookMeetingPage() {
  const { content } = useSiteContent();
  const { t } = useI18n();
  const { title, intro } = content.bookMeeting;
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const verify = searchParams.get("verify");
  const calendarSync = searchParams.get("calendarSync");

  const isVerifiedSuccess = verify === "success";

  const verifyBanner =
    verify === "success" && calendarSync === "failed"
      ? {
          text: t("bookMeetingPage.verifyCalendarSyncFailed"),
          className:
            "rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-100",
        }
      : verify === "success"
        ? {
            text: t("bookMeetingPage.verifySuccess"),
            className:
              "rounded-md border border-[#3aa57d]/50 bg-[#e8f5ef] px-4 py-3 text-sm text-[#103152] dark:border-[#3aa57d]/30 dark:bg-[#161d27] dark:text-[#b8c4d0]",
          }
        : verify === "invalid" || verify === "missing"
          ? {
              text: t("bookMeetingPage.verifyInvalid"),
              className:
                "rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-100",
            }
          : verify === "already"
            ? {
                text: t("bookMeetingPage.verifyAlready"),
                className:
                  "rounded-md border border-[#e1e5ec] bg-[#f5f8fa] px-4 py-3 text-sm text-[#103152] dark:border-[#2a3441] dark:bg-[#1e2835] dark:text-[#e8ecf1]",
              }
            : verify === "error"
              ? {
                  text: t("bookMeetingPage.verifyError"),
                  className:
                    "rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200",
                }
              : null;

  if (isVerifiedSuccess && verifyBanner) {
    return (
      <>
        <Seo title={SEO_BOOK_MEETING_TITLE} description={SEO_BOOK_MEETING_DESCRIPTION} path="/book-meeting" />
        <section className="page-section">
          <div className="container">
          <div className="mx-auto max-w-2xl">
            <h1 className="mb-3 text-[28px] font-semibold text-[#103152] dark:text-[#e8ecf1] md:text-[32px]">
              {title}
            </h1>

            <p className="mb-6 text-[#4d515c] dark:text-[#b8c4d0]">
              {t("bookMeetingPage.confirmedLine")}
            </p>

            <div className={verifyBanner.className}>{verifyBanner.text}</div>

            <div className="mt-6">
              <button
                type="button"
                onClick={() => navigate("/")}
                className="inline-flex items-center rounded-md bg-[#218c77] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#1b7361] dark:bg-[#3aa57d] dark:hover:bg-[#318c6b]"
              >
                {t("bookMeetingPage.continue")}
              </button>
            </div>
          </div>
        </div>
      </section>
      </>
    );
  }

  return (
    <>
      <Seo title={SEO_BOOK_MEETING_TITLE} description={SEO_BOOK_MEETING_DESCRIPTION} path="/book-meeting" />
      <section className="page-section">
      <div className="container">
        <h1 className="mb-3 text-[28px] font-semibold text-[#103152] dark:text-[#e8ecf1] md:text-[32px]">
          {title}
        </h1>

        <p className="max-w-2xl text-[#4d515c] dark:text-[#b8c4d0]">
          {intro}
        </p>

        {verifyBanner && (
          <div className="mt-4 max-w-2xl">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <p className={verifyBanner.className}>{verifyBanner.text}</p>

              <button
                type="button"
                className="shrink-0 text-sm font-medium text-[#218c77] underline dark:text-[#4dc89f]"
                onClick={() => {
                  const next = new URLSearchParams(searchParams);
                  next.delete("verify");
                  next.delete("calendarSync");
                  setSearchParams(next, { replace: true });
                }}
              >
                {t("bookMeetingPage.dismiss")}
              </button>
            </div>
          </div>
        )}

        <BookingScheduler />
      </div>
    </section>
    </>
  );
}

export default BookMeetingPage;
