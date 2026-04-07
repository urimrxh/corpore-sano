import { createClient } from "@supabase/supabase-js";
import {
  sendResendEmail,
  escapeHtml,
  formatAppointment,
} from "./lib/resendEmail.mjs";
import { sendAdminReminderEmail } from "./lib/adminBookingEmails.mjs";

function normalizeRecipients(value) {
  return Array.isArray(value)
    ? value.map((email) => String(email || "").trim()).filter(Boolean)
    : [];
}

export default async (req) => {
  try {
    const { next_run } = await req.json().catch(() => ({}));
    console.log("meeting-reminders: running; next run:", next_run);

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      throw new Error("Missing Supabase env vars");
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const now = Date.now();

    // Shared reminder window: ~15 minutes before appointment
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

      // USER REMINDER (~15 minutes before)
      if (shouldSendUserReminder) {
        const joinLink = booking.google_meet_link || booking.google_event_link;

        if (joinLink) {
          const when = formatAppointment(booking.slot_start);
          const safeJoinLink = escapeHtml(joinLink);

          const html = `
            <p>Hi ${escapeHtml(booking.full_name || "there")},</p>
            <p>This is your appointment reminder. Your meeting starts in about 15 minutes.</p>
            <p><strong>Time:</strong> ${escapeHtml(when)}</p>
            <p><strong>Join link:</strong><br />
            <a href="${safeJoinLink}">${safeJoinLink}</a></p>
            <p>We’ll see you shortly.</p>
          `;

          try {
            await sendResendEmail({
              to: booking.email,
              subject: "Reminder — your appointment starts in about 15 minutes",
              html,
            });

            await supabase
              .from("bookings")
              .update({ meeting_reminder_sent_at: new Date().toISOString() })
              .eq("id", booking.id);

            console.log(
              `meeting-reminders: user reminder sent for booking ${booking.id}`
            );
          } catch (emailErr) {
            console.error(
              `meeting-reminders: user reminder failed for booking ${booking.id}`,
              emailErr?.message || emailErr
            );
          }
        } else {
          console.warn(
            `meeting-reminders: skipped user reminder for booking ${booking.id} because no join link was available`
          );
        }
      }

      // ADMIN REMINDER (~15 minutes before)
      if (shouldSendAdminReminder) {
        const recipients = normalizeRecipients(booking.admin_recipient_emails);

        if (!recipients.length) {
          console.warn(
            `meeting-reminders: skipped admin reminder for booking ${booking.id} because no admin recipients were stored`
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

          console.log(
            `meeting-reminders: admin reminder sent for booking ${booking.id} to ${recipients.join(", ")}`
          );
        } catch (emailErr) {
          console.error(
            `meeting-reminders: admin reminder failed for booking ${booking.id}`,
            emailErr?.message || emailErr
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