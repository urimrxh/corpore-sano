import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const DAYS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 0, label: "Sunday" },
];

function createDefaultDayRow(adminId, dayOfWeek) {
  return {
    admin_id: adminId,
    day_of_week: dayOfWeek,
    is_enabled: false,
    start_time: "10:00",
    end_time: "17:00",
    slot_duration_minutes: 30,
  };
}

function createNewPause(adminId, dayOfWeek) {
  return {
    id: `temp-${dayOfWeek}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    admin_id: adminId,
    day_of_week: dayOfWeek,
    start_time: "13:00",
    end_time: "14:00",
    note: "",
    isNew: true,
  };
}

function timeToMinutes(value) {
  if (!value) return null;
  const [hours, minutes] = String(value).split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

function rangesOverlap(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

export default function AdminAvailabilitySettings({ adminId }) {
  const [rows, setRows] = useState([]);
  const [pausesByDay, setPausesByDay] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!adminId) return;

    async function loadAvailability() {
      try {
        setLoading(true);
        setMessage("");

        const [
          { data: availabilityRows, error: availabilityError },
          { data: blockedRows, error: blockedError },
        ] = await Promise.all([
          supabase
            .from("admin_availability")
            .select("*")
            .eq("admin_id", adminId),
          supabase
            .from("admin_weekly_blocked_ranges")
            .select("*")
            .eq("admin_id", adminId)
            .order("day_of_week", { ascending: true })
            .order("start_time", { ascending: true }),
        ]);

        if (availabilityError) throw availabilityError;
        if (blockedError) throw blockedError;

        const mappedRows = DAYS.map((day) => {
          const existing = (availabilityRows || []).find(
            (row) => row.day_of_week === day.value,
          );

          return existing || createDefaultDayRow(adminId, day.value);
        });

        const groupedPauses = DAYS.reduce((acc, day) => {
          acc[day.value] = (blockedRows || []).filter(
            (row) => row.day_of_week === day.value,
          );
          return acc;
        }, {});

        setRows(mappedRows);
        setPausesByDay(groupedPauses);
      } catch (error) {
        console.error(error);
        setMessage("Failed to load availability and pause times.");
      } finally {
        setLoading(false);
      }
    }

    loadAvailability();
  }, [adminId]);

  function updateRow(dayOfWeek, field, value) {
    setRows((current) =>
      current.map((row) =>
        row.day_of_week === dayOfWeek ? { ...row, [field]: value } : row,
      ),
    );
  }

  function addPause(dayOfWeek) {
    setPausesByDay((current) => ({
      ...current,
      [dayOfWeek]: [
        ...(current[dayOfWeek] || []),
        createNewPause(adminId, dayOfWeek),
      ],
    }));
  }

  function updatePause(dayOfWeek, pauseId, field, value) {
    setPausesByDay((current) => ({
      ...current,
      [dayOfWeek]: (current[dayOfWeek] || []).map((pause) =>
        pause.id === pauseId ? { ...pause, [field]: value } : pause,
      ),
    }));
  }

  function removePause(dayOfWeek, pauseId) {
    setPausesByDay((current) => ({
      ...current,
      [dayOfWeek]: (current[dayOfWeek] || []).filter(
        (pause) => pause.id !== pauseId,
      ),
    }));
  }

  function validateBeforeSave() {
    for (const row of rows) {
      if (!row.is_enabled) continue;

      const dayStart = timeToMinutes(row.start_time);
      const dayEnd = timeToMinutes(row.end_time);

      if (dayStart == null || dayEnd == null || dayStart >= dayEnd) {
        return `${DAYS.find((d) => d.value === row.day_of_week)?.label}: working hours are invalid.`;
      }

      const pauses = pausesByDay[row.day_of_week] || [];

      for (const pause of pauses) {
        const pauseStart = timeToMinutes(pause.start_time);
        const pauseEnd = timeToMinutes(pause.end_time);

        if (pauseStart == null || pauseEnd == null || pauseStart >= pauseEnd) {
          return `${DAYS.find((d) => d.value === row.day_of_week)?.label}: one pause range is invalid.`;
        }

        if (pauseStart < dayStart || pauseEnd > dayEnd) {
          return `${DAYS.find((d) => d.value === row.day_of_week)?.label}: pause time must stay inside working hours.`;
        }
      }

      for (let i = 0; i < pauses.length; i += 1) {
        for (let j = i + 1; j < pauses.length; j += 1) {
          const aStart = timeToMinutes(pauses[i].start_time);
          const aEnd = timeToMinutes(pauses[i].end_time);
          const bStart = timeToMinutes(pauses[j].start_time);
          const bEnd = timeToMinutes(pauses[j].end_time);

          if (rangesOverlap(aStart, aEnd, bStart, bEnd)) {
            return `${DAYS.find((d) => d.value === row.day_of_week)?.label}: pause ranges cannot overlap each other.`;
          }
        }
      }
    }

    return "";
  }

  async function handleSave() {
    try {
      setSaving(true);
      setMessage("");

      const validationMessage = validateBeforeSave();
      if (validationMessage) {
        setMessage(validationMessage);
        setSaving(false);
        return;
      }

      const availabilityPayload = rows.map((row) => ({
        admin_id: adminId,
        day_of_week: row.day_of_week,
        is_enabled: row.is_enabled,
        start_time: row.is_enabled ? row.start_time : null,
        end_time: row.is_enabled ? row.end_time : null,
        slot_duration_minutes: row.slot_duration_minutes || 30,
      }));

      const allPauseRows = Object.values(pausesByDay)
        .flat()
        .map((pause) => ({
          admin_id: adminId,
          day_of_week: pause.day_of_week,
          start_time: pause.start_time,
          end_time: pause.end_time,
          note: pause.note || null,
        }));

      const { error: availabilityError } = await supabase
        .from("admin_availability")
        .upsert(availabilityPayload, {
          onConflict: "admin_id,day_of_week",
        });

      if (availabilityError) throw availabilityError;

      const { error: deleteBlockedError } = await supabase
        .from("admin_weekly_blocked_ranges")
        .delete()
        .eq("admin_id", adminId);

      if (deleteBlockedError) throw deleteBlockedError;

      if (allPauseRows.length > 0) {
        const { error: insertBlockedError } = await supabase
          .from("admin_weekly_blocked_ranges")
          .insert(allPauseRows);

        if (insertBlockedError) throw insertBlockedError;
      }

      setMessage("Availability and pause times saved successfully.");

      const { data: blockedRows, error: blockedReloadError } = await supabase
        .from("admin_weekly_blocked_ranges")
        .select("*")
        .eq("admin_id", adminId)
        .order("day_of_week", { ascending: true })
        .order("start_time", { ascending: true });

      if (blockedReloadError) throw blockedReloadError;

      const groupedPauses = DAYS.reduce((acc, day) => {
        acc[day.value] = (blockedRows || []).filter(
          (row) => row.day_of_week === day.value,
        );
        return acc;
      }, {});

      setPausesByDay(groupedPauses);
    } catch (error) {
      console.error(error);
      setMessage("Failed to save availability and pause times.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p>Loading availability...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Weekly availability</h3>
        <p className="mt-1 text-sm text-[#4d515c] dark:text-[#b8c4d0]">
          Set the working days, start time, end time, slot duration, and recurring weekly pause times.
        </p>
      </div>

      {rows.map((row) => {
        const day = DAYS.find((d) => d.value === row.day_of_week);
        const pauses = pausesByDay[row.day_of_week] || [];

        return (
          <div
            key={row.day_of_week}
            className="rounded-2xl border border-[#d8e0ea] p-4 md:p-5"
          >
            <div className="grid gap-3 md:grid-cols-4 md:items-center">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={row.is_enabled}
                  onChange={(e) =>
                    updateRow(row.day_of_week, "is_enabled", e.target.checked)
                  }
                />
                <span className="font-medium">{day?.label}</span>
              </label>

              <input
                type="time"
                value={row.start_time || ""}
                disabled={!row.is_enabled}
                onChange={(e) =>
                  updateRow(row.day_of_week, "start_time", e.target.value)
                }
                className="rounded-md border px-3 py-2"
              />

              <input
                type="time"
                value={row.end_time || ""}
                disabled={!row.is_enabled}
                onChange={(e) =>
                  updateRow(row.day_of_week, "end_time", e.target.value)
                }
                className="rounded-md border px-3 py-2"
              />

              <input
                type="number"
                min="15"
                step="15"
                value={row.slot_duration_minutes || 30}
                disabled={!row.is_enabled}
                onChange={(e) =>
                  updateRow(
                    row.day_of_week,
                    "slot_duration_minutes",
                    Number(e.target.value),
                  )
                }
                className="rounded-md border px-3 py-2"
              />
            </div>

            <div className="mt-4 rounded-xl bg-[#f8fafc] p-4 dark:bg-[#18212b]">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-[#103152] dark:text-[#e8ecf1]">
                    Weekly pause times
                  </h4>
                  <p className="text-xs text-[#4d515c] dark:text-[#b8c4d0]">
                    Add one or more recurring pause ranges for {day?.label}.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={!row.is_enabled}
                  onClick={() => addPause(row.day_of_week)}
                  className="rounded-md border border-[#d8e0ea] bg-white px-3 py-2 text-sm font-medium text-[#103152] disabled:opacity-50 dark:border-[#2a3441] dark:bg-[#121a22] dark:text-[#e8ecf1]"
                >
                  Add pause
                </button>
              </div>

              {pauses.length === 0 ? (
                <p className="text-sm text-[#4d515c] dark:text-[#b8c4d0]">
                  No pause times added for this day.
                </p>
              ) : (
                <div className="space-y-3">
                  {pauses.map((pause, index) => (
                    <div
                      key={pause.id}
                      className="grid gap-3 rounded-xl border border-[#d8e0ea] bg-white p-3 md:grid-cols-[1fr_1fr_2fr_auto] md:items-center dark:border-[#2a3441] dark:bg-[#121a22]"
                    >
                      <input
                        type="time"
                        value={pause.start_time || ""}
                        disabled={!row.is_enabled}
                        onChange={(e) =>
                          updatePause(
                            row.day_of_week,
                            pause.id,
                            "start_time",
                            e.target.value,
                          )
                        }
                        className="rounded-md border px-3 py-2"
                      />

                      <input
                        type="time"
                        value={pause.end_time || ""}
                        disabled={!row.is_enabled}
                        onChange={(e) =>
                          updatePause(
                            row.day_of_week,
                            pause.id,
                            "end_time",
                            e.target.value,
                          )
                        }
                        className="rounded-md border px-3 py-2"
                      />

                      <input
                        type="text"
                        placeholder={`Pause ${index + 1} note (optional)`}
                        value={pause.note || ""}
                        disabled={!row.is_enabled}
                        onChange={(e) =>
                          updatePause(
                            row.day_of_week,
                            pause.id,
                            "note",
                            e.target.value,
                          )
                        }
                        className="rounded-md border px-3 py-2"
                      />

                      <button
                        type="button"
                        disabled={!row.is_enabled}
                        onClick={() => removePause(row.day_of_week, pause.id)}
                        className="rounded-md bg-[#fef2f2] px-3 py-2 text-sm font-semibold text-[#b91c1c] disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-[#3aa57d] px-5 py-3 text-white disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save weekly availability"}
        </button>

        {message ? (
          <p className="text-sm text-[#103152] dark:text-[#e8ecf1]">{message}</p>
        ) : null}
      </div>
    </div>
  );
}