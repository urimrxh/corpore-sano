import { useMemo, useState } from "react";
import CalendarPicker from "./CalendarPicker";
import TimeSlots from "./TimeSlots";
import "../style/scheduleDateTime.css";

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function ScheduleDateTime() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState("");

  const mockSchedule = useMemo(
    () => ({
      "2026-03-22": [
        { time: "08:00", status: "available" },
        { time: "11:00", status: "available" },
        { time: "13:00", status: "busy" },
        { time: "15:00", status: "available" },
      ],
      "2026-03-23": [
        { time: "09:00", status: "available" },
        { time: "10:30", status: "busy" },
        { time: "12:00", status: "available" },
        { time: "14:00", status: "busy" },
      ],
      "2026-03-24": [
        { time: "08:30", status: "available" },
        { time: "11:15", status: "available" },
        { time: "13:30", status: "available" },
        { time: "15:00", status: "busy" },
      ],
    }),
    []
  );

  const selectedDateKey = selectedDate ? formatDateKey(selectedDate) : "";
  const selectedSlots = selectedDateKey ? mockSchedule[selectedDateKey] || [] : [];

  const availableDates = Object.keys(mockSchedule);

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setSelectedTime("");
  };

  const handleTimeSelect = (time, status) => {
    if (status === "busy") return;
    setSelectedTime(time);
  };

  return (
    <section className="page-section" id="schedule-datetime">
      <div className="schedule-date-time">
        <p className="schedule-date-time__title">Select a Date & Time</p>

        <div className="schedule-date-time__date-time-wrapper">
          <div className="schedule-date-time__date-calendar">
            <CalendarPicker
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
              availableDates={availableDates}
            />
          </div>
          <div className="schedule-date-time__book-appointment flex flex-col h-full">
          <div className="schedule-date-time__time-picker">
            <TimeSlots
              selectedDate={selectedDate}
              slots={selectedSlots}
              selectedTime={selectedTime}
              onTimeSelect={handleTimeSelect}
            />
          </div>
          <div className="schedule-date-time__book-appointment-btn my-[30px] mx-auto md:m-auto">
            <button className="schedule-date-time__book-btn py-[14px] px-[32px] md:py-[16px] md:px-[120px] text-sm md:text-[18px] font-semibold rounded-md bg-[#3aa57d] text-white hover:bg-[#3aa57d]/80 transition-all duration-300 whitespace-nowrap hover:cursor-pointer mx-auto my-[02px] md:my-[20px]">Book Meeting</button>
          </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ScheduleDateTime;