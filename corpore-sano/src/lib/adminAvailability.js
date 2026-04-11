// src/lib/adminAvailability.js

import { supabase } from "./supabase";
import { generateTimeSlots, timeToMinutes } from "./timeSlots";

function rangesOverlap(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

export async function getAdminAvailabilityForDate(adminId, dateKey) {
  if (!adminId || !dateKey) {
    return {
      isAvailable: false,
      startTime: null,
      endTime: null,
      slotDurationMinutes: null,
      blockedRanges: [],
    };
  }

  const date = new Date(`${dateKey}T12:00:00`);
  const dayOfWeek = date.getDay();

  const [
    { data: weeklyRow, error: weeklyError },
    { data: overrideRow, error: overrideError },
    { data: blockedRows, error: blockedError },
  ] = await Promise.all([
    supabase
      .from("admin_availability")
      .select("admin_id, day_of_week, is_enabled, start_time, end_time, slot_duration_minutes")
      .eq("admin_id", adminId)
      .eq("day_of_week", dayOfWeek)
      .maybeSingle(),

    supabase
      .from("admin_availability_overrides")
      .select("admin_id, override_date, is_available, start_time, end_time, slot_duration_minutes, note")
      .eq("admin_id", adminId)
      .eq("override_date", dateKey)
      .maybeSingle(),

    supabase
      .from("admin_weekly_blocked_ranges")
      .select("id, admin_id, day_of_week, start_time, end_time, note")
      .eq("admin_id", adminId)
      .eq("day_of_week", dayOfWeek)
      .order("start_time", { ascending: true }),
  ]);

  if (weeklyError) throw weeklyError;
  if (overrideError) throw overrideError;
  if (blockedError) throw blockedError;

  if (overrideRow) {
    if (!overrideRow.is_available) {
      return {
        isAvailable: false,
        startTime: null,
        endTime: null,
        slotDurationMinutes: null,
        blockedRanges: [],
      };
    }

    return {
      isAvailable: true,
      startTime: overrideRow.start_time,
      endTime: overrideRow.end_time,
      slotDurationMinutes:
        overrideRow.slot_duration_minutes ??
        weeklyRow?.slot_duration_minutes ??
        30,
      blockedRanges: blockedRows || [],
    };
  }

  if (!weeklyRow || !weeklyRow.is_enabled) {
    return {
      isAvailable: false,
      startTime: null,
      endTime: null,
      slotDurationMinutes: null,
      blockedRanges: [],
    };
  }

  return {
    isAvailable: true,
    startTime: weeklyRow.start_time,
    endTime: weeklyRow.end_time,
    slotDurationMinutes: weeklyRow.slot_duration_minutes ?? 30,
    blockedRanges: blockedRows || [],
  };
}

export function removeBlockedSlots(slotTimes, durationMinutes, blockedRanges) {
  if (!Array.isArray(blockedRanges) || blockedRanges.length === 0) {
    return slotTimes;
  }

  return slotTimes.filter((slotTime) => {
    const slotStart = timeToMinutes(slotTime);
    const slotEnd = slotStart + durationMinutes;

    const overlapsBlockedRange = blockedRanges.some((range) => {
      const blockStart = timeToMinutes(range.start_time);
      const blockEnd = timeToMinutes(range.end_time);

      if (blockStart == null || blockEnd == null) {
        return false;
      }

      return rangesOverlap(slotStart, slotEnd, blockStart, blockEnd);
    });

    return !overlapsBlockedRange;
  });
}

export async function getAvailableSlotTimesForAdmin(adminId, dateKey) {
  const availability = await getAdminAvailabilityForDate(adminId, dateKey);

  if (!availability.isAvailable) {
    return {
      availability,
      slotTimes: [],
    };
  }

  const allSlotTimes = generateTimeSlots(
    availability.startTime,
    availability.endTime,
    availability.slotDurationMinutes,
  );

  const filteredSlotTimes = removeBlockedSlots(
    allSlotTimes,
    availability.slotDurationMinutes,
    availability.blockedRanges,
  );

  return {
    availability,
    slotTimes: filteredSlotTimes,
  };
}