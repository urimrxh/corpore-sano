import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import BookMeeting from "./pages/BookMeeting";
import Nutritionists from "./pages/Nutritionists";
import Contact from "./pages/Contact";
import AdminLogin from "./pages/AdminLogin";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Navbar />
        <main className="main-content relative w-full py-[24px] md:py-[32px]">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/book-meeting" element={<BookMeeting />} />
            <Route path="/nutritionists" element={<Nutritionists />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/admin-login" element={<AdminLogin />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;