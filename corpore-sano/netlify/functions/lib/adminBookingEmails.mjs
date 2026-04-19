import {
  sendResendEmail,
  escapeHtml,
  formatAppointment,
  renderBilingualEmail,
  buildBilingualText,
  emailButton,
} from "./resendEmail.mjs";

function genderLabelSq(gender) {
  const value = String(gender || "").trim().toLowerCase();
  if (value === "male") return "Mashkull";
  if (value === "female") return "Femër";
  return "E panjohur";
}

function genderLabelEn(gender) {
  const value = String(gender || "").trim().toLowerCase();
  if (value === "male") return "Male";
  if (value === "female") return "Female";
  return "Unknown";
}

export async function sendAdminBookedEmail({ to, booking }) {
  if (!to || !to.length) return;

  const when = formatAppointment(booking.slot_start);

  const albanianHtml = `
    <p style="margin:0 0 16px 0;">Përshëndetje,</p>
    <p style="margin:0 0 16px 0;">Një termin i verifikuar është shtuar në kalendar.</p>
    <p style="margin:0 0 8px 0;"><strong>Emri i plotë:</strong> ${escapeHtml(booking.full_name || "")}</p>
    <p style="margin:0 0 8px 0;"><strong>Gjinia:</strong> ${escapeHtml(genderLabelSq(booking.gender))}</p>
    <p style="margin:0 0 8px 0;"><strong>Email i klientit:</strong> ${escapeHtml(booking.email || "")}</p>
    <p style="margin:0 0 16px 0;"><strong>Termini:</strong> ${escapeHtml(when)}</p>
    ${
      booking.google_event_link
        ? `<p style="margin:0 0 16px 0;"><strong>Ngjarja në kalendar:</strong> <a href="${escapeHtml(booking.google_event_link)}" style="color:#2563eb;text-decoration:none;">Hape ngjarjen</a></p>`
        : ""
    }
  `;

  const englishHtml = `
    <p style="margin:0 0 16px 0;">Hi,</p>
    <p style="margin:0 0 16px 0;">A verified appointment has been added to the calendar.</p>
    <p style="margin:0 0 8px 0;"><strong>Full name:</strong> ${escapeHtml(booking.full_name || "")}</p>
    <p style="margin:0 0 8px 0;"><strong>Gender:</strong> ${escapeHtml(genderLabelEn(booking.gender))}</p>
    <p style="margin:0 0 8px 0;"><strong>Client email:</strong> ${escapeHtml(booking.email || "")}</p>
    <p style="margin:0 0 16px 0;"><strong>Appointment:</strong> ${escapeHtml(when)}</p>
    ${
      booking.google_event_link
        ? `<p style="margin:0 0 16px 0;"><strong>Calendar event:</strong> <a href="${escapeHtml(booking.google_event_link)}" style="color:#2563eb;text-decoration:none;">Open appointment</a></p>`
        : ""
    }
  `;

  const html = renderBilingualEmail({
    preheader:
      "Nje termin i verifikuar eshte shtuar ne kalendar. A verified appointment has been added to the calendar.",
    title: `Një termin i ri i verifikuar | New verified appointment`,
    albanianHtml,
    englishHtml,
  });

  const text = buildBilingualText({
    albanian: `Pershendetje,

Një termin i verifikuar është shtuar në kalendar.

Emri i plotë: ${booking.full_name || ""}
Gjinia: ${genderLabelSq(booking.gender)}
Email i klientit: ${booking.email || ""}
Termini: ${when}
${booking.google_event_link ? `Ngjarja në kalendar: ${booking.google_event_link}` : ""}`.trim(),
    english: `Hi,

A verified appointment has been added to the calendar.

Full name: ${booking.full_name || ""}
Gender: ${genderLabelEn(booking.gender)}
Client email: ${booking.email || ""}
Appointment: ${when}
${booking.google_event_link ? `Calendar event: ${booking.google_event_link}` : ""}`.trim(),
  });

  await sendResendEmail({
    to,
    subject: `Një termin i ri i verifikuar | New verified appointment${booking.full_name ? ` - ${booking.full_name}` : ""}`,
    html,
    text,
  });
}

export async function sendAdminReminderEmail({ to, booking }) {
  if (!to || !to.length) return;

  const when = formatAppointment(booking.slot_start);

  const albanianHtml = `
    <p style="margin:0 0 16px 0;">Përshëndetje,</p>
    <p style="margin:0 0 16px 0;">Kjo është një rikujtesë që një termin fillon për rreth 15 minuta.</p>
    <p style="margin:0 0 8px 0;"><strong>Emri i plotë:</strong> ${escapeHtml(booking.full_name || "")}</p>
    <p style="margin:0 0 8px 0;"><strong>Gjinia:</strong> ${escapeHtml(genderLabelSq(booking.gender))}</p>
    <p style="margin:0 0 8px 0;"><strong>Email i klientit:</strong> ${escapeHtml(booking.email || "")}</p>
    <p style="margin:0 0 16px 0;"><strong>Termini:</strong> ${escapeHtml(when)}</p>
    ${
      booking.google_meet_link
        ? emailButton("Hyr në Google Meet", booking.google_meet_link, "#2563eb")
        : ""
    }
  `;

  const englishHtml = `
    <p style="margin:0 0 16px 0;">Hi,</p>
    <p style="margin:0 0 16px 0;">This is a reminder that an appointment starts in about 15 minutes.</p>
    <p style="margin:0 0 8px 0;"><strong>Full name:</strong> ${escapeHtml(booking.full_name || "")}</p>
    <p style="margin:0 0 8px 0;"><strong>Gender:</strong> ${escapeHtml(genderLabelEn(booking.gender))}</p>
    <p style="margin:0 0 8px 0;"><strong>Client email:</strong> ${escapeHtml(booking.email || "")}</p>
    <p style="margin:0 0 16px 0;"><strong>Appointment:</strong> ${escapeHtml(when)}</p>
    ${
      booking.google_meet_link
        ? emailButton("Join Google Meet", booking.google_meet_link, "#111827")
        : ""
    }
  `;

  const html = renderBilingualEmail({
    preheader:
      "Rikujtesë për terminin që fillon për rreth 15 minuta. Reminder for an appointment starting in about 15 minutes.",
    title: `Rikujtesë për terminin | Appointment reminder`,
    albanianHtml,
    englishHtml,
  });

  const text = buildBilingualText({
    albanian: `Përshëndetje,

Kjo është një rikujtesë që një termin fillon për rreth 15 minuta.

Emri i plotë: ${booking.full_name || ""}
Gjinia: ${genderLabelSq(booking.gender)}
Email i klientit: ${booking.email || ""}
Termini: ${when}
${booking.google_meet_link ? `Google Meet: ${booking.google_meet_link}` : ""}`.trim(),
    english: `Hi,

This is a reminder that an appointment starts in about 15 minutes.

Full name: ${booking.full_name || ""}
Gender: ${genderLabelEn(booking.gender)}
Client email: ${booking.email || ""}
Appointment: ${when}
${booking.google_meet_link ? `Google Meet: ${booking.google_meet_link}` : ""}`.trim(),
  });

  await sendResendEmail({
    to,
    subject: `Rikujtesë për terminin | Appointment reminder${booking.full_name ? ` - ${booking.full_name}` : ""}`,
    html,
    text,
  });
}