import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import {
  sendResendEmail,
  escapeHtml,
  formatAppointment,
  renderBilingualEmail,
  buildBilingualText,
} from "./lib/resendEmail.mjs";

function isFutureAppointment(slotStart) {
  if (!slotStart) return false;
  const time = new Date(slotStart).getTime();
  return Number.isFinite(time) && time > Date.now();
}

async function sendClientCancellationEmail(booking) {
  const when = formatAppointment(booking.slot_start);

  const albanianHtml = `
    <p style="margin:0 0 16px 0;">Përshëndetje ${escapeHtml(booking.full_name || "aty")},</p>
    <p style="margin:0 0 16px 0;">Termini juaj është anuluar nga administratori.</p>
    <p style="margin:0 0 16px 0;"><strong>Koha e planifikuar:</strong> ${escapeHtml(when)}</p>
    <p style="margin:0;color:#6b7280;">Nëse deshironi, mund të rezervoni një termin të ri nga faqja.</p>
  `;

  const englishHtml = `
    <p style="margin:0 0 16px 0;">Hi ${escapeHtml(booking.full_name || "there")},</p>
    <p style="margin:0 0 16px 0;">Your appointment has been cancelled by the admin.</p>
    <p style="margin:0 0 16px 0;"><strong>Scheduled time:</strong> ${escapeHtml(when)}</p>
    <p style="margin:0;color:#6b7280;">If you would like, you can book a new appointment from the website.</p>
  `;

  const html = renderBilingualEmail({
    preheader:
      "Termini juaj është anuluar. Your appointment has been cancelled.",
    title: "Termini juaj është anuluar | Your appointment has been cancelled",
    albanianHtml,
    englishHtml,
  });

  const text = buildBilingualText({
    albanian: `Përshëndetje ${booking.full_name || "aty"},

Termini juaj është anuluar nga administratori.

Koha e planifikuar: ${when}

Nëse deshironi, mund të rezervoni një termin të ri nga faqja.`,
    english: `Hi ${booking.full_name || "there"},

Your appointment has been cancelled by the admin.

Scheduled time: ${when}

If you would like, you can book a new appointment from the website.`,
  });

  await sendResendEmail({
    to: booking.email,
    subject: "Termini juaj është anuluar | Your appointment has been cancelled",
    html,
    text,
  });
}

export const handler = async (request) => {
  if (request.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Method Not Allowed",
    };
  }

  let body;
  try {
    body = JSON.parse(request.body || "{}");
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid JSON" }),
    };
  }

  const bookingId = body.bookingId ? String(body.bookingId).trim() : "";

  if (!bookingId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "bookingId required" }),
    };
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  const { data: booking, error: fetchErr } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .maybeSingle();

  if (fetchErr || !booking) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: fetchErr?.message || "Booking not found" }),
    };
  }

  const shouldEmailClient = isFutureAppointment(booking.slot_start);

  if (booking.google_event_id) {
    const normalizedGender = String(booking.gender || "").trim().toLowerCase();
    const calendarId =
      normalizedGender === "male"
        ? process.env.GOOGLE_CALENDAR_MALE_ID
        : normalizedGender === "female"
          ? process.env.GOOGLE_CALENDAR_FEMALE_ID
          : "";

    if (!calendarId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: `Invalid booking gender "${booking.gender}"`,
        }),
      };
    }

    let credentials;
    try {
      credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    } catch {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Invalid GOOGLE_SERVICE_ACCOUNT_JSON" }),
      };
    }

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/calendar"],
    });

    const calendar = google.calendar({ version: "v3", auth });

    try {
      await calendar.events.delete({
        calendarId,
        eventId: booking.google_event_id,
      });
    } catch (error) {
      return {
        statusCode: 502,
        body: JSON.stringify({
          error: "Failed to delete Google Calendar event",
          detail: error?.message || String(error),
        }),
      };
    }
  }

  const { error: updateErr } = await supabase
    .from("bookings")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      admin_reminder_sent_at: null,
      google_event_id: null,
      google_event_link: null,
      google_meet_link: null,
    })
    .eq("id", bookingId);

  if (updateErr) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Booking update failed after removal",
        detail: updateErr.message,
      }),
    };
  }

  if (shouldEmailClient) {
    try {
      await sendClientCancellationEmail(booking);
    } catch (emailErr) {
      console.error(
        "delete-calendar-event: failed to send client cancellation email",
        emailErr?.message || emailErr,
      );
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true }),
  };
};