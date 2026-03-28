/**
 * Calls Netlify function to email verification link (or auto-verify if Resend not configured).
 *
 * Uses VITE_SEND_BOOKING_VERIFICATION_URL when set; otherwise the current origin +
 * `/.netlify/functions/send-booking-verification` (no extra env on Netlify).
 * For local `npm run dev`, set VITE_SEND_BOOKING_VERIFICATION_URL to your deployed function URL,
 * or use `netlify dev` so functions run locally.
 *
 * Optional VITE_BOOKING_FUNCTION_SECRET must match BOOKING_FUNCTION_SECRET on Netlify.
 */
function resolveSendVerificationUrl() {
  const explicit = import.meta.env.VITE_SEND_BOOKING_VERIFICATION_URL;
  if (typeof explicit === "string" && explicit.startsWith("http")) {
    return explicit;
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}/.netlify/functions/send-booking-verification`;
  }
  return null;
}

export async function requestBookingVerificationEmail(payload) {
  const url = resolveSendVerificationUrl();
  if (!url) {
    return { ok: false, skipped: true };
  }

  const secret = import.meta.env.VITE_BOOKING_FUNCTION_SECRET;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(secret ? { "x-booking-secret": secret } : {}),
      },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    if (!res.ok) {
      console.warn("Booking verification email failed:", res.status, text);
      let detail = text;
      try {
        const j = JSON.parse(text);
        detail = j.hint || j.error || j.detail || text;
      } catch {
        /* keep text */
      }
      return {
        ok: false,
        status: res.status,
        error: text,
        detail,
      };
    }
    try {
      return { ok: true, data: JSON.parse(text) };
    } catch {
      return { ok: true, data: text };
    }
  } catch (e) {
    console.warn("Booking verification request failed:", e);
    return { ok: false, error: e?.message };
  }
}
