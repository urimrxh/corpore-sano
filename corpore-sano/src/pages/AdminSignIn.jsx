import { useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { adminT } from "../lib/adminUi";
import Seo from "../components/Seo";
import "../style/admin.css";
function AdminSignIn() {
  const { session, loading, signIn, authReady } = useAuth();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (!authReady) {
    return (
      <section className="page-section">
        <Seo
          title="Admin | Corpore Sano"
          description="Corpore Sano admin area."
          path="/admin/sign-in"
          noindex
        />
        <div className="container max-w-md py-16">
          <p className="text-[#4d515c] dark:text-[#b8c4d0]">
            {adminT("adminSignIn.notConfigured")}
          </p>
        </div>
      </section>
    );
  }

  if (!loading && session) {
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: err } = await signIn(email.trim(), password);
    setSubmitting(false);
    if (err) {
      setError(err.message);
      return;
    }
  }

  return (
    <section className="page-section">
      <Seo
        title="Admin | Corpore Sano"
        description="Corpore Sano admin area."
        path="/admin/sign-in"
        noindex
      />
      <div className="container admin-page max-w-md">
        <h1 className="mb-2 text-[28px] font-semibold text-[#103152] dark:text-[#e8ecf1]">
          {adminT("adminSignIn.title")}
        </h1>
        <p className="mb-6 text-[15px] text-[#4d515c] dark:text-[#b8c4d0]">
          {adminT("adminSignIn.subtitle")}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="admin-field">
            <label htmlFor="admin-email">Email</label>
            <input
              id="admin-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="admin-field">
            <label htmlFor="admin-password">{adminT("adminSignIn.password")}</label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
              {error}
            </p>
          )}
          <button
            type="submit"
            className="admin-btn-primary w-full"
            disabled={submitting}
          >
            {submitting ? adminT("adminSignIn.signingIn") : adminT("adminSignIn.signIn")}
          </button>
        </form>

        <p className="mt-4 text-center text-sm">
          <Link
            to="/admin/forgot-password"
            className="text-[#218c77] underline dark:text-[#4dc89f]"
          >
            {adminT("adminSignIn.forgot")}
          </Link>
        </p>

        <p className="mt-8 text-center text-sm text-[#4d515c] dark:text-[#b8c4d0]">
          <Link to="/" className="text-[#218c77] underline dark:text-[#4dc89f]">
            ← {adminT("adminSignIn.back")}
          </Link>
        </p>
      </div>
    </section>
  );
}

export default AdminSignIn;
