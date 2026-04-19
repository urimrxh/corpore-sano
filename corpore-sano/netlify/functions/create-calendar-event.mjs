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

function getCalendarIdForGender(gender, calMale, calFemale) {
  const normalizedGender = String(gender || "").trim().toLowerCase();

  if (normalizedGender === "male") return calMale || "";
  if (normalizedGender === "female") return calFemale || "";
  return "";
}

async function readEventLinks(calendar, calendarId, eventId) {
  const res = await calendar.events.get({
    calendarId,
    eventId,
    conferenceDataVersion: 1,
  });

  const event = res?.data || null;

  return {
    google_meet_link: getMeetLinkFromEvent(event),
    google_event_link: event?.htmlLink || null,
    conference_status:
      event?.conferenceData?.createRequest?.status?.statusCode || null,
  };
}

async function waitForMeetLink(
  calendar,
  calendarId,
  eventId,
  tries = 2,
  delayMs = 2000,
) {
  let lastLinks = {
    google_meet_link: null,
    google_event_link: null,
    conference_status: "timeout",
  };

  for (let i = 0; i < tries; i += 1) {
    const links = await readEventLinks(calendar, calendarId, eventId);
    lastLinks = links;

    console.log(
      "create-calendar-event: meet poll",
      JSON.stringify({
        eventId,
        try: i + 1,
        status: links.conference_status,
        hasMeetLink: Boolean(links.google_meet_link),
      }),
    );

    if (links.google_meet_link) {
      return links;
    }

    if (links.conference_status === "failure") {
      return links;
    }

    if (i < tries - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return lastLinks;
}

async function patchMeetRequest(calendar, calendarId, eventId) {
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
}

async function ensureMeetLinkQuick(calendar, calendarId, eventId) {
  let links = await waitForMeetLink(calendar, calendarId, eventId, 2, 2000);

  if (links.google_meet_link) {
    return links;
  }

  try {
    await patchMeetRequest(calendar, calendarId, eventId);

    console.log(
      "create-calendar-event: requested fresh Meet createRequest via patch",
      JSON.stringify({ eventId, calendarId }),
    );
  } catch (err) {
    console.warn(
      "create-calendar-event: failed to patch Meet onto event:",
      err?.message || err,
    );
    return links;
  }

  const patchedLinks = await waitForMeetLink(calendar, calendarId, eventId, 2, 2000);

  return {
    google_meet_link: patchedLinks.google_meet_link || links.google_meet_link,
    google_event_link: patchedLinks.google_event_link || links.google_event_link,
    conference_status: patchedLinks.conference_status || links.conference_status,
  };
}

async function persistBookingLinks(supabase, bookingId, values) {
  const payload = {};

  if ("google_event_id" in values) payload.google_event_id = values.google_event_id;
  if ("google_event_link" in values) payload.google_event_link = values.google_event_link;
  if ("google_meet_link" in values) payload.google_meet_link = values.google_meet_link;

  const { error } = await supabase.from("bookings").update(payload).eq("id", bookingId);

  if (error) {
    throw error;
  }
}

async function sendVerificationConfirmedEmail(booking) {
  const when = formatAppointment(booking.slot_start);
  const hasMeetLink = Boolean(booking.google_meet_link);
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
    ${
      hasMeetLink
        ? emailButton("Hyr në takim", booking.google_meet_link, "#2563eb")
        : ""
    }
    <p style="margin:0;color:#6b7280;">
      ${
        hasMeetLink
          ? "Do të pranoni edhe një email rikujtues rreth 10 minuta para terminit."
          : "Linku i takimit do të dërgohet në emailin rikujtues rreth 10 minuta para terminit."
      }
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
    ${
      hasMeetLink
        ? emailButton("Join meeting", booking.google_meet_link, "#111827")
        : ""
    }
    <p style="margin:0;color:#6b7280;">
      ${
        hasMeetLink
          ? "You will also receive a reminder email about 10 minutes before the appointment."
          : "The meeting link will be sent again in the reminder email about 10 minutes before the appointment."
      }
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
${hasMeetLink ? `Google Meet: ${booking.google_meet_link}` : ""}
${
  hasMeetLink
    ? "Do të pranoni edhe një email rikujtues rreth 10 minuta para terminit."
    : "Linku i takimit do të dërgohet në emailin rikujtues rreth 10 minuta para terminit."
}`,
    english: `Hi ${booking.full_name || "there"},

Your appointment has been successfully verified.

Time: ${when}
${hasEventLink ? `Calendar event: ${booking.google_event_link}` : ""}
${hasMeetLink ? `Google Meet: ${booking.google_meet_link}` : ""}
${
  hasMeetLink
    ? "You will also receive a reminder email about 10 minutes before the appointment."
    : "The meeting link will be sent again in the reminder email about 10 minutes before the appointment."
}`,
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

  const calendarId = getCalendarIdForGender(booking.gender, calMale, calFemale);

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

    try {
      const refreshed = await readEventLinks(
        calendar,
        calendarId,
        booking.google_event_id,
      );

      existingMeetLink = refreshed.google_meet_link || existingMeetLink;
      existingEventLink = refreshed.google_event_link || existingEventLink;

      if (!existingMeetLink) {
        const ensured = await ensureMeetLinkQuick(
          calendar,
          calendarId,
          booking.google_event_id,
        );

        existingMeetLink = ensured.google_meet_link || existingMeetLink;
        existingEventLink = ensured.google_event_link || existingEventLink;
      }

      await persistBookingLinks(supabase, bookingId, {
        google_meet_link: existingMeetLink,
        google_event_link: existingEventLink,
      });
    } catch (err) {
      console.error(
        "create-calendar-event: failed to refresh existing event links",
        err?.message || err,
      );
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
    summary: `Consultation - ${booking.full_name}`,
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
  const initialMeetLink = getMeetLinkFromEvent(insertRes?.data);
  const initialEventLink = insertRes?.data?.htmlLink || null;

  if (!eventId) {
    return {
      statusCode: 502,
      body: JSON.stringify({ error: "No event id returned from Google" }),
    };
  }

  try {
    await persistBookingLinks(supabase, bookingId, {
      google_event_id: eventId,
      google_event_link: initialEventLink,
      google_meet_link: initialMeetLink,
    });
  } catch (updErr) {
    console.error("create-calendar-event: initial Supabase update failed", updErr);

    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Could not save Google event fields",
        detail: updErr.message,
      }),
    };
  }

  let enrichedBooking = {
    ...booking,
    google_event_id: eventId,
    google_event_link: initialEventLink,
    google_meet_link: initialMeetLink,
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

  try {
    if (!initialMeetLink) {
      const ensured = await ensureMeetLinkQuick(calendar, calendarId, eventId);

      if (
        ensured.google_meet_link &&
        ensured.google_meet_link !== enrichedBooking.google_meet_link
      ) {
        await persistBookingLinks(supabase, bookingId, {
          google_meet_link: ensured.google_meet_link,
          google_event_link:
            ensured.google_event_link || enrichedBooking.google_event_link,
        });

        console.log(
          "create-calendar-event: Meet link obtained after initial save",
          JSON.stringify({
            bookingId,
            eventId,
            hasMeetLink: true,
          }),
        );
      } else if (!ensured.google_meet_link) {
        console.warn(
          "create-calendar-event: event saved and emails sent, but Google Meet link is still missing after quick retries",
          JSON.stringify({ bookingId, eventId, calendarId }),
        );
      }
    }
  } catch (meetErr) {
    console.warn(
      "create-calendar-event: post-save Meet refresh failed:",
      meetErr?.message || meetErr,
    );
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ok: true,
      googleEventId: eventId,
      googleMeetLink: initialMeetLink,
      googleEventLink: initialEventLink,
    }),
  };
};