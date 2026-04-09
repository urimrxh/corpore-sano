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
    return { error: new Error("Supabase nuk është konfiguruar") };
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
      error: new Error("Ajo datë nuk është më e disponueshme."),
      code: "PAST_DATE",
    };
  }

  if (isSlotStartInPast(dateObj, timeSlot)) {
    return {
      data: null,
      error: new Error("Ky interval orari ka kaluar."),
      code: "PAST_SLOT",
    };
  }

  const recent = await hasRecentBookingForEmail(email);
  if (recent) {
    return {
      data: null,
      error: new Error(
        "Keni pasur tashmë një takim në 24 orët e fundit.",
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
          "Keni pasur tashmë një takim në 24 orët e fundit.",
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

export async function deleteBookingAsAdmin(bookingId) {
  try {
    const response = await fetch("/.netlify/functions/delete-calendar-event", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ bookingId }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        error: new Error(data.error || "Heqja e rezervimit dështoi"),
      };
    }

    return { error: null };
  } catch (error) {
    return { error };
  }
}

/**
 * @param {number} limit
 * @param {string | null} adminLine - optional: "male" | "female" from user_metadata.admin_line
 */
export async function fetchBookingsForAdmin(limit = 200, adminLine = null) {
  try {
    const threeDaysAgoIso = new Date(
      Date.now() - 3 * 24 * 60 * 60 * 1000
    ).toISOString();

    let query = supabase
      .from("bookings")
      .select("*")
      .gte("slot_start", threeDaysAgoIso)
      .or("status.is.null,status.neq.cancelled")
      .order("slot_start", { ascending: true })
      .limit(limit);

    if (adminLine === "male" || adminLine === "female") {
      query = query.eq("gender", adminLine);
    }

    const { data, error } = await query;

    return {
      data: data || [],
      error: error || null,
    };
  } catch (error) {
    return {
      data: [],
      error,
    };
  }
}
