/**
 * Removes unverified bookings older than the pending hold window so slots free up.
 * Keep PENDING_HOLD_MINUTES in sync with `BOOKING_PENDING_HOLD_MINUTES` in
 * `src/lib/bookingConstants.js`.
 */
import { createClient } from "@supabase/supabase-js";

const PENDING_HOLD_MINUTES = 3;

export default async () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error(
      "expire-pending-bookings: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
    return new Response(
      JSON.stringify({ ok: false, error: "missing_supabase_config" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const cutoff = new Date(
    Date.now() - PENDING_HOLD_MINUTES * 60 * 1000,
  ).toISOString();

  const { data, error } = await supabase
    .from("bookings")
    .delete()
    .is("verified_at", null)
    .lt("created_at", cutoff)
    .select("id");

  if (error) {
    console.error("expire-pending-bookings:", error);
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const removed = data?.length ?? 0;
  if (removed > 0) {
    console.log(
      `expire-pending-bookings: removed ${removed} expired pending booking(s)`,
    );
  }

  return new Response(JSON.stringify({ ok: true, removed }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const config = {
  schedule: "* * * * *",
};
