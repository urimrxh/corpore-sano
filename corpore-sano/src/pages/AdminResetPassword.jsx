import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { adminT } from "../lib/adminUi";
import Seo from "../components/Seo";
import { SEO_ADMIN_DESCRIPTION, SEO_ADMIN_TITLE } from "../seoCopy";
import "../style/admin.css";

function AdminResetPassword() {
  const { authReady, updatePassword, signOut } = useAuth();
  const [recovery, setRecovery] = useState(false);
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!supabase) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setRecovery(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!authReady) {
    return (
      <section className="page-section">
        <Seo title={SEO_ADMIN_TITLE} description={SEO_ADMIN_DESCRIPTION} path="/admin/reset-password" noindex />
        <div className="container max-w-md py-16">
          <p className="text-[#4d515c] dark:text-[#b8c4d0]">
            {adminT("adminReset.notConfigured")}
          </p>
        </div>
      </section>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError(adminT("adminReset.passwordShort"));
      return;
    }
    if (password !== password2) {
      setError(adminT("adminReset.passwordMismatch"));
      return;
    }
    setSubmitting(true);
    const { error: err } = await updatePassword(password);
    setSubmitting(false);
    if (err) {
      setError(err.message);
      return;
    }
    await signOut();
    setDone(true);
  }

  return (
    <section className="page-section">
      <Seo title={SEO_ADMIN_TITLE} description={SEO_ADMIN_DESCRIPTION} path="/admin/reset-password" noindex />
      <div className="container admin-page max-w-md">
        <h1 className="mb-2 text-[28px] font-semibold text-[#103152] dark:text-[#e8ecf1]">
          {adminT("adminReset.title")}
        </h1>
        <p className="mb-6 text-[15px] text-[#4d515c] dark:text-[#b8c4d0]">
          {adminT("adminReset.subtitle")}
        </p>

        {done ? (
          <p className="rounded-md border border-[#3aa57d]/40 bg-[#e8f5ef] px-3 py-3 text-sm text-[#103152] dark:border-[#3aa57d]/30 dark:bg-[#161d27] dark:text-[#b8c4d0]">
            {adminT("adminReset.done")}{" "}
            <Link to="/admin/sign-in" className="text-[#218c77] underline dark:text-[#4dc89f]">
              {adminT("adminReset.signIn")}
            </Link>
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {!recovery && (
              <p className="text-sm text-amber-800 dark:text-amber-200/90">
                {adminT("adminReset.waitingSession")}
              </p>
            )}
            <div className="admin-field">
              <label htmlFor="new-password">{adminT("adminReset.newPassword")}</label>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="admin-field">
              <label htmlFor="new-password-2">{adminT("adminReset.confirmPassword")}</label>
              <input
                id="new-password-2"
                type="password"
                autoComplete="new-password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                required
                minLength={8}
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
              disabled={submitting || !recovery}
            >
              {submitting ? adminT("adminReset.saving") : adminT("adminReset.save")}
            </button>
          </form>
        )}

        <p className="mt-8 text-center text-sm text-[#4d515c] dark:text-[#b8c4d0]">
          <Link to="/admin/sign-in" className="text-[#218c77] underline dark:text-[#4dc89f]">
            ← {adminT("adminReset.backSignIn")}
          </Link>
        </p>
      </div>
    </section>
  );
}

export default AdminResetPassword;
