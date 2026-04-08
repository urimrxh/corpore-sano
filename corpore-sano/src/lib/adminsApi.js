import { supabase } from "./supabase";

export async function fetchCurrentAdminProfile(email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();

  if (!normalizedEmail) {
    return {
      data: null,
      error: new Error("Missing admin email."),
    };
  }

  const { data, error } = await supabase
    .from("admins")
    .select("id, full_name, email, gender, is_active")
    .eq("email", normalizedEmail)
    .eq("is_active", true)
    .maybeSingle();

  return {
    data: data ?? null,
    error: error ?? null,
  };
}