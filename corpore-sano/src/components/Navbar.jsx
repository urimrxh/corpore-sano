import { Link } from "react-router-dom";
import "../style/navbar.css";

function Navbar() {
  return (
    <header className="site-header">
      <div className="container nav">
        <Link to="/" className="logo">
          Corpore Sano
        </Link>

        <nav className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/nutritionists">Nutritionists</Link>
          <Link to="/book-meeting">Book a Meeting</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/admin-login">Admin</Link>
        </nav>
      </div>
    </header>
  );
}

export default Navbar;