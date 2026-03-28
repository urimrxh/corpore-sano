import { supabase } from "./supabase";
import { BOOKING_SLOT_TIMES, slotToLocalDateRange } from "./timeSlots";

const BOOKINGS_TABLE = "bookings";

/**
 * Returns Set of "HH:MM" times already booked for this calendar line (gender + date).
 */
export async function fetchBusyTimeSlots(bookingDateKey, gender) {
  if (!supabase || !gender || !bookingDateKey) {
    return new Set();
  }

  const { data, error } = await supabase
    .from(BOOKINGS_TABLE)
    .select("time_slot")
    .eq("booking_date", bookingDateKey)
    .eq("gender", gender);

  if (error) {
    console.warn("fetchBusyTimeSlots:", error.message);
    return new Set();
  }

  return new Set((data ?? []).map((r) => r.time_slot));
}

export function buildSlotsForDate(bookingDateKey, gender, busyTimes) {
  if (!gender) return [];

  return BOOKING_SLOT_TIMES.map((time) => {
    const busy = busyTimes.has(time);
    return {
      time,
      status: busy ? "busy" : "available",
    };
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
  };

  const { data, error } = await supabase
    .from(BOOKINGS_TABLE)
    .insert(row)
    .select("id")
    .single();

  if (error) {
    return {
      data: null,
      error: new Error(error.message),
      code: error.code,
    };
  }

  return { data, error: null, code: null };
}

export async function fetchBookingsForAdmin(limit = 200) {
  if (!supabase) {
    return { data: [], error: new Error("Supabase is not configured") };
  }

  const { data, error } = await supabase
    .from(BOOKINGS_TABLE)
    .select(
      "id, created_at, full_name, email, gender, topic, booking_date, time_slot, slot_start, google_event_id",
    )
    .order("slot_start", { ascending: false })
    .limit(limit);

  return { data: data ?? [], error };
}
