import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import { sendAdminReminderEmail } from "./lib/adminBookingEmails.mjs";
import { getActiveAdminEmailsByGender } from "./lib/adminRecipients.mjs";

function getCalendarIdForGender(gender) {
  const value = String(gender || "").trim().toLowerCase();

  if (value === "male") return process.env.GOOGLE_CALENDAR_MALE_ID || "";
  if (value === "female") return process.env.GOOGLE_CALENDAR_FEMALE_ID || "";
  return "";
}

function getMeetLink(eventRes) {
  return (
    eventRes?.data?.hangoutLink ||
    eventRes?.data?.conferenceData?.entryPoints?.find(
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

function normalizeRecipients(value) {
  return [
    ...new Set(
      (Array.isArray(value) ? value : [])
        .map((email) => String(email || "").trim().toLowerCase())
        .filter(Boolean)
    ),
  ];
}

async function resolveAdminRecipients(supabase, booking) {
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
      `send-admin-appointment-reminders: failed to persist admin recipients for booking ${booking.id}`,
      error.message
    );
  }

  return recipients;
}

async function refreshGoogleLinksIfNeeded(supabase, calendarClient, booking) {
  if (!booking.google_event_id) return booking;

  const alreadyHasBoth = booking.google_event_link && booking.google_meet_link;
  if (alreadyHasBoth) return booking;

  const calendarId = getCalendarIdForGender(booking.gender);
  if (!calendarId) return booking;

  try {
    const eventRes = await calendarClient.events.get({
      calendarId,
      eventId: booking.google_event_id,
      conferenceDataVersion: 1,
    });

    const google_event_link =
      eventRes?.data?.htmlLink || booking.google_event_link || null;
    const google_meet_link =
      getMeetLink(eventRes) || booking.google_meet_link || null;

    if (
      google_event_link !== booking.google_event_link ||
      google_meet_link !== booking.google_meet_link
    ) {
      await supabase
        .from("bookings")
        .update({
          google_event_link,
          google_meet_link,
        })
        .eq("id", booking.id);
    }

    return {
      ...booking,
      google_event_link,
      google_meet_link,
    };
  } catch (error) {
    console.error(
      `send-admin-appointment-reminders: failed to refresh links for booking ${booking.id}`,
      error?.message || error
    );
    return booking;
  }
}

export default async () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error(
      "send-admin-appointment-reminders: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );

    return new Response(
      JSON.stringify({ ok: false, error: "missing_supabase_config" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const windowStart = new Date(Date.now() + 14 * 60 * 1000).toISOString();
  const windowEnd = new Date(Date.now() + 16 * 60 * 1000).toISOString();

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select("*")
    .not("verified_at", "is", null)
    .not("google_event_id", "is", null)
    .is("admin_reminder_sent_at", null)
    .gte("slot_start", windowStart)
    .lt("slot_start", windowEnd);

  if (error) {
    console.error("send-admin-appointment-reminders:", error);

    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  let sent = 0;
  let calendarClient = null;

  for (const booking of bookings || []) {
    try {
      let hydratedBooking = booking;

      const needsGoogleRefresh =
        booking.google_event_id &&
        (!booking.google_event_link || !booking.google_meet_link);

      if (needsGoogleRefresh) {
        if (!calendarClient) {
          calendarClient = getCalendarClient();
        }

        hydratedBooking = await refreshGoogleLinksIfNeeded(
          supabase,
          calendarClient,
          booking
        );
      }

      const recipients = await resolveAdminRecipients(supabase, hydratedBooking);

      if (!recipients.length) {
        console.warn(
          `send-admin-appointment-reminders: no recipients found for booking ${booking.id}`
        );
        continue;
      }

      await sendAdminReminderEmail({
        to: recipients,
        booking: hydratedBooking,
      });

      await supabase
        .from("bookings")
        .update({ admin_reminder_sent_at: new Date().toISOString() })
        .eq("id", booking.id);

      sent += 1;
    } catch (error) {
      console.error(
        `send-admin-appointment-reminders: failed for booking ${booking.id}`,
        error?.message || error
      );
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      checked: bookings?.length ?? 0,
      sent,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
};

export const config = {
  schedule: "* * * * *",
};