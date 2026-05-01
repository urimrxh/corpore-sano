import { supabase } from "./supabase";
import { BOOKING_PENDING_HOLD_MINUTES } from "./bookingConstants";
import {
  formatDateKey,
  generateTimeSlots,
  isDateBeforeToday,
  slotToLocalDateRange,
  timeToMinutes,
} from "./timeSlots";
import { getAdminAvailabilityForDate } from "./adminAvailability";

const TABLES = {
  ADMINS: "admins",
  BOOKINGS: "bookings",
};

const ADMIN_COLUMNS = {
  id: "id",
  email: "email",
  gender: "gender",
  active: null,
};

const BOOKING_COLUMNS = {
  id: "id",
  adminId: "admin_id",
  bookingDate: "booking_date",
  timeSlot: "time_slot",
  slotStart: "slot_start",
  slotEnd: "slot_end",
  status: "status",
  fullName: "full_name",
  email: "email",
  topic: "topic",
  createdAt: "created_at",
  gender: "gender",
};

const BUSY_STATUSES = ["pending", "confirmed", "verified"];
const RECENT_BOOKING_STATUSES = ["pending"];
const MIN_BOOKING_LEAD_MINUTES = 10;

function normalizeGender(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isSlotTooSoon(selectedDate, timeSlot) {
  if (!selectedDate || !timeSlot) return true;

  const slotStart = slotToLocalDateRange(selectedDate, timeSlot, 1).start;
  const diffMs = slotStart.getTime() - Date.now();

  return diffMs < MIN_BOOKING_LEAD_MINUTES * 60 * 1000;
}

function rangesOverlap(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

function removeBlockedSlotTimes(slotTimes, durationMinutes, blockedRanges) {
  if (!Array.isArray(blockedRanges) || blockedRanges.length === 0) {
    return slotTimes;
  }

  return (slotTimes || []).filter((slotTime) => {
    const slotStart = timeToMinutes(slotTime);
    const slotEnd = slotStart + durationMinutes;

    if (slotStart == null || Number.isNaN(slotEnd)) {
      return false;
    }

    const overlapsBlockedRange = blockedRanges.some((range) => {
      const blockStart = timeToMinutes(range?.start_time);
      const blockEnd = timeToMinutes(range?.end_time);

      if (blockStart == null || blockEnd == null) {
        return false;
      }

      return rangesOverlap(slotStart, slotEnd, blockStart, blockEnd);
    });

    return !overlapsBlockedRange;
  });
}

function buildSlotObjects(slotTimes, busyTimes, selectedDate) {
  const busySet = new Set(
    (busyTimes || []).map((value) => String(value).slice(0, 5)),
  );

  return (slotTimes || []).map((time) => {
    let status = "free";

    if (busySet.has(time)) {
      status = "busy";
    } else if (isSlotTooSoon(selectedDate, time)) {
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
      [ADMIN_COLUMNS.id, ADMIN_COLUMNS.gender, ADMIN_COLUMNS.email]
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
  const normalizedEmail = normalizeEmail(email);

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

async function getAllowedSlotTimesForAdmin(adminId, dateKey) {
  const availability = await getAdminAvailabilityForDate(adminId, dateKey);

  if (!availability.isAvailable) {
    return {
      availability,
      slotTimes: [],
    };
  }

  const generatedSlotTimes = generateTimeSlots(
    availability.startTime,
    availability.endTime,
    availability.slotDurationMinutes,
  );

  const filteredSlotTimes = removeBlockedSlotTimes(
    generatedSlotTimes,
    availability.slotDurationMinutes,
    availability.blockedRanges || [],
  );

  return {
    availability,
    slotTimes: filteredSlotTimes,
  };
}

async function validateSlotForAdmin(adminId, dateKey, timeSlot, selectedDate) {
  const { availability, slotTimes: allowedSlotTimes } =
    await getAllowedSlotTimesForAdmin(adminId, dateKey);

  if (!availability.isAvailable) {
    return { valid: false, code: "PAST_DATE" };
  }

  if (!allowedSlotTimes.includes(timeSlot)) {
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

  const { availability, slotTimes } = await getAllowedSlotTimesForAdmin(
    adminId,
    dateKey,
  );

  if (!availability.isAvailable) {
    return [];
  }

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
    const selectedDate =
      bookingDate instanceof Date
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

    if (isSlotTooSoon(selectedDate, timeSlot)) {
      return {
        data: null,
        error: new Error("This slot is too close to the current time."),
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
      [BOOKING_COLUMNS.slotStart]: start.toISOString(),
      [BOOKING_COLUMNS.slotEnd]: end.toISOString(),
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
      data: data || null,
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

export async function fetchBookingsAsAdmin(filters = {}) {
  const {
    adminId = null,
    adminEmail = "",
    gender = "",
    statuses = [],
  } = typeof filters === "object" && filters !== null ? filters : {};

  let query = supabase.from(TABLES.BOOKINGS).select("*");

  if (adminId) {
    query = query.eq(BOOKING_COLUMNS.adminId, adminId);
  }

  if (gender) {
    query = query.ilike(BOOKING_COLUMNS.gender, normalizeGender(gender));
  }

  if (Array.isArray(statuses) && statuses.length > 0) {
    query = query.in(BOOKING_COLUMNS.status, statuses);
  }

  query = query
    .order(BOOKING_COLUMNS.bookingDate, { ascending: true })
    .order(BOOKING_COLUMNS.timeSlot, { ascending: true })
    .order(BOOKING_COLUMNS.createdAt, { ascending: false });

  const { data, error } = await query;

  if (error) {
    return {
      data: [],
      error,
      code: error.code || null,
    };
  }

  let rows = data || [];

  if (!adminId && adminEmail) {
    const normalizedAdminEmail = normalizeEmail(adminEmail);

    rows = rows.filter((row) => {
      const rowEmail = normalizeEmail(
        row?.assigned_admin_email || row?.admin_email || "",
      );
      return !rowEmail || rowEmail === normalizedAdminEmail;
    });
  }

  return {
    data: rows,
    error: null,
    code: null,
  };
}

export async function deleteBookingAsAdmin(bookingId) {
  if (!bookingId) {
    return {
      error: new Error("Missing booking id."),
      code: "INVALID_BOOKING_ID",
    };
  }

  const { error } = await supabase
    .from(TABLES.BOOKINGS)
    .delete()
    .eq(BOOKING_COLUMNS.id, bookingId);

  return {
    error: error || null,
    code: error?.code || null,
  };
}

export async function updateBookingStatusAsAdmin(bookingId, status) {
  if (!bookingId || !status) {
    return {
      data: null,
      error: new Error("Missing booking id or status."),
      code: "INVALID_INPUT",
    };
  }

  const { data, error } = await supabase
    .from(TABLES.BOOKINGS)
    .update({
      [BOOKING_COLUMNS.status]: status,
    })
    .eq(BOOKING_COLUMNS.id, bookingId)
    .select()
    .single();

  return {
    data: data || null,
    error: error || null,
    code: error?.code || null,
  };
}

export const fetchAdminBookings = fetchBookingsAsAdmin;
export const fetchBookingsForAdmin = fetchBookingsAsAdmin;
export const updateBookingAsAdminStatus = updateBookingStatusAsAdmin;

/** Monday–Saturday then Sunday, matching admin UI weekday order for display. */
const WEEKDAY_ORDER_MON_FIRST = [1, 2, 3, 4, 5, 6, 0];

/**
 * Enabled `day_of_week` values from `admin_availability` for the admin resolved from gender
 * (same resolution path as booking slots).
 * @param {string} gender
 * @returns {Promise<number[]>} ordered indices 0=Sun … 6=Sat
 */
export async function fetchEnabledBookingWeekdayIndicesForGender(gender) {
  if (!supabase) {
    console.warn(
      "[bookingsApi] fetchEnabledBookingWeekdayIndicesForGender: Supabase client missing",
    );
    return [];
  }

  try {
    const admin = await resolveAdminForGender(gender);
    if (!admin?.id) return [];

    const { data, error } = await supabase
      .from("admin_availability")
      .select("day_of_week, is_enabled")
      .eq("admin_id", admin.id);

    if (error) {
      console.warn("[bookingsApi] admin_availability", error.message || error);
      return [];
    }

    const enabled = new Set(
      (data || [])
        .filter((row) => row.is_enabled)
        .map((row) => row.day_of_week),
    );

    return WEEKDAY_ORDER_MON_FIRST.filter((d) => enabled.has(d));
  } catch (e) {
    console.warn("[bookingsApi] fetchEnabledBookingWeekdayIndicesForGender", e);
    return [];
  }
}