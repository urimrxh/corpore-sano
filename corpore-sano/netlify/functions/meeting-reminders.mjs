import { createClient } from "@supabase/supabase-js";
import {
  sendResendEmail,
  escapeHtml,
  formatAppointment,
  renderBilingualEmail,
  buildBilingualText,
  emailButton,
} from "./lib/resendEmail.mjs";
import { sendAdminReminderEmail } from "./lib/adminBookingEmails.mjs";

function normalizeRecipients(value) {
  return Array.isArray(value)
    ? value.map((email) => String(email || "").trim()).filter(Boolean)
    : [];
}

export default async (req) => {
  try {
    await req.json().catch(() => ({}));

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      throw new Error("Missing Supabase env vars");
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const now = Date.now();
    const reminderWindowStart = new Date(now + 14 * 60 * 1000).toISOString();
    const reminderWindowEnd = new Date(now + 16 * 60 * 1000).toISOString();

    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("*")
      .not("verified_at", "is", null)
      .gte("slot_start", reminderWindowStart)
      .lte("slot_start", reminderWindowEnd)
      .or("status.is.null,status.neq.cancelled");

    if (error) {
      throw error;
    }

    for (const booking of bookings || []) {
      const slotStart = booking.slot_start || "";

      const shouldSendUserReminder =
        !booking.meeting_reminder_sent_at &&
        slotStart >= reminderWindowStart &&
        slotStart <= reminderWindowEnd;

      const shouldSendAdminReminder =
        !booking.admin_reminder_sent_at &&
        slotStart >= reminderWindowStart &&
        slotStart <= reminderWindowEnd;

      if (shouldSendUserReminder) {
        const joinLink = booking.google_meet_link || booking.google_event_link;

        if (joinLink) {
          const when = formatAppointment(booking.slot_start);

          const albanianHtml = `
            <p style="margin:0 0 16px 0;">Përshëndetje ${escapeHtml(booking.full_name || "aty")},</p>
            <p style="margin:0 0 16px 0;">Kjo është një rikujtesë që termini juaj fillon për rreth 15 minuta.</p>
            <p style="margin:0 0 24px 0;"><strong>Koha:</strong> ${escapeHtml(when)}</p>
            ${emailButton("Hyr ne takim", joinLink, "#2563eb")}
            <p style="margin:0;color:#6b7280;">Shihemi së shpejti.</p>
          `;

          const englishHtml = `
            <p style="margin:0 0 16px 0;">Hi ${escapeHtml(booking.full_name || "there")},</p>
            <p style="margin:0 0 16px 0;">This is your appointment reminder. Your meeting starts in about 15 minutes.</p>
            <p style="margin:0 0 24px 0;"><strong>Time:</strong> ${escapeHtml(when)}</p>
            ${emailButton("Join meeting", joinLink, "#111827")}
            <p style="margin:0;color:#6b7280;">We will see you shortly.</p>
          `;

          const html = renderBilingualEmail({
            preheader:
              "Rikujtesë për terminin tuaj që fillon për rreth 15 minuta. Reminder that your appointment starts in about 15 minutes.",
            title:
              "Rikujtesë për terminin | Reminder: your appointment starts in about 15 minutes",
            albanianHtml,
            englishHtml,
          });

          const text = buildBilingualText({
            albanian: `Pershendetje ${booking.full_name || "aty"},

Kjo është një rikujtesë që terminin tuaj fillon për rreth 15 minuta.

Koha: ${when}

Hyr ne takim:
${joinLink}

Shihemi së shpejti.`,
            english: `Hi ${booking.full_name || "there"},

This is your appointment reminder. Your meeting starts in about 15 minutes.

Time: ${when}

Join meeting:
${joinLink}

We will see you shortly.`,
          });

          try {
            await sendResendEmail({
              to: booking.email,
              subject:
                "Rikujtesë për terminin | Reminder: your appointment starts in about 15 minutes",
              html,
              text,
            });

            await supabase
              .from("bookings")
              .update({ meeting_reminder_sent_at: new Date().toISOString() })
              .eq("id", booking.id);
          } catch (emailErr) {
            console.error(
              `meeting-reminders: user reminder failed for booking ${booking.id}`,
              emailErr?.message || emailErr,
            );
          }
        } else {
          console.warn(
            `meeting-reminders: skipped user reminder for booking ${booking.id} because no join link was available`,
          );
        }
      }

      if (shouldSendAdminReminder) {
        const recipients = normalizeRecipients(booking.admin_recipient_emails);

        if (!recipients.length) {
          console.warn(
            `meeting-reminders: skipped admin reminder for booking ${booking.id} because no admin recipients were stored`,
          );
          continue;
        }

        try {
          await sendAdminReminderEmail({
            to: recipients,
            booking,
          });

          await supabase
            .from("bookings")
            .update({ admin_reminder_sent_at: new Date().toISOString() })
            .eq("id", booking.id);
        } catch (emailErr) {
          console.error(
            `meeting-reminders: admin reminder failed for booking ${booking.id}`,
            emailErr?.message || emailErr,
          );
        }
      }
    }
  } catch (err) {
    console.error("meeting-reminders: fatal error", err?.message || err);
  }
};

export const config = {
  schedule: "* * * * *",
};