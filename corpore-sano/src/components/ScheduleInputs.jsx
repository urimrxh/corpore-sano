import "../style/scheduleInputs.css";

function ScheduleInputs() {
    return (
      <section className="page-section">
        <div className="schedule-inputs bg-white rounded-lg py-4 px-6 lg:w-[60%] my-[24px]">
            <p className="text-[18px] text-[#103152] font-semibold">Full Name</p>
            <input type="text" className="schedule-inputs__input w-full bg-[#f5f8fa] rounded-md p-2 border-1 border-[#e1e5ec] my-2"/>
            <p className="text-[18px] text-[#103152] font-semibold">Email</p>
            <input type="email" className="schedule-inputs__input w-full bg-[#f5f8fa] rounded-md p-2 border-1 border-[#e1e5ec] my-2"/>
            <div className="schedule-inputs__gender-wrapper gap-2 my-2">
                <p className="text-[18px] text-[#103152] font-semibold">Gender</p>
                <div className="schedule-inputs__gender-options flex flex-wrap gap-4">
                    <label className="inline-flex cursor-pointer items-center gap-2">
                        <input
                            type="radio"
                            name="gender"
                            value="male"
                            className="h-4 w-4 accent-[#3aa57d]"
                        />
                        <span>Male</span>
                    </label>
                    <label className="inline-flex cursor-pointer items-center gap-2">
                        <input
                            type="radio"
                            name="gender"
                            value="female"
                            className="h-4 w-4 accent-[#3aa57d]"
                        />
                        <span>Female</span>
                    </label>
                </div>
            </div>
            <input type="text" placeholder="Main Topic" className="schedule-inputs__input w-full bg-[#f5f8fa] rounded-md p-2 border-1 border-[#e1e5ec]"/>
        </div>
      </section>
    );
  }
  
  export default ScheduleInputs;