import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import {
  sendResendEmail,
  escapeHtml,
  formatAppointment,
} from "./lib/resendEmail.mjs";

function headerGet(headers, name) {
  if (!headers || typeof headers !== "object") return undefined;
  const lower = name.toLowerCase();
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() === lower) return v;
  }
  return undefined;
}

function getMeetLink(insertRes) {
  return (
    insertRes?.data?.hangoutLink ||
    insertRes?.data?.conferenceData?.entryPoints?.find(
      (entry) => entry.entryPointType === "video",
    )?.uri ||
    null
  );
}

async function sendMeetingLinkEmail(booking, joinLink) {
  const when = formatAppointment(booking.slot_start);

  const html = `
    <p>Hi ${escapeHtml(booking.full_name || "there")},</p>
    <p>Your appointment is now confirmed.</p>
    <p><strong>When:</strong> ${escapeHtml(when)}</p>
    <p><strong>Join link:</strong><br />
    <a href="${joinLink}">${joinLink}</a></p>
    <p>Please keep this email and use the link at the appointment time.</p>
  `;

  await sendResendEmail({
    to: booking.email,
    subject: "Your appointment is confirmed — join link inside",
    html,
  });
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
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "bookingId required" }),
    };
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

  if (!booking.verified_at) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "Booking is not verified yet; calendar sync runs after email confirmation.",
      }),
    };
  }

  const existingJoinLink = booking.google_meet_link || booking.google_event_link;

  if (booking.google_event_id) {
    if (existingJoinLink && !booking.meeting_link_sent_at) {
      try {
        await sendMeetingLinkEmail(booking, existingJoinLink);

        await supabase
          .from("bookings")
          .update({ meeting_link_sent_at: new Date().toISOString() })
          .eq("id", bookingId);
      } catch (emailErr) {
        console.error(
          "create-calendar-event: existing meeting link email failed",
          emailErr?.message || emailErr,
        );
      }
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ok: true,
        skipped: true,
        id: booking.google_event_id,
        googleMeetLink: existingJoinLink,
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
  const meetLink = getMeetLink(insertRes);
  const eventLink = insertRes?.data?.htmlLink || null;

  if (!eventId) {
    return {
      statusCode: 502,
      body: JSON.stringify({ error: "No event id returned from Google" }),
    };
  }

  const { error: updErr } = await supabase
    .from("bookings")
    .update({
      google_event_id: eventId,
      google_meet_link: meetLink,
      google_event_link: eventLink,
    })
    .eq("id", bookingId);

  if (updErr) {
    console.error("create-calendar-event: Supabase update failed", updErr);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Could not save Google event fields",
        detail: updErr.message,
      }),
    };
  }

  if (meetLink && !booking.meeting_link_sent_at) {
    try {
      await sendMeetingLinkEmail(booking, meetLink);

      await supabase
        .from("bookings")
        .update({ meeting_link_sent_at: new Date().toISOString() })
        .eq("id", bookingId);
    } catch (emailErr) {
      console.error(
        "create-calendar-event: meeting link email failed",
        emailErr?.message || emailErr,
      );
    }
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ok: true,
      googleEventId: eventId,
      googleMeetLink: meetLink,
    }),
  };
};