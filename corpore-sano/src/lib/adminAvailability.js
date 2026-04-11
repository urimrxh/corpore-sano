// src/lib/adminAvailability.js

import { supabase } from "./supabase";

export async function getAdminAvailabilityForDate(adminId, dateKey) {
  if (!adminId || !dateKey) {
    return {
      isAvailable: false,
      startTime: null,
      endTime: null,
      slotDurationMinutes: null,
    };
  }

  const date = new Date(`${dateKey}T12:00:00`);
  const dayOfWeek = date.getDay();

  const [
    { data: weeklyRow, error: weeklyError },
    { data: overrideRow, error: overrideError },
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
  ]);

  if (weeklyError) throw weeklyError;
  if (overrideError) throw overrideError;

  if (overrideRow) {
    if (!overrideRow.is_available) {
      return {
        isAvailable: false,
        startTime: null,
        endTime: null,
        slotDurationMinutes: null,
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
    };
  }

  if (!weeklyRow || !weeklyRow.is_enabled) {
    return {
      isAvailable: false,
      startTime: null,
      endTime: null,
      slotDurationMinutes: null,
    };
  }

  return {
    isAvailable: true,
    startTime: weeklyRow.start_time,
    endTime: weeklyRow.end_time,
    slotDurationMinutes: weeklyRow.slot_duration_minutes ?? 30,
  };
}