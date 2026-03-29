/**
 * After a booking row exists: set verification_token, email the user, or auto-verify if Resend is not configured.
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, URL (Netlify site URL), BOOKING_FUNCTION_SECRET (optional),
 *      RESEND_API_KEY, RESEND_FROM (e.g. "Corpore Sano <onboarding@resend.dev>")
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
      "send-booking-verification: missing deploy site URL; calendar sync skipped",
    );
    return;
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
        "send-booking-verification: create-calendar-event failed",
        res.status,
        text,
      );
    }
  } catch (e) {
    console.error("send-booking-verification: calendar sync error", e?.message || e);
  }
}

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
    return {
      statusCode: 401,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Unauthorized",
        hint: "Set VITE_BOOKING_FUNCTION_SECRET in the frontend build to match BOOKING_FUNCTION_SECRET on Netlify, or remove both.",
      }),
    };
  }

  let body;
  try {
    body = JSON.parse(request.body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const bookingId = body.bookingId;
  if (!bookingId) {
    return { statusCode: 400, body: JSON.stringify({ error: "bookingId required" }) };
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return { statusCode: 500, body: JSON.stringify({ error: "Server configuration incomplete" }) };
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: booking, error: fetchErr } = await supabase
    .from("bookings")
    .select("id, email, full_name, booking_date, time_slot, verified_at")
    .eq("id", bookingId)
    .maybeSingle();

  if (fetchErr || !booking) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: fetchErr?.message || "Booking not found" }),
    };
  }

  if (booking.verified_at) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, alreadyVerified: true }),
    };
  }

  const resendKey = process.env.RESEND_API_KEY;
  const siteUrl = getDeploySiteOrigin();

  if (!resendKey) {
    const now = new Date().toISOString();
    await supabase
      .from("bookings")
      .update({ verified_at: now, verification_token: null })
      .eq("id", bookingId);
    await triggerCalendarSync(bookingId);
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ok: true,
        emailSent: false,
        autoVerified: true,
        message: "RESEND_API_KEY not set — booking confirmed automatically.",
      }),
    };
  }

  const token = crypto.randomUUID();
  const { error: updErr } = await supabase
    .from("bookings")
    .update({ verification_token: token })
    .eq("id", bookingId);

  if (updErr) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: updErr.message }),
    };
  }

  const confirmPath = `/.netlify/functions/confirm-booking?token=${encodeURIComponent(token)}`;
  const confirmUrl = siteUrl ? `${siteUrl}${confirmPath}` : confirmPath;

  const from = process.env.RESEND_FROM || "Corpore Sano <onboarding@resend.dev>";
  const subject = "Verify your appointment";
  const html = `
    <p>Hi ${escapeHtml(booking.full_name || "there")},</p>
    <p>Please confirm your appointment on <strong>${escapeHtml(booking.booking_date)}</strong> at <strong>${escapeHtml(booking.time_slot)}</strong> by clicking the link below:</p>
    <p><a href="${confirmUrl}">Verify my appointment</a></p>
    <p>If you did not request this, you can ignore this email.</p>
  `;

  const resendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [booking.email],
      subject,
      html,
    }),
  });

  if (!resendRes.ok) {
    const text = await resendRes.text();
    console.error(
      "Resend error:",
      resendRes.status,
      resendRes.statusText,
      text,
    );
    return {
      statusCode: 502,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Failed to send email", detail: text }),
    };
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ok: true, emailSent: true }),
  };
};

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
