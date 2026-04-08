import { useEffect, useMemo, useState } from "react";
import {
  deleteBookingAsAdmin,
  fetchBookingsForAdmin,
} from "../lib/bookingsApi";
import { fetchCurrentAdminProfile } from "../lib/adminsApi";
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

function normalizeAdminLine(value) {
  const raw = String(value ?? "").trim().toLowerCase();
  return raw === "male" || raw === "female" ? raw : null;
}

function formatLineLabel(value) {
  return value === "male" ? "Male" : value === "female" ? "Female" : "—";
}

function partitionBookings(rows, todayKey) {
  const today = [];
  const upcoming = [];
  const past = [];

  for (const r of rows) {
    if (!r.booking_date) continue;

    if (r.booking_date === todayKey) {
      today.push(r);
    } else if (r.booking_date > todayKey) {
      upcoming.push(r);
    } else {
      past.push(r);
    }
  }

  const bySlot = (a, b) =>
    String(a.slot_start || a.time_slot || "").localeCompare(
      String(b.slot_start || b.time_slot || ""),
    );

  today.sort(bySlot);
  upcoming.sort(bySlot);
  past.sort(
    (a, b) =>
      -String(a.slot_start || a.time_slot || "").localeCompare(
        String(b.slot_start || b.time_slot || ""),
      ),
  );

  return { today, upcoming, past };
}

function AdminBookingsTab() {
  const { user } = useAuth();

  const [adminProfile, setAdminProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState(null);

  const [rows, setRows] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const adminEmail = user?.email ?? "";

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      setProfileLoading(true);
      setProfileError(null);

      if (!user?.email) {
        if (!cancelled) {
          setAdminProfile(null);
          setProfileLoading(false);
        }
        return;
      }

      const { data, error } = await fetchCurrentAdminProfile(user.email);

      if (cancelled) return;

      if (error) {
        setAdminProfile(null);
        setProfileError(error.message || "Could not load admin profile.");
      } else {
        setAdminProfile(data ?? null);
      }

      setProfileLoading(false);
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [user?.email]);

  const adminLine = useMemo(() => {
    return normalizeAdminLine(adminProfile?.gender);
  }, [adminProfile?.gender]);

  const configError = useMemo(() => {
    if (!user?.id) return "You are not signed in.";
    if (profileError) return profileError;
    if (!profileLoading && !adminProfile) {
      return "This email does not have an active admin profile in public.admins.";
    }
    if (!profileLoading && !adminLine) {
      return "This admin profile is missing a valid gender value. Use male or female in public.admins.";
    }
    return null;
  }, [user?.id, profileError, profileLoading, adminProfile, adminLine]);

  useEffect(() => {
    let cancelled = false;

    async function loadBookings() {
      if (profileLoading) {
        setLoading(true);
        return;
      }

      if (configError) {
        setRows([]);
        setLoadError(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      const { data, error } = await fetchBookingsForAdmin(200, adminLine);

      if (cancelled) return;

      if (error) {
        setRows([]);
        setLoadError(error.message || "Could not load bookings.");
      } else {
        setRows(Array.isArray(data) ? data : []);
        setLoadError(null);
      }

      setLoading(false);
    }

    loadBookings();

    return () => {
      cancelled = true;
    };
  }, [adminLine, configError, profileLoading]);

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
    const { error } = await deleteBookingAsAdmin(id);
    setDeletingId(null);

    if (error) {
      window.alert(error.message);
      return;
    }

    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const renderTable = (sectionRows) => {
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

  if (loading || profileLoading) {
    return (
      <p className="text-sm text-[#4d515c] dark:text-[#b8c4d0]">
        Loading bookings…
      </p>
    );
  }

  if (configError) {
    return (
      <div className="space-y-4">
        <p className="admin-hint">
          Signed in as <strong>{adminEmail || "Unknown admin"}</strong>.
        </p>
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
          {configError}
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
        Could not load bookings: {loadError}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <p className="admin-hint">
        Showing only <strong>{formatLineLabel(adminLine)}</strong> appointments
        for this admin account.
      </p>

      {!rows.length ? (
        <p className="text-sm text-[#4d515c] dark:text-[#b8c4d0]">
          No {adminLine} bookings yet.
        </p>
      ) : (
        <>
          <section className="admin-bookings-section">
            <h3 className="admin-bookings-section__title">Today</h3>
            {today.length ? (
              renderTable(today)
            ) : (
              <p className="text-sm text-[#4d515c] dark:text-[#b8c4d0]">
                No appointments scheduled for today.
              </p>
            )}
          </section>

          <section className="admin-bookings-section">
            <h3 className="admin-bookings-section__title">Upcoming</h3>
            {upcoming.length ? (
              renderTable(upcoming)
            ) : (
              <p className="text-sm text-[#4d515c] dark:text-[#b8c4d0]">
                No upcoming appointments.
              </p>
            )}
          </section>

          {past.length > 0 && (
            <section className="admin-bookings-section">
              <h3 className="admin-bookings-section__title">Earlier dates</h3>
              {renderTable(past)}
            </section>
          )}
        </>
      )}
    </div>
  );
}

export default AdminBookingsTab;