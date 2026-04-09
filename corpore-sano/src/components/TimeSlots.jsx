import { formatTime12h } from "../lib/timeSlots";
import { useI18n } from "../context/I18nContext";

function TimeSlots({
  selectedDate,
  slots,
  selectedTime,
  onTimeSelect,
  genderSelected,
}) {
  const { t } = useI18n();

  return (
    <div className="time-slots">
      <h3 className="time-slots__title">{t("schedule.slotsTitle")}</h3>

      {!genderSelected ? (
        <p className="time-slots__empty">{t("schedule.pickGenderFirst")}</p>
      ) : !selectedDate ? (
        <p className="time-slots__empty">{t("schedule.pickDateFirst")}</p>
      ) : slots.length === 0 ? (
        <p className="time-slots__empty">{t("schedule.noSlots")}</p>
      ) : (
        <div className="time-slots__grid">
          {slots.map((slot) => {
            const isBusy = slot.status === "busy";
            const isPast = slot.status === "past";
            const isSelected = selectedTime === slot.time;

            return (
              <button
                key={slot.time}
                type="button"
                className={`time-slot-btn ${isBusy ? "is-busy" : ""} ${isPast ? "is-past" : ""} ${isSelected ? "is-selected" : ""}`}
                onClick={() => onTimeSelect(slot.time, slot.status)}
                disabled={isBusy || isPast}
              >
                {formatTime12h(slot.time)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default TimeSlots;
