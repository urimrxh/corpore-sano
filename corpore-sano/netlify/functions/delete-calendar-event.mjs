import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";

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
    process.env.SUPABASE_SERVICE_ROLE_KEY
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

  if (!booking.google_event_id) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "No Google event linked to this booking" }),
    };
  }

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
        error: "Google event deleted, but booking update failed",
        detail: updateErr.message,
      }),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true }),
  };
};