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

function getCalendarClient() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
  const redirectUri =
    process.env.GOOGLE_OAUTH_REDIRECT_URI ||
    "https://developers.google.com/oauthplayground";

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Missing Google OAuth env vars: GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN",
    );
  }

  const auth = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  auth.setCredentials({
    refresh_token: refreshToken,
  });

  return google.calendar({ version: "v3", auth });
}

function getCalendarIdForGender(gender) {
  const normalizedGender = String(gender || "").trim().toLowerCase();

  if (normalizedGender === "male") {
    return process.env.GOOGLE_CALENDAR_MALE_ID || "";
  }

  if (normalizedGender === "female") {
    return process.env.GOOGLE_CALENDAR_FEMALE_ID || "";
  }

  return "";
}

async function sendClientCancellationEmail(booking) {
  const when = formatAppointment(booking.slot_start);

  const albanianHtml = `
    <p style="margin:0 0 16px 0;">Përshëndetje ${escapeHtml(booking.full_name || "aty")},</p>
    <p style="margin:0 0 16px 0;">Termini juaj është anuluar nga administratori.</p>
    <p style="margin:0 0 16px 0;"><strong>Koha e planifikuar:</strong> ${escapeHtml(when)}</p>
    <p style="margin:0;color:#6b7280;">Nëse dëshironi, mund të rezervoni një termin të ri nga faqja.</p>
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

Nëse dëshironi, mund të rezervoni një termin të ri nga faqja.`,
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

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Missing Supabase env vars",
      }),
    };
  }

  const supabase = createClient(supabaseUrl, serviceKey);

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
    const calendarId = getCalendarIdForGender(booking.gender);

    if (!calendarId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: `Invalid booking gender "${booking.gender}"`,
        }),
      };
    }

    let calendar;
    try {
      calendar = getCalendarClient();
    } catch (authErr) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: authErr?.message || "Google OAuth setup failed",
        }),
      };
    }

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