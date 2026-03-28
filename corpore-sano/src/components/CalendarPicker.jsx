import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import "../style/calendarPicker.css";
import { formatDateKey } from "../lib/timeSlots";

function CalendarPicker({ selectedDate, onDateSelect, availableDates }) {
  const today = new Date();

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
              { before: today },
              (date) => !availableDates.includes(formatDateKey(date)),
            ]
          : [{ before: today }]
      }
    />
  );
}

export default CalendarPicker;
