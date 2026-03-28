import { useEffect, useMemo, useState } from "react";
import CalendarPicker from "./CalendarPicker";
import TimeSlots from "./TimeSlots";
import "../style/scheduleDateTime.css";
import { formatDateKey } from "../lib/timeSlots";
import {
  buildSlotsForDate,
  createBooking,
  fetchBusyTimeSlots,
} from "../lib/bookingsApi";
import { requestCalendarSync } from "../lib/calendarSync";

function ScheduleDateTime({
  fullName,
  email,
  gender,
  topic,
}) {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [selectedTime, setSelectedTime] = useState("");
  const [slots, setSlots] = useState([]);
  const [bookingBusy, setBookingBusy] = useState(false);
  const [bookingMessage, setBookingMessage] = useState(null);
  const [bookingError, setBookingError] = useState(null);

  const selectedDateKey = useMemo(
    () => (selectedDate ? formatDateKey(selectedDate) : ""),
    [selectedDate],
  );

  useEffect(() => {
    let cancelled = false;
    async function loadSlots() {
      if (!selectedDateKey || !gender) {
        setSlots([]);
        return;
      }
      const busy = await fetchBusyTimeSlots(selectedDateKey, gender);
      if (cancelled) return;
      setSlots(buildSlotsForDate(selectedDateKey, gender, busy));
    }
    loadSlots();
    return () => {
      cancelled = true;
    };
  }, [selectedDateKey, gender]);

  const handleDateSelect = (date) => {
    if (!date) return;
    setSelectedDate(date);
    setSelectedTime("");
  };

  const handleTimeSelect = (time, status) => {
    if (status === "busy") return;
    setSelectedTime(time);
  };

  async function handleBook() {
    setBookingMessage(null);
    setBookingError(null);

    if (!fullName?.trim() || !email?.trim()) {
      setBookingError("Please enter your name and email above.");
      return;
    }
    if (!gender) {
      setBookingError("Please select your gender so we can assign the right specialist.");
      return;
    }
    if (!selectedTime) {
      setBookingError("Please select a time slot.");
      return;
    }

    setBookingBusy(true);
    const { data, error, code } = await createBooking({
      fullName,
      email,
      gender,
      topic,
      bookingDate: selectedDate,
      timeSlot: selectedTime,
    });

    if (error) {
      setBookingBusy(false);
      if (String(code) === "23505") {
        setBookingError(
          "That slot was just taken. Please pick another time.",
        );
      } else {
        setBookingError(error.message || "Could not complete booking.");
      }
      return;
    }

    if (data?.id) {
      await requestCalendarSync({ bookingId: data.id });
    }

    setBookingBusy(false);
    setBookingMessage(
      "You’re booked. You’ll receive a confirmation by email shortly.",
    );
    setSelectedTime("");
  }

  return (
    <section className="page-section" id="schedule-datetime">
      <div className="schedule-date-time">
        <p className="schedule-date-time__title">Select a Date & Time</p>
        {!gender && (
          <p className="mb-4 text-center text-sm text-[#4d515c] dark:text-[#b8c4d0]">
            Choose your gender above to see available times for that team.
          </p>
        )}

        <div className="schedule-date-time__date-time-wrapper">
          <div className="schedule-date-time__date-calendar">
            <CalendarPicker
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
            />
          </div>
          <div className="schedule-date-time__book-appointment flex flex-col h-full">
            <div className="schedule-date-time__time-picker">
              <TimeSlots
                selectedDate={selectedDate}
                slots={slots}
                selectedTime={selectedTime}
                onTimeSelect={handleTimeSelect}
                genderSelected={Boolean(gender)}
              />
            </div>
            <div className="schedule-date-time__book-appointment-btn my-[30px] mx-auto md:m-auto flex flex-col items-center gap-3">
              {bookingMessage && (
                <p className="text-center text-sm font-medium text-[#3aa57d] dark:text-[#5dcc9f] max-w-md">
                  {bookingMessage}
                </p>
              )}
              {bookingError && (
                <p className="text-center text-sm text-[#b91c1c] dark:text-[#fca5a5] max-w-md">
                  {bookingError}
                </p>
              )}
              <button
                type="button"
                disabled={bookingBusy}
                onClick={handleBook}
                className="schedule-date-time__book-btn py-[14px] px-[32px] md:py-[16px] md:px-[120px] text-sm md:text-[18px] font-semibold rounded-md bg-[#3aa57d] text-white hover:bg-[#3aa57d]/80 transition-all duration-300 whitespace-nowrap hover:cursor-pointer mx-auto my-[02px] md:my-[20px] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {bookingBusy ? "Booking…" : "Book meeting"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ScheduleDateTime;
