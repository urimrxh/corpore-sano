/**
 * GET ?token= — marks booking verified, then syncs Google Calendar.
 * Redirects to /book-meeting?verify=success|error|invalid
 */
import { createClient } from "@supabase/supabase-js";

async function triggerCalendarSync(bookingId) {
  const base = process.env.URL || "";
  const url = `${base.replace(/\/$/, "")}/.netlify/functions/create-calendar-event`;
  const secret = process.env.BOOKING_FUNCTION_SECRET;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(secret ? { "x-booking-secret": secret } : {}),
    },
    body: JSON.stringify({ bookingId }),
  });
  if (!res.ok) {
    console.warn("confirm-booking: calendar sync failed", await res.text());
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
  const site = (process.env.URL || "").replace(/\/$/, "") || "";
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

  if (booking.verified_at) {
    return redirect("?verify=already");
  }

  const now = new Date().toISOString();
  const { error: updErr } = await supabase
    .from("bookings")
    .update({ verified_at: now, verification_token: null })
    .eq("id", booking.id);

  if (updErr) {
    return redirect("?verify=error");
  }

  await triggerCalendarSync(booking.id);

  return redirect("?verify=success");
};
