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
import { sendAdminReminderEmail } from "./lib/adminBookingEmails.mjs";
import { getActiveAdminEmailsByGender } from "./lib/adminRecipients.mjs";

function normalizeRecipients(value) {
  return [
    ...new Set(
      (Array.isArray(value) ? value : [value])
        .flatMap((entry) => String(entry || "").split(","))
        .map((email) => email.trim())
        .filter(Boolean),
    ),
  ];
}

function getCalendarIdForGender(gender) {
  const value = String(gender || "").trim().toLowerCase();

  if (value === "male") return process.env.GOOGLE_CALENDAR_MALE_ID || "";
  if (value === "female") return process.env.GOOGLE_CALENDAR_FEMALE_ID || "";
  return "";
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

function getCalendarClient() {
  const saJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  if (!saJson) {
    throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_JSON");
  }

  const credentials = JSON.parse(saJson);

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });

  return google.calendar({ version: "v3", auth });
}

function getReminderLink(booking) {
  return booking?.google_meet_link || booking?.google_event_link || "";
}

function hasMeetLink(booking) {
  return Boolean(booking?.google_meet_link);
}

async function readEventLinks(calendarClient, calendarId, eventId) {
  const eventRes = await calendarClient.events.get({
    calendarId,
    eventId,
    conferenceDataVersion: 1,
  });

  const event = eventRes?.data || null;

  return {
    google_meet_link: getMeetLinkFromEvent(event),
    google_event_link: event?.htmlLink || null,
  };
}

async function ensureMeetLink(calendarClient, calendarId, eventId) {
  let links = await readEventLinks(calendarClient, calendarId, eventId);

  if (links.google_meet_link) {
    return links;
  }

  try {
    await calendarClient.events.patch({
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
  } catch (patchErr) {
    console.warn(
      `meeting-reminders: failed to request Meet link for event ${eventId}`,
      patchErr?.message || patchErr,
    );
  }

  await new Promise((resolve) => setTimeout(resolve, 2000));

  links = await readEventLinks(calendarClient, calendarId, eventId);
  return links;
}

async function refreshBookingLinksIfNeeded(supabase, calendarClient, booking) {
  if (!booking.google_event_id) {
    return booking;
  }

  const calendarId = getCalendarIdForGender(booking.gender);
  if (!calendarId) {
    return booking;
  }

  try {
    const links = await ensureMeetLink(
      calendarClient,
      calendarId,
      booking.google_event_id,
    );

    const google_meet_link = links.google_meet_link || null;
    const google_event_link =
      links.google_event_link || booking.google_event_link || null;

    if (
      google_meet_link !== booking.google_meet_link ||
      google_event_link !== booking.google_event_link
    ) {
      const { error } = await supabase
        .from("bookings")
        .update({
          google_meet_link,
          google_event_link,
        })
        .eq("id", booking.id);

      if (error) {
        console.error(
          `meeting-reminders: failed to persist refreshed links for booking ${booking.id}`,
          error.message,
        );
      }
    }

    return {
      ...booking,
      google_meet_link,
      google_event_link,
    };
  } catch (err) {
    console.error(
      `meeting-reminders: failed to refresh links for booking ${booking.id}`,
      err?.message || err,
    );
    return booking;
  }
}

async function getAdminRecipients(supabase, booking) {
  let recipients = normalizeRecipients(booking.admin_recipient_emails);

  if (!recipients.length) {
    recipients = await getActiveAdminEmailsByGender(supabase, booking.gender);
  }

  if (!recipients.length) {
    return [];
  }

  const currentStored = normalizeRecipients(booking.admin_recipient_emails);
  const changed =
    recipients.length !== currentStored.length ||
    recipients.some((email) => !currentStored.includes(email));

  if (changed) {
    const { error } = await supabase
      .from("bookings")
      .update({ admin_recipient_emails: recipients })
      .eq("id", booking.id);

    if (error) {
      console.error(
        `meeting-reminders: failed to persist admin recipients for booking ${booking.id}`,
        error.message,
      );
    }
  }

  return recipients;
}

export default async (req) => {
  try {
    await req.json().catch(() => ({}));

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      throw new Error("Missing Supabase env vars");
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const now = Date.now();

    // 10-minute reminder window with 1 minute tolerance on each side
    const reminderWindowStart = new Date(now + 9 * 60 * 1000).toISOString();
    const reminderWindowEnd = new Date(now + 11 * 60 * 1000).toISOString();

    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("*")
      .not("verified_at", "is", null)
      .gte("slot_start", reminderWindowStart)
      .lte("slot_start", reminderWindowEnd)
      .or("status.is.null,status.neq.cancelled");

    if (error) {
      throw error;
    }

    let calendarClient = null;

    for (const booking of bookings || []) {
      const slotStart = booking.slot_start || "";

      const shouldSendUserReminder =
        !booking.meeting_reminder_sent_at &&
        slotStart >= reminderWindowStart &&
        slotStart <= reminderWindowEnd;

      const shouldSendAdminReminder =
        !booking.admin_reminder_sent_at &&
        slotStart >= reminderWindowStart &&
        slotStart <= reminderWindowEnd;

      let hydratedBooking = booking;

      if (
        (shouldSendUserReminder || shouldSendAdminReminder) &&
        booking.google_event_id
      ) {
        if (!calendarClient) {
          calendarClient = getCalendarClient();
        }

        hydratedBooking = await refreshBookingLinksIfNeeded(
          supabase,
          calendarClient,
          booking,
        );
      }

      if (shouldSendUserReminder) {
        const when = formatAppointment(hydratedBooking.slot_start);
        const reminderLink = getReminderLink(hydratedBooking);
        const useMeetLink = hasMeetLink(hydratedBooking);

        const albanianHtml = `
          <p style="margin:0 0 16px 0;">Përshëndetje ${escapeHtml(hydratedBooking.full_name || "aty")},</p>
          <p style="margin:0 0 16px 0;">Kjo është një rikujtesë që termini juaj fillon për rreth 10 minuta.</p>
          <p style="margin:0 0 24px 0;"><strong>Koha:</strong> ${escapeHtml(when)}</p>
          ${
            reminderLink
              ? emailButton(
                  useMeetLink ? "Hyr në Google Meet" : "Hap eventin në kalendar",
                  reminderLink,
                  "#2563eb",
                )
              : ""
          }
          <p style="margin:0;color:#6b7280;">
            ${
              reminderLink
                ? "Shihemi së shpejti."
                : "Ju lutemi kontrolloni emailin e konfirmimit ose kalendarin tuaj për linkun e takimit."
            }
          </p>
        `;

        const englishHtml = `
          <p style="margin:0 0 16px 0;">Hi ${escapeHtml(hydratedBooking.full_name || "there")},</p>
          <p style="margin:0 0 16px 0;">This is your appointment reminder. Your meeting starts in about 10 minutes.</p>
          <p style="margin:0 0 24px 0;"><strong>Time:</strong> ${escapeHtml(when)}</p>
          ${
            reminderLink
              ? emailButton(
                  useMeetLink ? "Join Google Meet" : "Open calendar event",
                  reminderLink,
                  "#111827",
                )
              : ""
          }
          <p style="margin:0;color:#6b7280;">
            ${
              reminderLink
                ? "We will see you shortly."
                : "Please check your confirmation email or calendar for the meeting link."
            }
          </p>
        `;

        const html = renderBilingualEmail({
          preheader:
            "Rikujtesë për terminin tuaj që fillon për rreth 10 minuta. Reminder that your appointment starts in about 10 minutes.",
          title:
            "Rikujtesë për terminin | Reminder: your appointment starts in about 10 minutes",
          albanianHtml,
          englishHtml,
        });

        const text = buildBilingualText({
          albanian: `Përshëndetje ${hydratedBooking.full_name || "aty"},

Kjo është një rikujtesë që termini juaj fillon për rreth 10 minuta.

Koha: ${when}

${
  reminderLink
    ? `${useMeetLink ? "Hyr në Google Meet" : "Hap eventin në kalendar"}:
${reminderLink}`
    : "Ju lutemi kontrolloni emailin e konfirmimit ose kalendarin tuaj për linkun e takimit."
}

Shihemi së shpejti.`,
          english: `Hi ${hydratedBooking.full_name || "there"},

This is your appointment reminder. Your meeting starts in about 10 minutes.

Time: ${when}

${
  reminderLink
    ? `${useMeetLink ? "Join Google Meet" : "Open calendar event"}:
${reminderLink}`
    : "Please check your confirmation email or calendar for the meeting link."
}

We will see you shortly.`,
        });

        try {
          await sendResendEmail({
            to: hydratedBooking.email,
            subject:
              "Rikujtesë për terminin | Reminder: your appointment starts in about 10 minutes",
            html,
            text,
          });

          const sentAt = new Date().toISOString();

          await supabase
            .from("bookings")
            .update({
              meeting_reminder_sent_at: sentAt,
              meeting_link_sent_at: reminderLink ? sentAt : hydratedBooking.meeting_link_sent_at || null,
            })
            .eq("id", hydratedBooking.id);

          console.log(
            `meeting-reminders: user reminder sent for booking ${hydratedBooking.id} using ${useMeetLink ? "google_meet_link" : reminderLink ? "google_event_link" : "no_link"}`
          );
        } catch (emailErr) {
          console.error(
            `meeting-reminders: user reminder failed for booking ${hydratedBooking.id}`,
            emailErr?.message || emailErr,
          );
        }
      }

      if (shouldSendAdminReminder) {
        const recipients = await getAdminRecipients(supabase, hydratedBooking);

        if (!recipients.length) {
          console.warn(
            `meeting-reminders: skipped admin reminder for booking ${hydratedBooking.id} because no admin recipients were available`,
          );
          continue;
        }

        try {
          await sendAdminReminderEmail({
            to: recipients,
            booking: hydratedBooking,
          });

          await supabase
            .from("bookings")
            .update({ admin_reminder_sent_at: new Date().toISOString() })
            .eq("id", hydratedBooking.id);

          console.log(
            `meeting-reminders: admin reminder sent for booking ${hydratedBooking.id} to ${recipients.join(", ")}`,
          );
        } catch (emailErr) {
          console.error(
            `meeting-reminders: admin reminder failed for booking ${hydratedBooking.id}`,
            emailErr?.message || emailErr,
          );
        }
      }
    }
  } catch (err) {
    console.error("meeting-reminders: fatal error", err?.message || err);
  }
};

export const config = {
  schedule: "* * * * *",
};