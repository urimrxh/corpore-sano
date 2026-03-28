/**
 * Unverified bookings reserve a slot for this long. After that, the scheduled
 * Netlify function removes the row so the slot becomes available again.
 */
export const BOOKING_PENDING_HOLD_MINUTES = 3;
export const BOOKING_PENDING_HOLD_MS =
  BOOKING_PENDING_HOLD_MINUTES * 60 * 1000;
