import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import {
  sendResendEmail,
  escapeHtml,
  formatAppointment,
  renderBilingualEmail,
  buildBilingualText,
  emailButton,
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
        .filter(Boolean),
    ),
  ];
}

function getMeetLinkFromEvent(event) {
  return (
    event?.hangoutLink ||
    event?.conferenceData?.entryPoints?.find(
      (entry) => entry.entryPointType === "video",
    )?.uri ||
    null
  );
}

async function waitForMeetLink(
  calendar,
  calendarId,
  eventId,
  tries = 12,
  delayMs = 3000,
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

async function forceMeetLink(calendar, calendarId, eventId) {
  try {
    await calendar.events.patch({
      calendarId,
      eventId,
      conferenceDataVersion: 1,
      requestBody: {
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
  } catch (err) {
    console.warn(
      "create-calendar-event: failed to patch Meet onto event:",
      err?.message || err,
    );
  }

  return waitForMeetLink(calendar, calendarId, eventId, 12, 3000);
}

async function ensureMeetLink(
  calendar,
  calendarId,
  eventId,
  currentMeetLink,
  currentEventLink,
) {
  if (currentMeetLink) {
    return {
      meetLink: currentMeetLink,
      eventLink: currentEventLink || null,
    };
  }

  let waited = await waitForMeetLink(calendar, calendarId, eventId, 12, 3000);

  if (waited.meetLink) {
    return {
      meetLink: waited.meetLink,
      eventLink: waited.eventLink || currentEventLink || null,
    };
  }

  waited = await forceMeetLink(calendar, calendarId, eventId);

  return {
    meetLink: waited.meetLink || null,
    eventLink: waited.eventLink || currentEventLink || null,
  };
}

async function refreshExistingEventLinks(calendar, calendarId, eventId) {
  const res = await calendar.events.get({
    calendarId,
    eventId,
    conferenceDataVersion: 1,
  });

  return {
    google_meet_link: getMeetLinkFromEvent(res?.data || null),
    google_event_link: res?.data?.htmlLink || null,
  };
}

async function sendVerificationConfirmedEmail(booking) {
  const when = formatAppointment(booking.slot_start);
  const hasEventLink = Boolean(booking.google_event_link);

  const albanianHtml = `
    <p style="margin:0 0 16px 0;">Përshëndetje ${escapeHtml(booking.full_name || "aty")},</p>
    <p style="margin:0 0 16px 0;">Termini juaj është konfirmuar me sukses.</p>
    <p style="margin:0 0 16px 0;"><strong>Koha:</strong> ${escapeHtml(when)}</p>
    ${
      hasEventLink
        ? emailButton(
            "Hap eventin në kalendar",
            booking.google_event_link,
            "#2563eb",
          )
        : ""
    }
    <p style="margin:0;color:#6b7280;">
      Linku i takimit do të dërgohet në emailin rikujtues rreth 10 minuta para terminit.
    </p>
  `;

  const englishHtml = `
    <p style="margin:0 0 16px 0;">Hi ${escapeHtml(booking.full_name || "there")},</p>
    <p style="margin:0 0 16px 0;">Your appointment has been successfully verified.</p>
    <p style="margin:0 0 16px 0;"><strong>Time:</strong> ${escapeHtml(when)}</p>
    ${
      hasEventLink
        ? emailButton(
            "Open calendar event",
            booking.google_event_link,
            "#111827",
          )
        : ""
    }
    <p style="margin:0;color:#6b7280;">
      The meeting link will be sent in the reminder email about 10 minutes before the appointment.
    </p>
  `;

  const html = renderBilingualEmail({
    preheader:
      "Termini juaj është konfirmuar me sukses. Your appointment has been successfully verified.",
    title:
      "Termini juaj është konfirmuar | Your appointment has been successfully verified",
    albanianHtml,
    englishHtml,
  });

  const text = buildBilingualText({
    albanian: `Përshëndetje ${booking.full_name || "aty"},

Termini juaj është konfirmuar me sukses.

Koha: ${when}
${hasEventLink ? `Eventi në kalendar: ${booking.google_event_link}` : ""}
Linku i takimit do të dërgohet në emailin rikujtues rreth 10 minuta para terminit.`,
    english: `Hi ${booking.full_name || "there"},

Your appointment has been successfully verified.

Time: ${when}
${hasEventLink ? `Calendar event: ${booking.google_event_link}` : ""}
The meeting link will be sent in the reminder email about 10 minutes before the appointment.`,
  });

  await sendResendEmail({
    to: booking.email,
    subject:
      "Termini juaj është konfirmuar | Your appointment has been successfully verified",
    html,
    text,
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
        error.message,
      );
    }
  } catch (emailErr) {
    console.error(
      "create-calendar-event: verification confirmation email failed",
      emailErr?.message || emailErr,
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
      recipientSaveError.message,
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
      notifiedError.message,
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
      body: JSON.stringify({
        error: `Invalid booking gender "${booking.gender}"`,
      }),
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

  if (booking.google_event_id) {
    let existingMeetLink = booking.google_meet_link || null;
    let existingEventLink = booking.google_event_link || null;

    if (!existingMeetLink) {
      try {
        const refreshed = await refreshExistingEventLinks(
          calendar,
          calendarId,
          booking.google_event_id,
        );

        existingMeetLink = refreshed.google_meet_link || existingMeetLink;
        existingEventLink = refreshed.google_event_link || existingEventLink;

        if (!existingMeetLink) {
          const forced = await ensureMeetLink(
            calendar,
            calendarId,
            booking.google_event_id,
            existingMeetLink,
            existingEventLink,
          );

          existingMeetLink = forced.meetLink || existingMeetLink;
          existingEventLink = forced.eventLink || existingEventLink;
        }

        await supabase
          .from("bookings")
          .update({
            google_meet_link: existingMeetLink,
            google_event_link: existingEventLink,
          })
          .eq("id", bookingId);
      } catch (err) {
        console.error(
          "create-calendar-event: failed to refresh existing event links",
          err?.message || err,
        );
      }
    }

    const enrichedExistingBooking = {
      ...booking,
      google_meet_link: existingMeetLink,
      google_event_link: existingEventLink,
    };

    try {
      await notifyAdminsForBooking(supabase, enrichedExistingBooking);
    } catch (adminErr) {
      console.error(
        "create-calendar-event: existing-event admin notification failed",
        adminErr?.message || adminErr,
      );
    }

    await sendVerificationConfirmedEmailIfNeeded(
      supabase,
      enrichedExistingBooking,
    );

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ok: true,
        skipped: true,
        id: booking.google_event_id,
        googleMeetLink: existingMeetLink,
        googleEventLink: existingEventLink,
      }),
    };
  }

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
  let meetLink = getMeetLinkFromEvent(insertRes?.data);
  let eventLink = insertRes?.data?.htmlLink || null;

  if (!eventId) {
    return {
      statusCode: 502,
      body: JSON.stringify({ error: "No event id returned from Google" }),
    };
  }

  try {
    const ensured = await ensureMeetLink(
      calendar,
      calendarId,
      eventId,
      meetLink,
      eventLink,
    );

    meetLink = ensured.meetLink || meetLink;
    eventLink = ensured.eventLink || eventLink;

    if (!meetLink) {
      console.warn(
        "create-calendar-event: event created but Google Meet link is still missing after retries",
        JSON.stringify({ bookingId, eventId, calendarId }),
      );
    }
  } catch (err) {
    console.error(
      "create-calendar-event: failed to ensure Meet link on new event",
      err?.message || err,
    );
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
      adminErr?.message || adminErr,
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