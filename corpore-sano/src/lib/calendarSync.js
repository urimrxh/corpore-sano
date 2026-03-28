/**
 * Optional Netlify Function to create a Google Calendar event after a booking is stored.
 * Set VITE_CALENDAR_SYNC_URL to your deployed function URL (e.g. https://yoursite.netlify.app/.netlify/functions/create-calendar-event).
 * If unset, booking still works in Supabase; calendar sync is skipped.
 */
export async function requestCalendarSync(payload) {
  const url = import.meta.env.VITE_CALENDAR_SYNC_URL;
  if (!url || typeof url !== "string" || !url.startsWith("http")) {
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
      console.warn("Calendar sync failed:", res.status, text);
      return { ok: false, error: text };
    }
    try {
      return { ok: true, data: JSON.parse(text) };
    } catch {
      return { ok: true, data: text };
    }
  } catch (e) {
    console.warn("Calendar sync request failed:", e);
    return { ok: false, error: e?.message };
  }
}
