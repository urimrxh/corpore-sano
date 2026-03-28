import { useEffect, useState } from "react";
import { fetchBookingsForAdmin } from "../lib/bookingsApi";
import { formatTime12h } from "../lib/timeSlots";

function AdminBookingsTab() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error: err } = await fetchBookingsForAdmin();
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
  }, []);

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

  if (!rows.length) {
    return (
      <p className="text-sm text-[#4d515c] dark:text-[#b8c4d0]">No bookings yet.</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-[#e1e5ec] dark:border-[#2a3441]">
      <table className="w-full min-w-[720px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-[#e1e5ec] bg-[#f5f8fa] dark:border-[#2a3441] dark:bg-[#1e2835]">
            <th className="px-3 py-2 font-semibold text-[#103152] dark:text-[#e8ecf1]">
              When
            </th>
            <th className="px-3 py-2 font-semibold text-[#103152] dark:text-[#e8ecf1]">
              Name
            </th>
            <th className="px-3 py-2 font-semibold text-[#103152] dark:text-[#e8ecf1]">
              Email
            </th>
            <th className="px-3 py-2 font-semibold text-[#103152] dark:text-[#e8ecf1]">
              Gender
            </th>
            <th className="px-3 py-2 font-semibold text-[#103152] dark:text-[#e8ecf1]">
              Topic
            </th>
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
              <td className="px-3 py-2 text-[#103152] dark:text-[#e8ecf1]">
                {r.booking_date}{" "}
                <span className="text-[#4d515c] dark:text-[#b8c4d0]">
                  {formatTime12h(r.time_slot)}
                </span>
              </td>
              <td className="px-3 py-2 text-[#103152] dark:text-[#e8ecf1]">
                {r.full_name}
              </td>
              <td className="px-3 py-2 text-[#4d515c] dark:text-[#b8c4d0]">
                {r.email}
              </td>
              <td className="px-3 py-2 capitalize text-[#103152] dark:text-[#e8ecf1]">
                {r.gender}
              </td>
              <td className="max-w-[200px] truncate px-3 py-2 text-[#4d515c] dark:text-[#b8c4d0]">
                {r.topic || "—"}
              </td>
              <td className="px-3 py-2 text-[#4d515c] dark:text-[#b8c4d0]">
                {r.google_event_id ? "Synced" : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AdminBookingsTab;
