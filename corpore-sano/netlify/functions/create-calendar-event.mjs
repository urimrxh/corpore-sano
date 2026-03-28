/**
 * Netlify serverless: create Google Calendar event for a booking and store event id.
 * Required env (Netlify UI → Site settings → Environment variables):
 *   GOOGLE_SERVICE_ACCOUNT_JSON  — full JSON key for a service account
 *   GOOGLE_CALENDAR_MALE_ID        — calendar ID (often email) shared with the service account
 *   GOOGLE_CALENDAR_FEMALE_ID
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   BOOKING_FUNCTION_SECRET        — optional; must match VITE_BOOKING_FUNCTION_SECRET from the client
 */
import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";

export const handler = async (request) => {
  if (request.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const secret = process.env.BOOKING_FUNCTION_SECRET;
  if (secret && request.headers["x-booking-secret"] !== secret) {
    return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  let body;
  try {
    body = JSON.parse(request.body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const bookingId = body.bookingId;
  if (!bookingId) {
    return { statusCode: 400, body: JSON.stringify({ error: "bookingId required" }) };
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const saJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const calMale = process.env.GOOGLE_CALENDAR_MALE_ID;
  const calFemale = process.env.GOOGLE_CALENDAR_FEMALE_ID;

  if (!supabaseUrl || !serviceKey || !saJson || !calMale || !calFemale) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server configuration incomplete" }),
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

  if (booking.google_event_id) {
    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, skipped: true, id: booking.google_event_id }),
    };
  }

  const calendarId = booking.gender === "male" ? calMale : calFemale;

  let credentials;
  try {
    credentials = JSON.parse(saJson);
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

  const insertRes = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary: `Consultation — ${booking.full_name}`,
      description: [booking.topic, `Email: ${booking.email}`, `Gender: ${booking.gender}`]
        .filter(Boolean)
        .join("\n"),
      start: { dateTime: booking.slot_start },
      end: { dateTime: booking.slot_end },
      attendees: [{ email: booking.email }],
    },
  });

  const eventId = insertRes.data.id;

  await supabase
    .from("bookings")
    .update({ google_event_id: eventId })
    .eq("id", bookingId);

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ok: true, googleEventId: eventId }),
  };
};
