import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../style/admin.css";

function AdminForgotPassword() {
  const { authReady, requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!authReady) {
    return (
      <section className="page-section">
        <div className="container max-w-md py-16">
          <p className="text-[#4d515c] dark:text-[#b8c4d0]">
            Supabase is not configured.
          </p>
        </div>
      </section>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: err } = await requestPasswordReset(email);
    setSubmitting(false);
    if (err) {
      setError(err.message);
      return;
    }
    setDone(true);
  }

  return (
    <section className="page-section">
      <div className="container admin-page max-w-md">
        <h1 className="mb-2 text-[28px] font-semibold text-[#103152] dark:text-[#e8ecf1]">
          Reset admin password
        </h1>
        <p className="mb-6 text-[15px] text-[#4d515c] dark:text-[#b8c4d0]">
          Enter the email for your admin account. We’ll send a link to set a new password.
          New accounts are not created here — only staff added in Supabase can sign in.
        </p>

        {done ? (
          <p className="rounded-md border border-[#3aa57d]/40 bg-[#e8f5ef] px-3 py-3 text-sm text-[#103152] dark:border-[#3aa57d]/30 dark:bg-[#161d27] dark:text-[#b8c4d0]">
            Check your email for a reset link. After you choose a new password, you can{" "}
            <Link to="/admin/sign-in" className="text-[#218c77] underline dark:text-[#4dc89f]">
              sign in
            </Link>
            .
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="admin-field">
              <label htmlFor="reset-email">Email</label>
              <input
                id="reset-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
              {submitting ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}

        <p className="mt-8 text-center text-sm text-[#4d515c] dark:text-[#b8c4d0]">
          <Link to="/admin/sign-in" className="text-[#218c77] underline dark:text-[#4dc89f]">
            ← Back to sign in
          </Link>
        </p>
      </div>
    </section>
  );
}

export default AdminForgotPassword;
