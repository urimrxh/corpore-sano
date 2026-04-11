// src/lib/bookingsApi.js

import { supabase } from "./supabase";
import { BOOKING_PENDING_HOLD_MINUTES } from "./bookingConstants";
import {
  formatDateKey,
  generateTimeSlots,
  isDateBeforeToday,
  isSlotStartInPast,
  slotToLocalDateRange,
} from "./timeSlots";
import { getAdminAvailabilityForDate } from "./adminAvailability";

/**
 * Change these only if your actual DB column names differ.
 */
const TABLES = {
  ADMINS: "admins",
  BOOKINGS: "bookings",
};

const ADMIN_COLUMNS = {
  id: "id",
  gender: "gender", // change to "specialist_gender" if needed
  active: null, // set to "is_active" or "active" if you have it
};

const BOOKING_COLUMNS = {
  id: "id",
  adminId: "admin_id",
  bookingDate: "booking_date", // change to "appointment_date" if needed
  timeSlot: "time_slot", // change to "appointment_time" if needed
  status: "status",
  fullName: "full_name",
  email: "email",
  topic: "topic",
  createdAt: "created_at",
  gender: "gender",
};

const BUSY_STATUSES = ["pending", "confirmed", "verified"];
const RECENT_BOOKING_STATUSES = ["pending"];

function normalizeGender(value) {
  return String(value || "").trim().toLowerCase();
}

function buildSlotObjects(slotTimes, busyTimes, selectedDate) {
  const busySet = new Set((busyTimes || []).map((value) => String(value).slice(0, 5)));

  return (slotTimes || []).map((time) => {
    let status = "free";

    if (busySet.has(time)) {
      status = "busy";
    } else if (isSlotStartInPast(selectedDate, time)) {
      status = "past";
    }

    return { time, status };
  });
}

async function resolveAdminForGender(gender) {
  const normalizedGender = normalizeGender(gender);

  if (!normalizedGender) {
    return null;
  }

  let query = supabase
    .from(TABLES.ADMINS)
    .select(
      [ADMIN_COLUMNS.id, ADMIN_COLUMNS.gender]
        .filter(Boolean)
        .join(", "),
    )
    .ilike(ADMIN_COLUMNS.gender, normalizedGender)
    .limit(1);

  if (ADMIN_COLUMNS.active) {
    query = query.eq(ADMIN_COLUMNS.active, true);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data?.[0] || null;
}

async function fetchBusyTimeSlotsByAdmin(adminId, dateKey) {
  if (!adminId || !dateKey) {
    return [];
  }

  const { data, error } = await supabase
    .from(TABLES.BOOKINGS)
    .select(`${BOOKING_COLUMNS.timeSlot}, ${BOOKING_COLUMNS.status}`)
    .eq(BOOKING_COLUMNS.adminId, adminId)
    .eq(BOOKING_COLUMNS.bookingDate, dateKey)
    .in(BOOKING_COLUMNS.status, BUSY_STATUSES);

  if (error) {
    throw error;
  }

  return (data || [])
    .map((row) => row?.[BOOKING_COLUMNS.timeSlot])
    .filter(Boolean)
    .map((value) => String(value).slice(0, 5));
}

async function hasRecentPendingBooking(email) {
  const normalizedEmail = String(email || "").trim();

  if (!normalizedEmail) {
    return false;
  }

  const cutoff = new Date(
    Date.now() - BOOKING_PENDING_HOLD_MINUTES * 60 * 1000,
  ).toISOString();

  try {
    const { data, error } = await supabase
      .from(TABLES.BOOKINGS)
      .select(BOOKING_COLUMNS.id)
      .ilike(BOOKING_COLUMNS.email, normalizedEmail)
      .in(BOOKING_COLUMNS.status, RECENT_BOOKING_STATUSES)
      .gte(BOOKING_COLUMNS.createdAt, cutoff)
      .limit(1);

    if (error) {
      console.warn("Recent booking check skipped:", error.message);
      return false;
    }

    return Boolean(data?.length);
  } catch (error) {
    console.warn("Recent booking check failed:", error);
    return false;
  }
}

async function validateSlotForAdmin(adminId, dateKey, timeSlot, selectedDate) {
  const availability = await getAdminAvailabilityForDate(adminId, dateKey);

  if (!availability.isAvailable) {
    return { valid: false, code: "PAST_DATE" };
  }

  const allowedSlotTimes = generateTimeSlots(
    availability.startTime,
    availability.endTime,
    availability.slotDurationMinutes,
  );

  if (!allowedSlotTimes.includes(timeSlot)) {
    return { valid: false, code: "PAST_SLOT" };
  }

  if (isSlotStartInPast(selectedDate, timeSlot)) {
    return { valid: false, code: "PAST_SLOT" };
  }

  const busyTimes = await fetchBusyTimeSlotsByAdmin(adminId, dateKey);

  if (busyTimes.includes(timeSlot)) {
    return { valid: false, code: "23505" };
  }

  return {
    valid: true,
    availability,
  };
}

export async function fetchBusyTimeSlots(dateKey, gender) {
  const admin = await resolveAdminForGender(gender);

  if (!admin) {
    return [];
  }

  return fetchBusyTimeSlotsByAdmin(admin[ADMIN_COLUMNS.id], dateKey);
}

export function buildSlotsForDate(
  _dateKey,
  _gender,
  busyTimes = [],
  selectedDate = new Date(),
  slotTimes = [],
) {
  return buildSlotObjects(slotTimes, busyTimes, selectedDate);
}

export async function fetchSlotsForDate(dateKey, gender, selectedDate) {
  const admin = await resolveAdminForGender(gender);

  if (!admin) {
    return [];
  }

  const adminId = admin[ADMIN_COLUMNS.id];

  const availability = await getAdminAvailabilityForDate(adminId, dateKey);

  if (!availability.isAvailable) {
    return [];
  }

  const slotTimes = generateTimeSlots(
    availability.startTime,
    availability.endTime,
    availability.slotDurationMinutes,
  );

  const busyTimes = await fetchBusyTimeSlotsByAdmin(adminId, dateKey);

  return buildSlotObjects(slotTimes, busyTimes, selectedDate);
}

export async function createBooking({
  fullName,
  email,
  gender,
  topic,
  bookingDate,
  timeSlot,
}) {
  try {
    const dateKey = formatDateKey(bookingDate);
    const selectedDate = bookingDate instanceof Date
      ? bookingDate
      : new Date(`${dateKey}T12:00:00`);

    if (!dateKey || !timeSlot) {
      return {
        data: null,
        error: new Error("Invalid booking date or time slot."),
        code: "INVALID_INPUT",
      };
    }

    if (isDateBeforeToday(selectedDate)) {
      return {
        data: null,
        error: new Error("Booking date is in the past."),
        code: "PAST_DATE",
      };
    }

    if (isSlotStartInPast(selectedDate, timeSlot)) {
      return {
        data: null,
        error: new Error("Selected time slot is already in the past."),
        code: "PAST_SLOT",
      };
    }

    const admin = await resolveAdminForGender(gender);

    if (!admin) {
      return {
        data: null,
        error: new Error("No active admin found for the selected specialist."),
        code: "NO_ADMIN",
      };
    }

    const adminId = admin[ADMIN_COLUMNS.id];

    const recentBookingExists = await hasRecentPendingBooking(email);

    if (recentBookingExists) {
      return {
        data: null,
        error: new Error("A recent pending booking already exists."),
        code: "RECENT_BOOKING",
      };
    }

    const validation = await validateSlotForAdmin(
      adminId,
      dateKey,
      timeSlot,
      selectedDate,
    );

    if (!validation.valid) {
      return {
        data: null,
        error: new Error("This slot is no longer available."),
        code: validation.code,
      };
    }

    const durationMinutes = validation.availability.slotDurationMinutes ?? 30;
    const { start, end } = slotToLocalDateRange(
      selectedDate,
      timeSlot,
      durationMinutes,
    );

    const payload = {
      [BOOKING_COLUMNS.fullName]: String(fullName || "").trim(),
      [BOOKING_COLUMNS.email]: String(email || "").trim(),
      [BOOKING_COLUMNS.gender]: gender,
      [BOOKING_COLUMNS.topic]: topic || null,
      [BOOKING_COLUMNS.adminId]: adminId,
      [BOOKING_COLUMNS.bookingDate]: dateKey,
      [BOOKING_COLUMNS.timeSlot]: timeSlot,
      [BOOKING_COLUMNS.status]: "pending",
    };

    const { data, error } = await supabase
      .from(TABLES.BOOKINGS)
      .insert(payload)
      .select()
      .single();

    if (error) {
      return {
        data: null,
        error,
        code: error.code || null,
      };
    }

    return {
      data: {
        ...data,
        slotStart: start.toISOString(),
        slotEnd: end.toISOString(),
      },
      error: null,
      code: null,
    };
  } catch (error) {
    return {
      data: null,
      error,
      code: error?.code || null,
    };
  }
}