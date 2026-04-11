/**
 * GET ?token= — marks booking verified, then syncs Google Calendar.
 * Redirects to /book-meeting?verify=success|error|missing|invalid
 * If calendar sync fails: ?verify=success&calendarSync=failed
 *
 * Important:
 * - token is NOT cleared immediately
 * - repeated clicks/scanner hits still resolve to success
 */
import { createClient } from "@supabase/supabase-js";
import {
  createCalendarEventFunctionUrl,
  getDeploySiteOrigin,
} from "./lib/siteUrl.mjs";

async function triggerCalendarSync(bookingId) {
  const url = createCalendarEventFunctionUrl();

  if (!url) {
    console.error(
      "confirm-booking: missing deploy site URL (set URL or DEPLOY_PRIME_URL on Netlify); calendar sync skipped",
    );
    return false;
  }

  const secret = process.env.BOOKING_FUNCTION_SECRET;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(secret ? { "x-booking-secret": secret } : {}),
      },
      body: JSON.stringify({ bookingId }),
    });

    const text = await res.text();

    if (!res.ok) {
      console.error(
        "confirm-booking: create-calendar-event failed",
        res.status,
        text,
      );
      return false;
    }

    return true;
  } catch (e) {
    console.error(
      "confirm-booking: calendar sync request error",
      e?.message || e,
    );
    return false;
  }
}

export const handler = async (event) => {
  if (event.httpMethod !== "GET" && event.httpMethod !== "HEAD") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  if (event.httpMethod === "HEAD") {
    return { statusCode: 200 };
  }

  const token = event.queryStringParameters?.token;
  const site = getDeploySiteOrigin();

  const redirect = (q) => ({
    statusCode: 302,
    headers: { Location: `${site}/book-meeting${q}` },
  });

  if (!token) {
    return redirect("?verify=missing");
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return redirect("?verify=error");
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: booking, error: findErr } = await supabase
    .from("bookings")
    .select("id, verified_at, verification_token")
    .eq("verification_token", token)
    .maybeSingle();

  if (findErr || !booking) {
    return redirect("?verify=invalid");
  }

  // Treat repeated opens as success
  if (booking.verified_at) {
    return redirect("?verify=success");
  }

  const now = new Date().toISOString();

  const { error: updErr } = await supabase
    .from("bookings")
    .update({
      verified_at: now,
      // keep verification_token so repeated clicks still resolve to success
    })
    .eq("id", booking.id);

  if (updErr) {
    return redirect("?verify=error");
  }

  const calendarOk = await triggerCalendarSync(booking.id);

  return redirect(
    calendarOk ? "?verify=success" : "?verify=success&calendarSync=failed",
  );
};