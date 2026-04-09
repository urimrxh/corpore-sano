import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";

/**
 * Renders children only when an admin session exists; otherwise redirects to sign-in.
 */
function AdminGate({ children }) {
  const { t } = useI18n();
  const { session, loading, authReady } = useAuth();
  const location = useLocation();

  if (!authReady) {
    return (
      <section className="page-section">
        <div className="container py-16 text-center text-[#4d515c] dark:text-[#b8c4d0]">
          {t("adminGate.configure")}
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="page-section">
        <div className="container py-16 text-center text-[#4d515c] dark:text-[#b8c4d0]">
          {t("adminGate.loading")}
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
