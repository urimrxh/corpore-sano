import { useState } from "react";
import "../style/scheduleInputs.css";

function ContactForm({ labels }) {
  const [status, setStatus] = useState("idle");

  const L = labels || {
    fullName: "Full name",
    email: "Email",
    subject: "Subject",
    message: "Message",
    subjectPlaceholder: "What is your message about?",
    messagePlaceholder: "Write your message here…",
    submit: "Send message",
    success:
      "Thanks — your message has been recorded. We’ll get back to you soon.",
  };

  function handleSubmit(e) {
    e.preventDefault();
    setStatus("sent");
    const form = e.target;
    if (form instanceof HTMLFormElement) form.reset();
    window.setTimeout(() => setStatus("idle"), 4000);
  }

  return (
    <form
      className="schedule-inputs mx-auto w-full max-w-xl text-left bg-white dark:bg-[#161d27] rounded-lg py-4 px-6 md:max-w-2xl"
      onSubmit={handleSubmit}
    >
      <p className="text-[18px] text-[#103152] dark:text-[#e8ecf1] font-semibold">{L.fullName}</p>
      <input
        type="text"
        name="name"
        required
        autoComplete="name"
        className="schedule-inputs__input w-full bg-[#f5f8fa] dark:bg-[#1e2835] dark:border-[#2a3441] dark:text-[#e8ecf1] rounded-md p-2 border-1 border-[#e1e5ec] my-2"
      />

      <p className="text-[18px] text-[#103152] dark:text-[#e8ecf1] font-semibold">{L.email}</p>
      <input
        type="email"
        name="email"
        required
        autoComplete="email"
        className="schedule-inputs__input w-full bg-[#f5f8fa] dark:bg-[#1e2835] dark:border-[#2a3441] dark:text-[#e8ecf1] rounded-md p-2 border-1 border-[#e1e5ec] my-2"
      />

      <p className="text-[18px] text-[#103152] dark:text-[#e8ecf1] font-semibold">{L.subject}</p>
      <input
        type="text"
        name="subject"
        required
        className="schedule-inputs__input w-full bg-[#f5f8fa] dark:bg-[#1e2835] dark:border-[#2a3441] dark:text-[#e8ecf1] rounded-md p-2 border-1 border-[#e1e5ec] my-2"
        placeholder={L.subjectPlaceholder}
      />

      <p className="text-[18px] text-[#103152] dark:text-[#e8ecf1] font-semibold">{L.message}</p>
      <textarea
        name="message"
        required
        rows={5}
        className="schedule-inputs__input schedule-inputs__textarea w-full bg-[#f5f8fa] dark:bg-[#1e2835] dark:border-[#2a3441] dark:text-[#e8ecf1] rounded-md p-2 border-1 border-[#e1e5ec] my-2"
        placeholder={L.messagePlaceholder}
      />

      <div className="mt-6 flex flex-col items-center gap-3">
        <button
          type="submit"
          className="py-[14px] px-[32px] md:py-[16px] md:px-[120px] text-sm md:text-[18px] font-semibold rounded-md bg-[#3aa57d] text-white hover:bg-[#3aa57d]/80 transition-all duration-300 whitespace-nowrap hover:cursor-pointer w-full sm:w-auto"
        >
          {L.submit}
        </button>
        {status === "sent" && (
          <p className="text-center text-sm text-[#3aa57d] dark:text-[#5dcc9f] font-medium" role="status">
            {L.success}
          </p>
        )}
      </div>
    </form>
  );
}

export default ContactForm;
