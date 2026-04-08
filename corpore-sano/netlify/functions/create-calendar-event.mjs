import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import {
  sendResendEmail,
  escapeHtml,
  formatAppointment,
} from "./lib/resendEmail.mjs";
import { getActiveAdminEmailsByGender } from "./lib/adminRecipients.mjs";
import { sendAdminBookedEmail } from "./lib/adminBookingEmails.mjs";

function headerGet(headers, name) {
  if (!headers || typeof headers !== "object") return undefined;
  const lower = name.toLowerCase();

  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === lower) return value;
  }

  return undefined;
}

function normalizeRecipientEmails(value) {
  return [
    ...new Set(
      (Array.isArray(value) ? value : [])
        .map((email) => String(email || "").trim().toLowerCase())
        .filter(Boolean)
    ),
  ];
}

function getMeetLinkFromEvent(event) {
  return (
    event?.hangoutLink ||
    event?.conferenceData?.entryPoints?.find(
      (entry) => entry.entryPointType === "video"
    )?.uri ||
    null
  );
}

async function waitForMeetLink(
  calendar,
  calendarId,
  eventId,
  tries = 6,
  delayMs = 2000
) {
  let lastEventLink = null;
  let lastStatus = "timeout";

  for (let i = 0; i < tries; i += 1) {
    const res = await calendar.events.get({
      calendarId,
      eventId,
      conferenceDataVersion: 1,
    });

    const event = res?.data || null;
    const status =
      event?.conferenceData?.createRequest?.status?.statusCode || null;
    const meetLink = getMeetLinkFromEvent(event);
    const eventLink = event?.htmlLink || null;

    lastEventLink = eventLink || lastEventLink;
    lastStatus = status || lastStatus;

    if (meetLink && status === "success") {
      return { meetLink, eventLink, status };
    }

    if (meetLink) {
      return { meetLink, eventLink, status };
    }

    if (status === "failure") {
      return { meetLink: null, eventLink, status };
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  return { meetLink: null, eventLink: lastEventLink, status: lastStatus };
}

async function sendVerificationConfirmedEmail(booking) {
  const when = formatAppointment(booking.slot_start);

  const html = `
    <p>Hi ${escapeHtml(booking.full_name || "there")},</p>
    <p>Your appointment has been successfully verified.</p>
    <p><strong>Time:</strong> ${escapeHtml(when)}</p>
    <p>You will receive the Google Meet link by email about 15 minutes before your appointment.</p>
    <p>Thank you — we’ll see you then.</p>
  `;

  await sendResendEmail({
    to: booking.email,
    subject: "Your appointment has been successfully verified",
    html,
  });
}

async function sendVerificationConfirmedEmailIfNeeded(supabase, booking) {
  if (booking.verification_confirmation_sent_at) {
    return;
  }

  try {
    await sendVerificationConfirmedEmail(booking);

    const { error } = await supabase
      .from("bookings")
      .update({
        verification_confirmation_sent_at: new Date().toISOString(),
      })
      .eq("id", booking.id);

    if (error) {
      console.error(
        "create-calendar-event: failed to save verification_confirmation_sent_at",
        error.message
      );
    }
  } catch (emailErr) {
    console.error(
      "create-calendar-event: verification confirmation email failed",
      emailErr?.message || emailErr
    );
  }
}

async function notifyAdminsForBooking(supabase, booking) {
  if (booking.admin_notified_at) {
    return normalizeRecipientEmails(booking.admin_recipient_emails);
  }

  let recipients = normalizeRecipientEmails(booking.admin_recipient_emails);

  if (!recipients.length) {
    recipients = await getActiveAdminEmailsByGender(supabase, booking.gender);
  }

  if (!recipients.length) {
    console.warn(`No active admins found for gender "${booking.gender}"`);
    return [];
  }

  const { error: recipientSaveError } = await supabase
    .from("bookings")
    .update({ admin_recipient_emails: recipients })
    .eq("id", booking.id);

  if (recipientSaveError) {
    console.error(
      "create-calendar-event: failed to save admin recipient emails",
      recipientSaveError.message
    );
  }

  await sendAdminBookedEmail({
    to: recipients,
    booking: {
      ...booking,
      admin_recipient_emails: recipients,
    },
  });

  const { error: notifiedError } = await supabase
    .from("bookings")
    .update({
      admin_recipient_emails: recipients,
      admin_notified_at: new Date().toISOString(),
    })
    .eq("id", booking.id);

  if (notifiedError) {
    console.error(
      "create-calendar-event: failed to save admin_notified_at",
      notifiedError.message
    );
  }

  return recipients;
}

export const handler = async (request) => {
  if (request.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const secret = process.env.BOOKING_FUNCTION_SECRET;
  const clientSecret = headerGet(request.headers, "x-booking-secret");

  if (secret && clientSecret !== secret) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: "Unauthorized" }),
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

  const bookingId = body.bookingId != null ? String(body.bookingId).trim() : "";

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
    await new Promise((resolve) => setTimeout(resolve, 600));

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
        error:
          "Booking is not verified yet; calendar sync runs after email confirmation.",
      }),
    };
  }

  const existingJoinLink =
    booking.google_meet_link || booking.google_event_link || null;

  if (booking.google_event_id) {
    try {
      await notifyAdminsForBooking(supabase, booking);
    } catch (adminErr) {
      console.error(
        "create-calendar-event: existing-event admin notification failed",
        adminErr?.message || adminErr
      );
    }

    await sendVerificationConfirmedEmailIfNeeded(supabase, booking);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ok: true,
        skipped: true,
        id: booking.google_event_id,
        googleMeetLink: existingJoinLink,
        googleEventLink: booking.google_event_link || null,
      }),
    };
  }

  const normalizedGender = String(booking.gender || "").trim().toLowerCase();
  const calendarId =
    normalizedGender === "male"
      ? calMale
      : normalizedGender === "female"
      ? calFemale
      : "";

  if (!calendarId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: `Invalid booking gender "${booking.gender}"` }),
    };
  }

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
            conferenceSolutionKey: {
              type: "hangoutsMeet",
            },
          },
        },
      },
    });
  } catch (meetErr) {
    console.warn(
      "create-calendar-event: Meet insert failed, retrying without Meet:",
      meetErr?.message || meetErr
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
  let meetLink = getMeetLinkFromEvent(insertRes?.data);
  let eventLink = insertRes?.data?.htmlLink || null;

  if (!eventId) {
    return {
      statusCode: 502,
      body: JSON.stringify({ error: "No event id returned from Google" }),
    };
  }

  if (!meetLink) {
    try {
      const waited = await waitForMeetLink(calendar, calendarId, eventId, 6, 2000);
      meetLink = waited.meetLink || meetLink;
      eventLink = waited.eventLink || eventLink;
    } catch (pollErr) {
      console.warn(
        "create-calendar-event: polling for Meet link failed:",
        pollErr?.message || pollErr
      );
    }
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

  const enrichedBooking = {
    ...booking,
    google_event_id: eventId,
    google_meet_link: meetLink,
    google_event_link: eventLink,
  };

  try {
    await notifyAdminsForBooking(supabase, enrichedBooking);
  } catch (adminErr) {
    console.error(
      "create-calendar-event: admin notification failed",
      adminErr?.message || adminErr
    );
  }

  await sendVerificationConfirmedEmailIfNeeded(supabase, enrichedBooking);

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ok: true,
      googleEventId: eventId,
      googleMeetLink: meetLink,
      googleEventLink: eventLink,
    }),
  };
};