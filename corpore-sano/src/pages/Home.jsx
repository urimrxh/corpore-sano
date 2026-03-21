import { Link } from "react-router-dom";
import "../style/home.css";

function Home() {
  return (
    <section className="hero">
      <div className="container">
        <h1 className="text-[#103152] text-[32px] md:text-[48px] font-semibold">Online nutrition consultations made simple.</h1>
        <p>
          Corpore Sano helps you schedule free online meetings with our
          nutrition specialists in a simple and comfortable way.
        </p>

        <div className="hero-actions">
          <Link to="/book-meeting" className="btn btn-primary">
            Book a Free Meeting
          </Link>
          <Link to="/nutritionists" className="btn btn-secondary">
            Meet Our Nutritionists
          </Link>
        </div>
      </div>
    </section>
  );
}

export default Home;