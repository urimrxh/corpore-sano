import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import "../style/calendarPicker.css";
import { formatDateKey } from "../lib/timeSlots";
import { useI18n } from "../context/I18nContext";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function CalendarPicker({ selectedDate, onDateSelect, availableDates }) {
  const { dayPickerLocale } = useI18n();
  const todayStart = startOfToday();

  const restrictDates =
    Array.isArray(availableDates) && availableDates.length > 0;

  return (
    <DayPicker
      className="schedule-day-picker"
      locale={dayPickerLocale}
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
