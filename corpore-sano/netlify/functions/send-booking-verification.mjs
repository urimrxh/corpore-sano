/**
 * After a booking row exists: set verification_token, email the user, or auto-verify if Resend is not configured.
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, URL (Netlify site URL), BOOKING_FUNCTION_SECRET (optional),
 *      RESEND_API_KEY, RESEND_FROM
 */
import { createClient } from "@supabase/supabase-js";
import {
  createCalendarEventFunctionUrl,
  getDeploySiteOrigin,
} from "./lib/siteUrl.mjs";
import {
  sendResendEmail,
  escapeHtml,
  renderBilingualEmail,
  buildBilingualText,
  emailButton,
} from "./lib/resendEmail.mjs";

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
    console.error(
      "send-booking-verification: calendar sync error",
      e?.message || e,
    );
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

function formatBookingDate(value) {
  if (!value) return "";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Europe/Belgrade",
  })
    .format(date)
    .replace(/\//g, ".");
}

function formatBookingTime(value) {
  if (!value) return "";

  const raw = String(value).trim();
  const match = raw.match(/^(\d{2}):(\d{2})/);

  if (match) {
    return `${match[1]}:${match[2]}`;
  }

  return raw;
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
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid JSON" }),
    };
  }

  const bookingId = body.bookingId;

  if (!bookingId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "bookingId required" }),
    };
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server configuration incomplete" }),
    };
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

  const formattedDate = formatBookingDate(booking.booking_date);
  const formattedTime = formatBookingTime(booking.time_slot);

  const albanianHtml = `
    <p style="margin:0 0 16px 0;">Përshëndetje ${escapeHtml(booking.full_name || "aty")},</p>
    <p style="margin:0 0 16px 0;">Ju lutem konfirmoni terminin tuaj nëpërmjet butonit më poshtë.</p>
    <p style="margin:0 0 8px 0;"><strong>Data:</strong> ${escapeHtml(formattedDate)}</p>
    <p style="margin:0 0 24px 0;"><strong>Ora:</strong> ${escapeHtml(formattedTime)}</p>
    ${emailButton("Konfirmo terminin", confirmUrl, "#2563eb")}
    <p style="margin:0 0 12px 0;color:#6b7280;">Nëse butoni nuk punon, perdoreni këtë link:</p>
    <p style="margin:0 0 16px 0;"><a href="${escapeHtml(confirmUrl)}" style="color:#2563eb;text-decoration:none;word-break:break-all;">${escapeHtml(confirmUrl)}</a></p>
    <p style="margin:0;color:#6b7280;">Nëse nuk e keni kërkuar këtë, mund ta injoroni këtë email.</p>
  `;

  const englishHtml = `
    <p style="margin:0 0 16px 0;">Hi ${escapeHtml(booking.full_name || "there")},</p>
    <p style="margin:0 0 16px 0;">Please confirm your appointment using the button below.</p>
    <p style="margin:0 0 8px 0;"><strong>Date:</strong> ${escapeHtml(formattedDate)}</p>
    <p style="margin:0 0 24px 0;"><strong>Time:</strong> ${escapeHtml(formattedTime)}</p>
    ${emailButton("Verify appointment", confirmUrl, "#111827")}
    <p style="margin:0 0 12px 0;color:#6b7280;">If the button does not work, please use this link:</p>
    <p style="margin:0 0 16px 0;"><a href="${escapeHtml(confirmUrl)}" style="color:#2563eb;text-decoration:none;word-break:break-all;">${escapeHtml(confirmUrl)}</a></p>
    <p style="margin:0;color:#6b7280;">If you did not request this, you can ignore this email.</p>
  `;

  const html = renderBilingualEmail({
    preheader:
      "Ju lutem konfirmoni terminin tuaj. Please verify your appointment.",
    title: "Konfirmoni terminin tuaj | Verify your appointment",
    albanianHtml,
    englishHtml,
  });

  const text = buildBilingualText({
    albanian: `Përshëndetje ${booking.full_name || "aty"},

Ju lutem konfirmoni terminin tuaj.

Data: ${formattedDate}
Ora: ${formattedTime}

Konfirmo terminin:
${confirmUrl}

Nëse nuk e keni kërkuar këtë, mund ta injoroni këtë email.`,
    english: `Hi ${booking.full_name || "there"},

Please confirm your appointment.

Date: ${formattedDate}
Time: ${formattedTime}

Verify appointment:
${confirmUrl}

If you did not request this, you can ignore this email.`,
  });

  try {
    await sendResendEmail({
      to: booking.email,
      subject: "Konfirmoni terminin tuaj | Verify your appointment",
      html,
      text,
    });
  } catch (error) {
    console.error(
      "send-booking-verification: resend send failed",
      error?.message || error,
    );

    return {
      statusCode: 502,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Failed to send email",
        detail: error?.message || "Unknown Resend error",
      }),
    };
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ok: true, emailSent: true }),
  };
};