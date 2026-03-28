import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import "../style/calendarPicker.css";
import { formatDateKey } from "../lib/timeSlots";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function CalendarPicker({ selectedDate, onDateSelect, availableDates }) {
  const todayStart = startOfToday();

  const restrictDates =
    Array.isArray(availableDates) && availableDates.length > 0;

  return (
    <DayPicker
      className="schedule-day-picker"
      mode="single"
      selected={selectedDate}
      onSelect={onDateSelect}
      disabled={
        restrictDates
          ? [
              { before: todayStart },
              (date) => !availableDates.includes(formatDateKey(date)),
            ]
          : [{ before: todayStart }]
      }
    />
  );
}

export default CalendarPicker;
