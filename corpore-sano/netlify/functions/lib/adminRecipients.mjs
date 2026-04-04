export async function getActiveAdminEmailsByGender(supabase, gender) {
    const normalizedGender = String(gender || "").trim().toLowerCase();
  
    const { data, error } = await supabase
      .from("admins")
      .select("email")
      .eq("gender", normalizedGender)
      .eq("is_active", true);
  
    if (error) {
      throw new Error(`Failed to load admins: ${error.message}`);
    }
  
    const emails = [...new Set(
      (data || [])
        .map((row) => String(row.email || "").trim().toLowerCase())
        .filter(Boolean)
    )];
  
    return emails;
  }