/** Business hours: 10:00–17:00 local time, every 30 minutes (inclusive of 17:00). */

export function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export const BOOKING_SLOT_TIMES = (() => {
  const out = [];
  for (let h = 10; h <= 17; h++) {
    for (const m of [0, 30]) {
      if (h === 17 && m === 30) break;
      out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return out;
})();

/** Shfaq orën në format 24-orësh (pa AM/PM), i zakonshëm në shqip. */
export function formatTime12h(hhmm24) {
  return hhmm24;
}

/**
 * Build slot_start / slot_end as Date objects in local timezone for booking_date + time_slot.
 */
export function slotToLocalDateRange(bookingDate, timeSlot) {
  const [h, m] = timeSlot.split(":").map(Number);
  const start = new Date(bookingDate);
  start.setHours(h, m, 0, 0);
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  return { start, end };
}

/** True if the slot start is before now (same calendar day or earlier). */
export function isSlotStartInPast(bookingDate, timeSlotHHMM) {
  const { start } = slotToLocalDateRange(bookingDate, timeSlotHHMM);
  return start.getTime() < Date.now();
}
