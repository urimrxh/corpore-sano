// src/components/admin/AdminAvailabilitySettings.jsx

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

export default function AdminAvailabilitySettings({ adminId }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!adminId) return;

    async function loadAvailability() {
      try {
        setLoading(true);
        setMessage("");

        const { data, error } = await supabase
          .from("admin_availability")
          .select("*")
          .eq("admin_id", adminId);

        if (error) throw error;

        const mapped = DAYS.map((day) => {
          const existing = (data || []).find(
            (row) => row.day_of_week === day.value,
          );

          return (
            existing || {
              admin_id: adminId,
              day_of_week: day.value,
              is_enabled: false,
              start_time: "10:00",
              end_time: "17:00",
              slot_duration_minutes: 30,
            }
          );
        });

        setRows(mapped);
      } catch (error) {
        console.error(error);
        setMessage("Failed to load availability.");
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

  async function handleSave() {
    try {
      setSaving(true);
      setMessage("");

      const payload = rows.map((row) => ({
        admin_id: adminId,
        day_of_week: row.day_of_week,
        is_enabled: row.is_enabled,
        start_time: row.is_enabled ? row.start_time : null,
        end_time: row.is_enabled ? row.end_time : null,
        slot_duration_minutes: row.slot_duration_minutes || 30,
      }));

      const { error } = await supabase
        .from("admin_availability")
        .upsert(payload, {
          onConflict: "admin_id,day_of_week",
        });

      if (error) throw error;

      setMessage("Availability saved successfully.");
    } catch (error) {
      console.error(error);
      setMessage("Failed to save availability.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p>Loading availability...</p>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Weekly availability</h3>

      {rows.map((row) => {
        const day = DAYS.find((d) => d.value === row.day_of_week);

        return (
          <div
            key={row.day_of_week}
            className="grid gap-3 rounded-xl border p-4 md:grid-cols-4"
          >
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={row.is_enabled}
                onChange={(e) =>
                  updateRow(row.day_of_week, "is_enabled", e.target.checked)
                }
              />
              <span>{day?.label}</span>
            </label>

            <input
              type="time"
              value={row.start_time || ""}
              disabled={!row.is_enabled}
              onChange={(e) =>
                updateRow(row.day_of_week, "start_time", e.target.value)
              }
            />

            <input
              type="time"
              value={row.end_time || ""}
              disabled={!row.is_enabled}
              onChange={(e) =>
                updateRow(row.day_of_week, "end_time", e.target.value)
              }
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
            />
          </div>
        );
      })}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="rounded-md bg-[#3aa57d] px-5 py-3 text-white disabled:opacity-60"
      >
        {saving ? "Saving..." : "Save weekly availability"}
      </button>

      {message ? <p>{message}</p> : null}
    </div>
  );
}