import { supabase } from "./supabase";

export const HERO_BANNERS_BUCKET = "hero-banners";

/**
 * @param {string} url
 */
export function normalizeCtaUrl(url) {
  const t = (url || "").trim();
  if (!t) return "";
  if (t.startsWith("/")) return t;
  if (/^https?:\/\//i.test(t)) return t;
  if (t.startsWith("#")) return t;
  return `https://${t}`;
}

/**
 * @returns {Promise<{ data: object[], error: Error|null }>}
 */
export async function getActiveHeroBanners() {
  if (!supabase) return { data: [], error: null };
  const { data, error } = await supabase
    .from("hero_banners")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  return { data: data || [], error };
}

/**
 * @returns {Promise<{ data: object[], error: Error|null }>}
 */
export async function getHeroBannersAdmin() {
  if (!supabase) return { data: [], error: new Error("Supabase not configured") };
  const { data, error } = await supabase
    .from("hero_banners")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  return { data: data || [], error };
}

/**
 * @param {File} file
 * @returns {Promise<{ publicUrl: string|null, image_path: string|null, error: Error|null }>}
 */
export async function uploadHeroBannerImage(file) {
  if (!supabase) {
    return { publicUrl: null, image_path: null, error: new Error("Supabase not configured") };
  }
  const ext = (file.name && file.name.includes(".")) ? file.name.split(".").pop() : "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from(HERO_BANNERS_BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type || undefined });

  if (upErr) {
    return { publicUrl: null, image_path: null, error: upErr };
  }

  const { data: pub } = supabase.storage.from(HERO_BANNERS_BUCKET).getPublicUrl(path);
  return { publicUrl: pub?.publicUrl ?? null, image_path: path, error: null };
}

/**
 * @param {string|null|undefined} imagePath
 */
export async function removeHeroBannerStorageObject(imagePath) {
  if (!supabase || !imagePath) return { error: null };
  const { error } = await supabase.storage.from(HERO_BANNERS_BUCKET).remove([imagePath]);
  return { error };
}

/**
 * @param {object} payload
 */
export async function createHeroBanner(payload) {
  if (!supabase) return { data: null, error: new Error("Supabase not configured") };
  const row = {
    sort_order: Number(payload.sort_order) || 0,
    is_active: Boolean(payload.is_active),
    image_url: payload.image_url,
    image_path: payload.image_path ?? null,
    title_sq: (payload.title_sq || "").trim(),
    subtitle_sq: (payload.subtitle_sq || "").trim(),
    cta_label_sq: (payload.cta_label_sq || "").trim(),
    title_en: (payload.title_en || "").trim(),
    subtitle_en: (payload.subtitle_en || "").trim(),
    cta_label_en: (payload.cta_label_en || "").trim(),
    cta_url: normalizeCtaUrl(payload.cta_url),
  };
  const { data, error } = await supabase.from("hero_banners").insert(row).select().single();
  return { data, error };
}

/**
 * @param {string} id
 * @param {object} payload
 */
export async function updateHeroBanner(id, payload) {
  if (!supabase) return { data: null, error: new Error("Supabase not configured") };
  const row = {
    sort_order: Number(payload.sort_order) || 0,
    is_active: Boolean(payload.is_active),
    image_url: payload.image_url,
    image_path: payload.image_path ?? null,
    title_sq: (payload.title_sq || "").trim(),
    subtitle_sq: (payload.subtitle_sq || "").trim(),
    cta_label_sq: (payload.cta_label_sq || "").trim(),
    title_en: (payload.title_en || "").trim(),
    subtitle_en: (payload.subtitle_en || "").trim(),
    cta_label_en: (payload.cta_label_en || "").trim(),
    cta_url: normalizeCtaUrl(payload.cta_url),
  };
  const { data, error } = await supabase.from("hero_banners").update(row).eq("id", id).select().single();
  return { data, error };
}

/**
 * @param {string} id
 * @param {string|null} [imagePath] — if omitted, loads row to remove storage object
 */
export async function deleteHeroBanner(id, imagePath) {
  if (!supabase) return { error: new Error("Supabase not configured") };
  let path = imagePath;
  if (path == null) {
    const { data } = await supabase.from("hero_banners").select("image_path").eq("id", id).maybeSingle();
    path = data?.image_path;
  }
  if (path) {
    await removeHeroBannerStorageObject(path);
  }
  const { error } = await supabase.from("hero_banners").delete().eq("id", id);
  return { error };
}
