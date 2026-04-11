// src/components/ScheduleDateTime.jsx

import { useCallback, useEffect, useMemo, useState } from "react";
import CalendarPicker from "./CalendarPicker";
import TimeSlots from "./TimeSlots";
import "../style/scheduleDateTime.css";
import { BOOKING_PENDING_HOLD_MINUTES } from "../lib/bookingConstants";
import { formatDateKey } from "../lib/timeSlots";
import {
  createBooking,
  fetchSlotsForDate,
} from "../lib/bookingsApi";
import { requestBookingVerificationEmail } from "../lib/bookingVerification";
import { useI18n } from "../context/I18nContext";

function ScheduleDateTime({
  fullName,
  email,
  gender,
  topic,
}) {
  const { t } = useI18n();
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [selectedTime, setSelectedTime] = useState("");
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [bookingBusy, setBookingBusy] = useState(false);
  const [bookingMessage, setBookingMessage] = useState(null);
  const [bookingError, setBookingError] = useState(null);

  const selectedDateKey = useMemo(
    () => (selectedDate ? formatDateKey(selectedDate) : ""),
    [selectedDate],
  );

  const loadSlots = useCallback(async () => {
    if (!selectedDateKey || !gender) {
      setSlots([]);
      return;
    }

    try {
      setSlotsLoading(true);

      const nextSlots = await fetchSlotsForDate(
        selectedDateKey,
        gender,
        selectedDate,
      );

      setSlots(nextSlots);
    } catch (error) {
      console.error("Failed to load slots:", error);
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, [selectedDateKey, gender, selectedDate]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!selectedDateKey || !gender) {
        setSlots([]);
        return;
      }

      try {
        setSlotsLoading(true);

        const nextSlots = await fetchSlotsForDate(
          selectedDateKey,
          gender,
          selectedDate,
        );

        if (!cancelled) {
          setSlots(nextSlots);
        }
      } catch (error) {
        console.error("Failed to load slots:", error);
        if (!cancelled) {
          setSlots([]);
        }
      } finally {
        if (!cancelled) {
          setSlotsLoading(false);
        }
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [selectedDateKey, gender, selectedDate]);

  const handleDateSelect = (date) => {
    if (!date) return;
    setSelectedDate(date);
    setSelectedTime("");
    setBookingMessage(null);
    setBookingError(null);
  };

  const handleTimeSelect = (time, status) => {
    if (status === "busy" || status === "past") return;
    setSelectedTime(time);
  };

  function translateBookingError(error, code) {
    if (code === "PAST_DATE") return t("errors.pastDate");
    if (code === "PAST_SLOT") return t("errors.pastSlot");
    if (code === "RECENT_BOOKING") return t("errors.recentBooking");
    if (String(code) === "23505") return t("schedule.slotTaken");

    const msg = error?.message || "";

    if (
      msg.includes("Supabase") ||
      msg.includes("nuk është konfiguruar") ||
      msg.includes("not configured")
    ) {
      return t("errors.supabaseNotConfigured");
    }

    return msg || t("schedule.bookingFailed");
  }

  async function handleBook() {
    setBookingMessage(null);
    setBookingError(null);

    if (!fullName?.trim() || !email?.trim()) {
      setBookingError(t("schedule.enterNameEmail"));
      return;
    }

    if (!gender) {
      setBookingError(t("schedule.pickGenderSpecialist"));
      return;
    }

    if (!selectedTime) {
      setBookingError(t("schedule.pickSlot"));
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
      setBookingError(translateBookingError(error, code));
      return;
    }

    if (data?.id) {
      const ver = await requestBookingVerificationEmail({
        bookingId: data.id,
      });

      if (ver.skipped) {
        setBookingMessage(t("schedule.verifySkipped"));
      } else if (!ver.ok) {
        const st = ver.status;

        if (st === 401) {
          setBookingError(t("schedule.verify401"));
        } else if (st === 502) {
          const raw =
            typeof ver.detail === "string" ? ver.detail.trim() : "";
          const short =
            raw.length > 320 ? `${raw.slice(0, 320)}…` : raw;

          setBookingError(
            short
              ? t("schedule.verify502WithDetail", { detail: short })
              : t("schedule.verify502Generic"),
          );
        } else {
          const statusSuffix = st ? ` (${st})` : "";

          setBookingError(
            t("schedule.verifyOther", { status: statusSuffix }),
          );
        }
      } else {
        const payload =
          ver.data && typeof ver.data === "object" ? ver.data : {};

        if (payload.autoVerified) {
          setBookingMessage(t("schedule.autoVerified"));
        } else if (payload.emailSent) {
          setBookingMessage(t("schedule.emailSent"));
        } else if (payload.alreadyVerified) {
          setBookingMessage(t("schedule.alreadyVerified"));
        } else {
          setBookingMessage(
            t("schedule.verifyEmailMinutes", {
              minutes: BOOKING_PENDING_HOLD_MINUTES,
            }),
          );
        }
      }
    }

    setSelectedTime("");
    await loadSlots();
    setBookingBusy(false);
  }

  return (
    <section className="page-section" id="schedule-datetime">
      <div className="schedule-date-time">
        <p className="schedule-date-time__title">{t("schedule.title")}</p>

        {!gender && (
          <p className="mb-4 text-center text-sm text-[#4d515c] dark:text-[#b8c4d0]">
            {t("schedule.pickGenderForSlots")}
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
                slots={slotsLoading ? [] : slots}
                selectedTime={selectedTime}
                onTimeSelect={handleTimeSelect}
                genderSelected={Boolean(gender)}
              />
            </div>

            <div className="schedule-date-time__book-appointment-btn my-[30px] mx-auto md:m-auto flex flex-col items-center gap-3 md:pt-[24px]">
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
                {bookingBusy ? t("schedule.booking") : t("schedule.bookMeeting")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ScheduleDateTime;