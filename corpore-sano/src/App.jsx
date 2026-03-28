import { BrowserRouter, Routes, Route } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import BookMeeting from "./pages/BookMeeting";
import Nutritionists from "./pages/Nutritionists";
import About from "./pages/About";
import Contact from "./pages/Contact";
import AdminGate from "./components/AdminGate";
import AdminLogin from "./pages/AdminLogin";
import AdminSignIn from "./pages/AdminSignIn";
import Videos from "./pages/Videos";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <div className="app-shell">
        <Navbar />
        <main className="main-content relative w-full">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/book-meeting" element={<BookMeeting />} />
            <Route path="/nutritionists" element={<Nutritionists />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/videos" element={<Videos />} />
            <Route path="/admin/sign-in" element={<AdminSignIn />} />
            <Route
              path="/admin"
              element={
                <AdminGate>
                  <AdminLogin />
                </AdminGate>
              }
            />
            <Route
              path="/admin-login"
              element={
                <AdminGate>
                  <AdminLogin />
                </AdminGate>
              }
            />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;