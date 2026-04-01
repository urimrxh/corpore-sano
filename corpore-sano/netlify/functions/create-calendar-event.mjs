/**
 * Netlify serverless: create Google Calendar event for a booking and store event id.
 * Required env (Netlify UI → Site settings → Environment variables):
 *   GOOGLE_SERVICE_ACCOUNT_JSON  — full JSON key for a service account
 *   GOOGLE_CALENDAR_MALE_ID        — calendar ID (often email) shared with the service account
 *   GOOGLE_CALENDAR_FEMALE_ID
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   BOOKING_FUNCTION_SECRET        — optional; must match VITE_BOOKING_FUNCTION_SECRET from the client
 *
 * Calendar runs only after verified_at is set (user confirms email). Uses sendUpdates: all so Google
 * emails the attendee; adds Google Meet when the API allows (retries without Meet if not).
 */
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";

function headerGet(headers, name) {
  if (!headers || typeof headers !== "object") return undefined;
  const lower = name.toLowerCase();
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() === lower) return v;
  }
  return undefined;
}

export const handler = async (request) => {
  if (request.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const secret = process.env.BOOKING_FUNCTION_SECRET;
  const clientSecret = headerGet(request.headers, "x-booking-secret");
  if (secret && clientSecret !== secret) {
    return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  let body;
  try {
    body = JSON.parse(request.body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const bookingId =
    body.bookingId != null ? String(body.bookingId).trim() : "";
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

  let { data: booking, error: fetchErr } = await supabase
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

  /** Brief wait + re-fetch if confirm-booking just wrote verified_at (rare replication lag). */
  if (!booking.verified_at) {
    await new Promise((r) => setTimeout(r, 600));
    const second = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .maybeSingle();
    if (!second.error && second.data) {
      booking = second.data;
    }
  }

  if (booking.google_event_id) {
    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, skipped: true, id: booking.google_event_id }),
    };
  }

  if (!booking.verified_at) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "Booking is not verified yet; calendar sync runs after email confirmation.",
      }),
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

  const descriptionLines = [
    booking.topic,
    `Email: ${booking.email}`,
    `Gender: ${booking.gender}`,
  ].filter(Boolean);

  const baseEvent = {
    summary: `Consultation — ${booking.full_name}`,
    description: descriptionLines.join("\n"),
    start: { dateTime: booking.slot_start },
    end: { dateTime: booking.slot_end },
  };

  /** Try Google Meet + notify attendees; some setups block Meet for service accounts — then retry without Meet. */
  let insertRes;
  try {
    insertRes = await calendar.events.insert({
      calendarId,
      conferenceDataVersion: 1,
      requestBody: {
        ...baseEvent,
        conferenceData: {
          createRequest: {
            requestId: randomUUID(),
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      },
    });
  } catch (meetErr) {
    console.warn(
      "create-calendar-event: Meet insert failed, retrying without Meet:",
      meetErr?.message || meetErr,
    );
    try {
      insertRes = await calendar.events.insert({
        calendarId,
        requestBody: baseEvent,
      });
    } catch (plainErr) {
      console.error("create-calendar-event: calendar insert failed", plainErr);
      return {
        statusCode: 502,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: plainErr?.message || "Google Calendar insert failed",
        }),
      };
    }
  }

  const eventId = insertRes?.data?.id;
  if (!eventId) {
    return {
      statusCode: 502,
      body: JSON.stringify({ error: "No event id returned from Google" }),
    };
  }

  const { error: updErr } = await supabase
    .from("bookings")
    .update({ google_event_id: eventId })
    .eq("id", bookingId);

  if (updErr) {
    console.error("create-calendar-event: Supabase update failed", updErr);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Could not save google_event_id",
        detail: updErr.message,
      }),
    };
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ok: true, googleEventId: eventId }),
  };
};
