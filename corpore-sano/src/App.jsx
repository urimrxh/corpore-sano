import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
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
import AdminForgotPassword from "./pages/AdminForgotPassword";
import AdminResetPassword from "./pages/AdminResetPassword";
import Videos from "./pages/Videos";
import PostsPage from "./pages/PostsPage";
import PostsByTagPage from "./pages/PostsByTagPage";
import PostDetailPage from "./pages/PostDetailPage";
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
            <Route path="/nutritionists" element={<NutritionistsRoute />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/videos" element={<VideosRoute />} />
            <Route path="/admin/sign-in" element={<AdminSignIn />} />
            <Route path="/admin/forgot-password" element={<AdminForgotPassword />} />
            <Route path="/admin/reset-password" element={<AdminResetPassword />} />
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
            <Route element={<PostsRoutes />}>
              <Route path="/posts" element={<PostsPage />} />
              <Route path="/posts/:slug" element={<PostDetailPage />} />
              <Route path="/posts/tag/:slug" element={<PostsByTagPage />} />
            </Route>
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;