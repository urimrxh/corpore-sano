import { sendResendEmail, escapeHtml, formatAppointment } from "./resendEmail.mjs";

function genderLabel(gender) {
  const value = String(gender || "").trim().toLowerCase();
  if (value === "male") return "Male";
  if (value === "female") return "Female";
  return value || "Unknown";
}

export async function sendAdminBookedEmail({ to, booking }) {
  if (!to || !to.length) return;

  const when = formatAppointment(booking.slot_start);

  const html = `
    <p>Hi,</p>
    <p>A verified appointment has been added to the calendar.</p>
    <p><strong>Full name:</strong> ${escapeHtml(booking.full_name || "")}</p>
    <p><strong>Gender:</strong> ${escapeHtml(genderLabel(booking.gender))}</p>
    <p><strong>Client email:</strong> ${escapeHtml(booking.email || "")}</p>
    <p><strong>Appointment:</strong> ${escapeHtml(when)}</p>
    ${
      booking.google_event_link
        ? `<p><strong>Calendar event:</strong> <a href="${escapeHtml(booking.google_event_link)}">Open appointment</a></p>`
        : ""
    }
  `;

  await sendResendEmail({
    to,
    subject: `New booked appointment — ${booking.full_name || "Client"}`,
    html,
  });
}

export async function sendAdminReminderEmail({ to, booking }) {
  if (!to || !to.length) return;

  const when = formatAppointment(booking.slot_start);

  const html = `
    <p>Hi,</p>
    <p>This is a reminder that an appointment starts in about 15 minutes.</p>
    <p><strong>Full name:</strong> ${escapeHtml(booking.full_name || "")}</p>
    <p><strong>Gender:</strong> ${escapeHtml(genderLabel(booking.gender))}</p>
    <p><strong>Client email:</strong> ${escapeHtml(booking.email || "")}</p>
    <p><strong>Appointment:</strong> ${escapeHtml(when)}</p>
    ${
      booking.google_event_link
        ? `<p><strong>Calendar event:</strong> <a href="${escapeHtml(booking.google_event_link)}">Open appointment</a></p>`
        : ""
    }
    ${
      booking.google_meet_link
        ? `<p><strong>Google Meet:</strong> <a href="${escapeHtml(booking.google_meet_link)}">Join meeting</a></p>`
        : ""
    }
  `;

  await sendResendEmail({
    to,
    subject: `Reminder: appointment in 15 minutes — ${booking.full_name || "Client"}`,
    html,
  });
}