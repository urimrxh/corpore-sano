// src/lib/timeSlots.js

function toLocalDate(input) {
  if (input instanceof Date) {
    return new Date(input.getTime());
  }

  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [year, month, day] = input.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  return new Date(input);
}

export function formatDateKey(input) {
  const date = toLocalDate(input);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function formatTime12h(hhmm24) {
  return hhmm24;
}

export function timeToMinutes(value) {
  if (!value) return null;

  const parts = String(value).split(":");
  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
}

export function minutesToTime(totalMinutes) {
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const minutes = String(totalMinutes % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function generateTimeSlots(startTime, endTime, durationMinutes) {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  const step = Number(durationMinutes);

  if (
    start == null ||
    end == null ||
    Number.isNaN(step) ||
    step <= 0 ||
    start >= end
  ) {
    return [];
  }

  const out = [];
  let current = start;

  while (current + step <= end) {
    out.push(minutesToTime(current));
    current += step;
  }

  return out;
}

export function slotToLocalDateRange(
  bookingDate,
  timeSlot,
  durationMinutes = 30,
) {
  const [hours, minutes] = String(timeSlot).split(":").map(Number);
  const start = toLocalDate(bookingDate);

  start.setHours(hours, minutes, 0, 0);

  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

  return { start, end };
}

export function isSlotStartInPast(bookingDate, timeSlotHHMM) {
  const { start } = slotToLocalDateRange(bookingDate, timeSlotHHMM);
  return start.getTime() < Date.now();
}

export function isDateBeforeToday(input) {
  const date = toLocalDate(input);
  const today = new Date();

  date.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  return date.getTime() < today.getTime();
}