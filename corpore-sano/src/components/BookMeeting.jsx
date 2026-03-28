import { useState } from "react";
import ScheduleInputs from "./ScheduleInputs";
import ScheduleDateTime from "./ScheduleDateTime";

function BookingScheduler() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState("");
  const [topic, setTopic] = useState("");

  return (
    <>
      <ScheduleInputs
        fullName={fullName}
        email={email}
        gender={gender}
        topic={topic}
        onChangeFullName={setFullName}
        onChangeEmail={setEmail}
        onChangeGender={setGender}
        onChangeTopic={setTopic}
      />
      <ScheduleDateTime
        fullName={fullName}
        email={email}
        gender={gender}
        topic={topic}
      />
    </>
  );
}

export default BookingScheduler;
