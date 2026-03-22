import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import "../style/calendarPicker.css";

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function CalendarPicker({ selectedDate, onDateSelect, availableDates }) {
  const today = new Date();

  const isAvailable = (date) => {
    return availableDates.includes(formatDateKey(date));
  };

  return (
    <DayPicker
      className="schedule-day-picker"
      mode="single"
      selected={selectedDate}
      onSelect={onDateSelect}
      disabled={[
        { before: today },
        (date) => !isAvailable(date),
      ]}
    />
  );
}

export default CalendarPicker;