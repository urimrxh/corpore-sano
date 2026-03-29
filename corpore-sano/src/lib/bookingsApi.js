import { BOOKING_PENDING_HOLD_MS } from "./bookingConstants";
import { supabase } from "./supabase";
import {
  BOOKING_SLOT_TIMES,
  formatDateKey,
  isSlotStartInPast,
  slotToLocalDateRange,
} from "./timeSlots";

const BOOKINGS_TABLE = "bookings";

/** Same window as RLS policy `004_bookings_rls_insert_and_delete.sql` (one booking per email per 24h). */
const RECENT_BOOKING_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Returns Set of "HH:MM" times already taken for this calendar line (gender + date).
 * Verified bookings always count. Unverified rows only count until they pass the
 * pending-hold window (then a server job deletes them).
 */
export async function fetchBusyTimeSlots(bookingDateKey, gender) {
  if (!supabase || !gender || !bookingDateKey) {
    return new Set();
  }

  const { data, error } = await supabase
    .from(BOOKINGS_TABLE)
    .select("time_slot, verified_at, created_at")
    .eq("booking_date", bookingDateKey)
    .eq("gender", gender);

  if (error) {
    console.warn("fetchBusyTimeSlots:", error.message);
    return new Set();
  }

  const now = Date.now();
  const cutoff = now - BOOKING_PENDING_HOLD_MS;
  const busy = new Set();

  for (const row of data ?? []) {
    if (row.verified_at) {
      busy.add(row.time_slot);
      continue;
    }
    const created = row.created_at
      ? new Date(row.created_at).getTime()
      : 0;
    if (created >= cutoff) {
      busy.add(row.time_slot);
    }
  }

  return busy;
}

/**
 * True if this email already has a booking row created in the last 24 hours (case-insensitive).
 */
export async function hasRecentBookingForEmail(email) {
  if (!supabase || !email?.trim()) {
    return false;
  }

  const cutoff = new Date(Date.now() - RECENT_BOOKING_WINDOW_MS).toISOString();
  const { data, error } = await supabase
    .from(BOOKINGS_TABLE)
    .select("id")
    .ilike("email", email.trim())
    .gte("created_at", cutoff)
    .limit(1);

  if (error) {
    console.warn("hasRecentBookingForEmail:", error.message);
    return false;
  }

  return Boolean(data?.length);
}

export function buildSlotsForDate(
  bookingDateKey,
  gender,
  busyTimes,
  selectedDate,
) {
  if (!gender) return [];

  const keyToday = formatDateKey(new Date());
  const isToday = bookingDateKey === keyToday;

  return BOOKING_SLOT_TIMES.map((time) => {
    const busy = busyTimes.has(time);
    const past =
      isToday &&
      selectedDate instanceof Date &&
      isSlotStartInPast(selectedDate, time);
    let status = "available";
    if (busy) status = "busy";
    else if (past) status = "past";
    return { time, status };
  });
}

export async function createBooking({
  fullName,
  email,
  gender,
  topic,
  bookingDate,
  timeSlot,
}) {
  if (!supabase) {
    return { error: new Error("Supabase is not configured") };
  }

  const dateObj =
    bookingDate instanceof Date ? bookingDate : new Date(bookingDate);
  const y = dateObj.getFullYear();
  const mo = String(dateObj.getMonth() + 1).padStart(2, "0");
  const da = String(dateObj.getDate()).padStart(2, "0");
  const bookingDateKey = `${y}-${mo}-${da}`;
  const todayKey = formatDateKey(new Date());
  if (bookingDateKey < todayKey) {
    return {
      data: null,
      error: new Error("That date is no longer available."),
      code: "PAST_DATE",
    };
  }

  if (isSlotStartInPast(dateObj, timeSlot)) {
    return {
      data: null,
      error: new Error("That time slot has already passed."),
      code: "PAST_SLOT",
    };
  }

  const recent = await hasRecentBookingForEmail(email);
  if (recent) {
    return {
      data: null,
      error: new Error(
        "You've already had a meeting in the last 24 hours.",
      ),
      code: "RECENT_BOOKING",
    };
  }

  const { start, end } = slotToLocalDateRange(dateObj, timeSlot);

  const row = {
    full_name: fullName.trim(),
    email: email.trim(),
    gender,
    topic: (topic || "").trim(),
    booking_date: bookingDateKey,
    time_slot: timeSlot,
    slot_start: start.toISOString(),
    slot_end: end.toISOString(),
    verified_at: null,
  };

  const { data, error } = await supabase
    .from(BOOKINGS_TABLE)
    .insert(row)
    .select("id")
    .single();

  if (error) {
    const msg = error.message || "";
    const rlsBlock =
      msg.includes("row-level security") ||
      msg.includes("violates row-level security");
    if (rlsBlock && msg.toLowerCase().includes("bookings")) {
      return {
        data: null,
        error: new Error(
          "You've already had a meeting in the last 24 hours.",
        ),
        code: "RECENT_BOOKING",
      };
    }
    return {
      data: null,
      error: new Error(error.message),
      code: error.code,
    };
  }

  return { data, error: null, code: null };
}

/**
 * Admin: delete a booking (requires authenticated session + RLS DELETE policy).
 */
export async function deleteBookingAsAdmin(bookingId) {
  if (!supabase) {
    return { error: new Error("Supabase is not configured") };
  }

  const { error } = await supabase
    .from(BOOKINGS_TABLE)
    .delete()
    .eq("id", bookingId);

  if (error) {
    return { error: new Error(error.message) };
  }

  return { error: null };
}

/**
 * @param {number} limit
 * @param {string | null} adminLine - optional: "male" | "female" from user_metadata.admin_line
 */
export async function fetchBookingsForAdmin(limit = 200, adminLine = null) {
  if (!supabase) {
    return { data: [], error: new Error("Supabase is not configured") };
  }

  let q = supabase
    .from(BOOKINGS_TABLE)
    .select(
      "id, created_at, full_name, email, gender, topic, booking_date, time_slot, slot_start, google_event_id, verified_at",
    )
    .order("slot_start", { ascending: false })
    .limit(limit);

  if (adminLine === "male" || adminLine === "female") {
    q = q.eq("gender", adminLine);
  }

  const { data, error } = await q;

  return { data: data ?? [], error };
}
