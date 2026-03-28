import { useSiteContent } from "../context/SiteContentContext";

function BookMeeting() {
  const { content } = useSiteContent();
  const { title, intro } = content.bookMeeting;

  return (
    <section className="page-section">
      <div className="container">
        <h1 className="text-[#103152] dark:text-[#e8ecf1] text-[28px] font-semibold md:text-[32px] mb-3">
          {title}
        </h1>
        <p className="text-[#4d515c] dark:text-[#b8c4d0] max-w-2xl">{intro}</p>
      </div>
    </section>
  );
}

export default BookMeeting;
