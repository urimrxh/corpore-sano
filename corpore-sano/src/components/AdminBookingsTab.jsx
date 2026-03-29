import { useEffect, useMemo, useState } from "react";
import {
  deleteBookingAsAdmin,
  fetchBookingsForAdmin,
} from "../lib/bookingsApi";
import { formatDateKey, formatTime12h } from "../lib/timeSlots";
import { useAuth } from "../context/AuthContext";

function formatDateDisplay(yyyyMmDd) {
  if (!yyyyMmDd || typeof yyyyMmDd !== "string") return "—";
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  if (!y || !m || !d) return yyyyMmDd;
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function partitionBookings(rows, todayKey) {
  const today = [];
  const upcoming = [];
  const past = [];
  for (const r of rows) {
    if (!r.booking_date) continue;
    if (r.booking_date === todayKey) today.push(r);
    else if (r.booking_date > todayKey) upcoming.push(r);
    else past.push(r);
  }
  const bySlot = (a, b) =>
    String(a.slot_start || "").localeCompare(String(b.slot_start || ""));
  today.sort(bySlot);
  upcoming.sort(bySlot);
  past.sort((a, b) => -String(a.slot_start || "").localeCompare(String(b.slot_start || "")));
  return { today, upcoming, past };
}

function AdminBookingsTab() {
  const { user } = useAuth();
  const adminLine = useMemo(() => {
    const raw = user?.user_metadata?.admin_line;
    return raw === "male" || raw === "female" ? raw : null;
  }, [user?.user_metadata?.admin_line]);

  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error: err } = await fetchBookingsForAdmin(200, adminLine);
      if (cancelled) return;
      if (err) {
        setError(err.message);
        setRows([]);
      } else {
        setError(null);
        setRows(data);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, adminLine]);

  const todayKey = useMemo(() => formatDateKey(new Date()), []);
  const { today, upcoming, past } = useMemo(
    () => partitionBookings(rows, todayKey),
    [rows, todayKey],
  );

  const handleDelete = async (id) => {
    if (!window.confirm("Remove this appointment? This cannot be undone.")) {
      return;
    }
    setDeletingId(id);
    const { error: delErr } = await deleteBookingAsAdmin(id);
    setDeletingId(null);
    if (delErr) {
      window.alert(delErr.message);
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const renderTable = (sectionRows, options) => {
    const { showGenderColumn } = options;
    if (!sectionRows.length) return null;
    return (
      <div className="overflow-x-auto rounded-lg border border-[#e1e5ec] dark:border-[#2a3441]">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[#e1e5ec] bg-[#f5f8fa] dark:border-[#2a3441] dark:bg-[#1e2835]">
              <th className="px-3 py-2 font-semibold text-[#103152] dark:text-[#e8ecf1]">
                Status
              </th>
              <th className="px-3 py-2 font-semibold text-[#103152] dark:text-[#e8ecf1]">
                Date
              </th>
              <th className="px-3 py-2 font-semibold text-[#103152] dark:text-[#e8ecf1]">
                Time
              </th>
              <th className="px-3 py-2 font-semibold text-[#103152] dark:text-[#e8ecf1]">
                Name
              </th>
              <th className="px-3 py-2 font-semibold text-[#103152] dark:text-[#e8ecf1]">
                Email
              </th>
              <th className="px-3 py-2 font-semibold text-[#103152] dark:text-[#e8ecf1]">
                Topic
              </th>
              {showGenderColumn && (
                <th className="px-3 py-2 font-semibold text-[#103152] dark:text-[#e8ecf1]">
                  Line
                </th>
              )}
              <th className="px-3 py-2 font-semibold text-[#103152] dark:text-[#e8ecf1]">
                Calendar
              </th>
              <th className="px-3 py-2 font-semibold text-[#103152] dark:text-[#e8ecf1]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {sectionRows.map((r) => (
              <tr
                key={r.id}
                className="border-b border-[#e1e5ec] dark:border-[#2a3441]"
              >
                <td className="whitespace-nowrap px-3 py-2 text-[#103152] dark:text-[#e8ecf1]">
                  {r.verified_at ? (
                    <span className="text-[#3aa57d] dark:text-[#5dcc9f]">
                      Verified
                    </span>
                  ) : (
                    <span className="text-amber-800 dark:text-amber-200/90">
                      Pending email
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-[#103152] dark:text-[#e8ecf1]">
                  {formatDateDisplay(r.booking_date)}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-[#103152] dark:text-[#e8ecf1]">
                  {formatTime12h(r.time_slot)}
                </td>
                <td className="px-3 py-2 text-[#103152] dark:text-[#e8ecf1]">
                  {r.full_name}
                </td>
                <td className="max-w-[220px] break-all px-3 py-2 text-[#4d515c] dark:text-[#b8c4d0]">
                  {r.email}
                </td>
                <td className="max-w-[200px] px-3 py-2 text-[#4d515c] dark:text-[#b8c4d0]">
                  {r.topic?.trim() ? r.topic : "—"}
                </td>
                {showGenderColumn && (
                  <td className="whitespace-nowrap px-3 py-2 capitalize text-[#103152] dark:text-[#e8ecf1]">
                    {r.gender}
                  </td>
                )}
                <td className="whitespace-nowrap px-3 py-2 text-[#4d515c] dark:text-[#b8c4d0]">
                  {r.google_event_id ? "Synced" : "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  <button
                    type="button"
                    disabled={deletingId === r.id}
                    onClick={() => handleDelete(r.id)}
                    className="rounded-md border border-red-200 bg-white px-2 py-1 text-xs font-medium text-red-800 hover:bg-red-50 disabled:opacity-50 dark:border-red-900/50 dark:bg-[#1e2835] dark:text-red-200 dark:hover:bg-red-950/40"
                  >
                    {deletingId === r.id ? "Removing…" : "Remove"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  if (loading) {
    return <p className="text-sm text-[#4d515c] dark:text-[#b8c4d0]">Loading bookings…</p>;
  }

  if (error) {
    return (
      <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
        Could not load bookings: {error}
      </p>
    );
  }

  const showGenderColumn = !adminLine;
  const tableOpts = { showGenderColumn };

  return (
    <div className="space-y-6">
      {adminLine ? (
        <p className="admin-hint">
          Showing appointments for the <strong className="capitalize">{adminLine}</strong>{" "}
          line only (from your account metadata <code className="text-xs">admin_line</code>).
        </p>
      ) : (
        <p className="admin-hint">
          Showing <strong>all</strong> booking lines. To limit to your calendar, set{" "}
          <code className="text-xs">admin_line</code> to <code className="text-xs">male</code> or{" "}
          <code className="text-xs">female</code> under your user in Supabase → Authentication →
          Users → user metadata.
        </p>
      )}

      {!rows.length ? (
        <p className="text-sm text-[#4d515c] dark:text-[#b8c4d0]">No bookings yet.</p>
      ) : (
        <>
          <section className="admin-bookings-section">
            <h3 className="admin-bookings-section__title">Today</h3>
            {today.length ? (
              renderTable(today, tableOpts)
            ) : (
              <p className="text-sm text-[#4d515c] dark:text-[#b8c4d0]">
                No appointments scheduled for today.
              </p>
            )}
          </section>

          <section className="admin-bookings-section">
            <h3 className="admin-bookings-section__title">Upcoming</h3>
            {upcoming.length ? (
              renderTable(upcoming, tableOpts)
            ) : (
              <p className="text-sm text-[#4d515c] dark:text-[#b8c4d0]">
                No upcoming appointments (after today).
              </p>
            )}
          </section>

          {past.length > 0 && (
            <section className="admin-bookings-section">
              <h3 className="admin-bookings-section__title">Earlier dates</h3>
              {renderTable(past, tableOpts)}
            </section>
          )}
        </>
      )}
    </div>
  );
}

export default AdminBookingsTab;
