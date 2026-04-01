import { createClient } from "@supabase/supabase-js";
import {
  sendResendEmail,
  escapeHtml,
  formatAppointment,
} from "./lib/resendEmail.mjs";

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
    const windowStart = new Date(now - 2 * 60 * 1000).toISOString();
    const windowEnd = new Date(now + 60 * 1000).toISOString();

    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("*")
      .not("verified_at", "is", null)
      .is("meeting_reminder_sent_at", null)
      .gte("slot_start", windowStart)
      .lte("slot_start", windowEnd);

    if (error) {
      throw error;
    }

    for (const booking of bookings || []) {
      const joinLink = booking.google_meet_link || booking.google_event_link;
      if (!joinLink) continue;

      const when = formatAppointment(booking.slot_start);

      const html = `
        <p>Hi ${escapeHtml(booking.full_name || "there")},</p>
        <p>This is your appointment reminder.</p>
        <p><strong>Time:</strong> ${escapeHtml(when)}</p>
        <p><strong>Join link:</strong><br />
        <a href="${joinLink}">${joinLink}</a></p>
        <p>We’ll see you shortly.</p>
      `;

      try {
        await sendResendEmail({
          to: booking.email,
          subject: "Reminder — your appointment starts now",
          html,
        });

        await supabase
          .from("bookings")
          .update({ meeting_reminder_sent_at: new Date().toISOString() })
          .eq("id", booking.id);
      } catch (emailErr) {
        console.error(
          `meeting-reminders: failed for booking ${booking.id}`,
          emailErr?.message || emailErr,
        );
      }
    }
  } catch (err) {
    console.error("meeting-reminders: fatal error", err?.message || err);
  }
};

export const config = {
  schedule: "* * * * *",
};