import { formatTime12h } from "../lib/timeSlots";

function TimeSlots({
  selectedDate,
  slots,
  selectedTime,
  onTimeSelect,
  genderSelected,
}) {
  return (
    <div className="time-slots">
      <h3 className="time-slots__title">Available Times</h3>

      {!genderSelected ? (
        <p className="time-slots__empty">Select your gender first.</p>
      ) : !selectedDate ? (
        <p className="time-slots__empty">Please select a date first.</p>
      ) : slots.length === 0 ? (
        <p className="time-slots__empty">No times available for this date.</p>
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
