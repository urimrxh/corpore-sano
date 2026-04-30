import { useState } from "react";
import { useI18n } from "../context/I18nContext";
import { submitContactForm } from "../lib/contactSubmit";
import "../style/scheduleInputs.css";

function ContactForm({ labels }) {
  const { t, locale } = useI18n();
  const [status, setStatus] = useState("idle");
  const [errorDetail, setErrorDetail] = useState("");
  const [emailSent, setEmailSent] = useState(true);

  const L = labels || {
    fullName: t("contactForm.fullName"),
    email: t("contactForm.email"),
    subject: t("contactForm.subject"),
    message: t("contactForm.message"),
    subjectPlaceholder: t("contactForm.subjectPlaceholder"),
    messagePlaceholder: t("contactForm.messagePlaceholder"),
    submit: t("contactForm.submit"),
    success: t("contactForm.success"),
  };

  async function handleSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    if (!(form instanceof HTMLFormElement)) return;

    setStatus("submitting");
    setErrorDetail("");

    const fd = new FormData(form);
    const website = (fd.get("website") || "").toString().trim();

    const fullName = (fd.get("name") || "").toString().trim();
    const email = (fd.get("email") || "").toString().trim();
    const subject = (fd.get("subject") || "").toString().trim();
    const message = (fd.get("message") || "").toString().trim();

    const result = await submitContactForm({
      fullName,
      email,
      subject,
      message,
      locale: locale === "en" ? "en" : "sq",
      website,
    });

    if (result.ok) {
      setEmailSent(result.emailSent !== false);
      setStatus("success");
      form.reset();
      return;
    }

    setStatus("error");
    const code = result.code;
    if (code === "VALIDATION" || code === "BAD_JSON") {
      setErrorDetail(t("contactForm.errorValidation"));
    } else if (code === "NETWORK" || code === "NO_URL") {
      setErrorDetail(t("contactForm.errorNetwork"));
    } else {
      setErrorDetail(result.error || t("contactForm.errorGeneric"));
    }
  }

  const isSubmitting = status === "submitting";

  return (
    <form
      className="schedule-inputs relative mx-auto w-full max-w-xl text-left bg-white dark:bg-[#161d27] rounded-lg py-4 px-6 md:max-w-2xl"
      onSubmit={handleSubmit}
    >
      {/* Honeypot: hidden from users; bots often fill this. */}
      <div className="sr-only" aria-hidden="true">
        <label htmlFor="contact-form-website">Website</label>
        <input
          id="contact-form-website"
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <p className="text-[18px] text-[#103152] dark:text-[#e8ecf1] font-semibold">{L.fullName}</p>
      <input
        type="text"
        name="name"
        required
        autoComplete="name"
        disabled={isSubmitting}
        className="schedule-inputs__input w-full bg-[#f5f8fa] dark:bg-[#1e2835] dark:border-[#2a3441] dark:text-[#e8ecf1] rounded-md p-2 border-1 border-[#e1e5ec] my-2"
      />

      <p className="text-[18px] text-[#103152] dark:text-[#e8ecf1] font-semibold">{L.email}</p>
      <input
        type="email"
        name="email"
        required
        autoComplete="email"
        disabled={isSubmitting}
        className="schedule-inputs__input w-full bg-[#f5f8fa] dark:bg-[#1e2835] dark:border-[#2a3441] dark:text-[#e8ecf1] rounded-md p-2 border-1 border-[#e1e5ec] my-2"
      />

      <p className="text-[18px] text-[#103152] dark:text-[#e8ecf1] font-semibold">{L.subject}</p>
      <input
        type="text"
        name="subject"
        required
        disabled={isSubmitting}
        className="schedule-inputs__input w-full bg-[#f5f8fa] dark:bg-[#1e2835] dark:border-[#2a3441] dark:text-[#e8ecf1] rounded-md p-2 border-1 border-[#e1e5ec] my-2"
        placeholder={L.subjectPlaceholder}
      />

      <p className="text-[18px] text-[#103152] dark:text-[#e8ecf1] font-semibold">{L.message}</p>
      <textarea
        name="message"
        required
        rows={5}
        disabled={isSubmitting}
        className="schedule-inputs__input schedule-inputs__textarea w-full bg-[#f5f8fa] dark:bg-[#1e2835] dark:border-[#2a3441] dark:text-[#e8ecf1] rounded-md p-2 border-1 border-[#e1e5ec] my-2"
        placeholder={L.messagePlaceholder}
      />

      <div className="mt-6 flex flex-col items-center gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="py-[14px] px-[32px] md:py-[16px] md:px-[120px] text-sm md:text-[18px] font-semibold rounded-md bg-[#3aa57d] text-white hover:bg-[#3aa57d]/80 transition-all duration-300 whitespace-nowrap hover:cursor-pointer w-full sm:w-auto disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? t("contactForm.submitting") : L.submit}
        </button>
        {status === "success" && (
          <div className="flex flex-col gap-1 text-center" role="status">
            <p className="text-sm text-[#3aa57d] dark:text-[#5dcc9f] font-medium">{L.success}</p>
            {!emailSent ? (
              <p className="text-sm text-[#b45309] dark:text-[#fbbf24]">{t("contactForm.emailPartialWarning")}</p>
            ) : null}
          </div>
        )}
        {status === "error" && (
          <p className="text-center text-sm text-[#b91c1c] dark:text-[#fca5a5] font-medium" role="alert">
            {errorDetail}
          </p>
        )}
      </div>
    </form>
  );
}

export default ContactForm;
