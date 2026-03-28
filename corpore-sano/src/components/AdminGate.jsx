import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Renders children only when an admin session exists; otherwise redirects to sign-in.
 */
function AdminGate({ children }) {
  const { session, loading, authReady } = useAuth();
  const location = useLocation();

  if (!authReady) {
    return (
      <section className="page-section">
        <div className="container py-16 text-center text-[#4d515c] dark:text-[#b8c4d0]">
          Configure Supabase environment variables to use admin tools.
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="page-section">
        <div className="container py-16 text-center text-[#4d515c] dark:text-[#b8c4d0]">
          Loading…
        </div>
      </section>
    );
  }

  if (!session) {
    return (
      <Navigate to="/admin/sign-in" state={{ from: location }} replace />
    );
  }

  return children;
}

export default AdminGate;
