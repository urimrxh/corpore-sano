import { useEffect, useMemo, useState } from "react";
import { fetchBookingsForAdmin } from "../lib/bookingsApi";
import { formatTime12h } from "../lib/timeSlots";
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

function AdminBookingsTab() {
  const { user } = useAuth();
  const adminLine = useMemo(() => {
    const raw = user?.user_metadata?.admin_line;
    return raw === "male" || raw === "female" ? raw : null;
  }, [user?.user_metadata?.admin_line]);

  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="space-y-3">
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
                {!adminLine && (
                  <th className="px-3 py-2 font-semibold text-[#103152] dark:text-[#e8ecf1]">
                    Line
                  </th>
                )}
                <th className="px-3 py-2 font-semibold text-[#103152] dark:text-[#e8ecf1]">
                  Calendar
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
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
                  {!adminLine && (
                    <td className="whitespace-nowrap px-3 py-2 capitalize text-[#103152] dark:text-[#e8ecf1]">
                      {r.gender}
                    </td>
                  )}
                  <td className="whitespace-nowrap px-3 py-2 text-[#4d515c] dark:text-[#b8c4d0]">
                    {r.google_event_id ? "Synced" : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AdminBookingsTab;
