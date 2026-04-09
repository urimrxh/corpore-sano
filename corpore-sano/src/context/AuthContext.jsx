import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email, password) => {
    if (!supabase) {
      return { error: new Error("Supabase nuk është konfiguruar") };
    }
    return supabase.auth.signInWithPassword({ email, password });
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return { error: null };
    return supabase.auth.signOut();
  }, []);

  const requestPasswordReset = useCallback(async (email) => {
    if (!supabase) {
      return { error: new Error("Supabase nuk është konfiguruar") };
    }
    const redirectTo = `${window.location.origin}/admin/reset-password`;
    return supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
  }, []);

  const updatePassword = useCallback(async (newPassword) => {
    if (!supabase) {
      return { error: new Error("Supabase nuk është konfiguruar") };
    }
    return supabase.auth.updateUser({ password: newPassword });
  }, []);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      signIn,
      signOut,
      requestPasswordReset,
      updatePassword,
      authReady: Boolean(supabase),
    }),
    [session, loading, signIn, signOut, requestPasswordReset, updatePassword],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
