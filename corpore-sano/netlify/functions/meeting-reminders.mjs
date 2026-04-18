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
import { createCalendarEventFunctionUrl } from "./lib/siteUrl.mjs";

function normalizeRecipients(value) {
  return Array.isArray(value)
    ? value.map((email) => String(email || "").trim().toLowerCase()).filter(Boolean)
    : [];
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
      (entry) => entry.entryPointType === "video"
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

async function triggerCalendarSyncForBooking(bookingId) {
  const url = createCalendarEventFunctionUrl();
  if (!url) return false;

  const secret = process.env.BOOKING_FUNCTION_SECRET;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(secret ? { "x-booking-secret": secret } : {}),
        },
        body: JSON.stringify({ bookingId }),
      });

      if (res.ok) {
        return true;
      }

      const text = await res.text().catch(() => "");
      console.error(
        `meeting-reminders: create-calendar-event failed (attempt ${attempt})`,
        res.status,
        text,
      );
    } catch (err) {
      console.error(
        `meeting-reminders: create-calendar-event request failed (attempt ${attempt})`,
        err?.message || err,
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 1200));
  }

  return false;
}

async function loadFreshBooking(supabase, bookingId) {
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .maybeSingle();

  if (error) {
    console.error(
      `meeting-reminders: failed to reload booking ${bookingId}`,
      error.message,
    );
    return null;
  }

  return data || null;
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
      patchErr?.message || patchErr
    );
  }

  await new Promise((resolve) => setTimeout(resolve, 3000));

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
      booking.google_event_id
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
          error.message
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
      err?.message || err
    );
    return booking;
  }
}

async function ensureAdminRecipients(supabase, booking) {
  let recipients = normalizeRecipients(booking.admin_recipient_emails);

  if (recipients.length) {
    return recipients;
  }

  recipients = await getActiveAdminEmailsByGender(supabase, booking.gender);

  if (!recipients.length) {
    return [];
  }

  const { error } = await supabase
    .from("bookings")
    .update({ admin_recipient_emails: recipients })
    .eq("id", booking.id);

  if (error) {
    console.error(
      `meeting-reminders: failed to persist admin recipients for booking ${booking.id}`,
      error.message
    );
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

      // Self-heal: if booking is verified but calendar sync never completed, try again now
      if ((shouldSendUserReminder || shouldSendAdminReminder) && !hydratedBooking.google_event_id) {
        await triggerCalendarSyncForBooking(hydratedBooking.id);
        const fresh = await loadFreshBooking(supabase, hydratedBooking.id);
        if (fresh) {
          hydratedBooking = fresh;
        }
      }

      if (
        (shouldSendUserReminder || shouldSendAdminReminder) &&
        hydratedBooking.google_event_id
      ) {
        if (!calendarClient) {
          calendarClient = getCalendarClient();
        }

        hydratedBooking = await refreshBookingLinksIfNeeded(
          supabase,
          calendarClient,
          hydratedBooking
        );
      }

      if (shouldSendUserReminder) {
        const meetLink = hydratedBooking.google_meet_link;

        if (meetLink) {
          const when = formatAppointment(hydratedBooking.slot_start);

          const albanianHtml = `
            <p style="margin:0 0 16px 0;">Përshëndetje ${escapeHtml(hydratedBooking.full_name || "aty")},</p>
            <p style="margin:0 0 16px 0;">Kjo është një rikujtesë që termini juaj fillon për rreth 10 minuta.</p>
            <p style="margin:0 0 24px 0;"><strong>Koha:</strong> ${escapeHtml(when)}</p>
            ${emailButton("Hyr në Google Meet", meetLink, "#2563eb")}
            <p style="margin:0;color:#6b7280;">Shihemi së shpejti.</p>
          `;

          const englishHtml = `
            <p style="margin:0 0 16px 0;">Hi ${escapeHtml(hydratedBooking.full_name || "there")},</p>
            <p style="margin:0 0 16px 0;">This is your appointment reminder. Your meeting starts in about 10 minutes.</p>
            <p style="margin:0 0 24px 0;"><strong>Time:</strong> ${escapeHtml(when)}</p>
            ${emailButton("Join Google Meet", meetLink, "#111827")}
            <p style="margin:0;color:#6b7280;">We will see you shortly.</p>
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

Kjo është një rikujtesë që terminin tuaj fillon për rreth 10 minuta.

Koha: ${when}

Hyr në Google Meet:
${meetLink}

Shihemi së shpejti.`,
            english: `Hi ${hydratedBooking.full_name || "there"},

This is your appointment reminder. Your meeting starts in about 10 minutes.

Time: ${when}

Join Google Meet:
${meetLink}

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

            await supabase
              .from("bookings")
              .update({ meeting_reminder_sent_at: new Date().toISOString() })
              .eq("id", hydratedBooking.id);
          } catch (emailErr) {
            console.error(
              `meeting-reminders: user reminder failed for booking ${hydratedBooking.id}`,
              emailErr?.message || emailErr
            );
          }
        } else {
          console.warn(
            `meeting-reminders: skipped user reminder for booking ${hydratedBooking.id} because no Google Meet link was available`
          );
        }
      }

      if (shouldSendAdminReminder) {
        const recipients = await ensureAdminRecipients(supabase, hydratedBooking);

        if (!recipients.length) {
          console.warn(
            `meeting-reminders: skipped admin reminder for booking ${hydratedBooking.id} because no admin recipients were stored`
          );
          continue;
        }

        if (!hydratedBooking.google_meet_link) {
          console.warn(
            `meeting-reminders: skipped admin reminder for booking ${hydratedBooking.id} because no Google Meet link was available`
          );
          continue;
        }

        try {
          await sendAdminReminderEmail({
            to: recipients,
            booking: {
              ...hydratedBooking,
              admin_recipient_emails: recipients,
            },
          });

          await supabase
            .from("bookings")
            .update({ admin_reminder_sent_at: new Date().toISOString() })
            .eq("id", hydratedBooking.id);
        } catch (emailErr) {
          console.error(
            `meeting-reminders: admin reminder failed for booking ${hydratedBooking.id}`,
            emailErr?.message || emailErr
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