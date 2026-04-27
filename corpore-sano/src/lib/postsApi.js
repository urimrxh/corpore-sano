import { supabase } from "./supabase";

export function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function fetchNavPostTags() {
  const { data, error } = await supabase
    .from("post_tags")
    .select("*")
    .eq("is_active", true)
    .eq("show_in_nav", true)
    .order("nav_order", { ascending: true })
    .order("name", { ascending: true });

  return { data: data || [], error };
}

export async function fetchAllActiveTags() {
  const { data, error } = await supabase
    .from("post_tags")
    .select("*")
    .eq("is_active", true)
    .order("nav_order", { ascending: true })
    .order("name", { ascending: true });

  return { data: data || [], error };
}

export async function fetchLatestPosts(limit = 4) {
  const { data, error } = await supabase
    .from("posts")
    .select(`
      *,
      tag:post_tags (
        id,
        name,
        slug
      )
    `)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);

  return { data: data || [], error };
}

export async function fetchPublishedPosts(limit = 100) {
  const { data, error } = await supabase
    .from("posts")
    .select(`
      *,
      tag:post_tags (
        id,
        name,
        slug
      )
    `)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);

  return { data: data || [], error };
}

export async function fetchPostsByTagSlug(tagSlug) {
  const { data: tag, error: tagError } = await supabase
    .from("post_tags")
    .select("*")
    .eq("slug", tagSlug)
    .maybeSingle();

  if (tagError || !tag) {
    return {
      data: [],
      tag: null,
      error: tagError || new Error("Etiketa nuk u gjet"),
    };
  }

  const { data, error } = await supabase
    .from("posts")
    .select(`
      *,
      tag:post_tags (
        id,
        name,
        slug
      )
    `)
    .eq("status", "published")
    .eq("tag_id", tag.id)
    .order("published_at", { ascending: false });

  return { data: data || [], tag, error };
}

export async function fetchPostBySlug(slug) {
  const { data, error } = await supabase
    .from("posts")
    .select(`
      *,
      tag:post_tags (
        id,
        name,
        slug
      )
    `)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  return { data, error };
}

export async function fetchAdminPosts() {
  const { data, error } = await supabase
    .from("posts")
    .select(`
      *,
      tag:post_tags (
        id,
        name,
        slug
      )
    `)
    .order("created_at", { ascending: false });

  return { data: data || [], error };
}

export async function createPost(payload) {
  const cleanPayload = {
    ...payload,
    slug: payload.slug ? slugify(payload.slug) : slugify(payload.title),
    published_at:
      payload.status === "published"
        ? payload.published_at || new Date().toISOString()
        : null,
  };

  let { data, error } = await supabase
    .from("posts")
    .insert(cleanPayload)
    .select()
    .single();

  if (
    error &&
    typeof error.message === "string" &&
    error.message.includes("external_url")
  ) {
    const { external_url, ...fallbackPayload } = cleanPayload;
    ({ data, error } = await supabase
      .from("posts")
      .insert(fallbackPayload)
      .select()
      .single());
  }

  return { data, error };
}

export async function updatePost(id, payload) {
  const cleanPayload = {
    ...payload,
    slug: payload.slug ? slugify(payload.slug) : slugify(payload.title),
    published_at:
      payload.status === "published"
        ? payload.published_at || new Date().toISOString()
        : null,
  };

  let { data, error } = await supabase
    .from("posts")
    .update(cleanPayload)
    .eq("id", id)
    .select()
    .single();

  if (
    error &&
    typeof error.message === "string" &&
    error.message.includes("external_url")
  ) {
    const { external_url, ...fallbackPayload } = cleanPayload;
    ({ data, error } = await supabase
      .from("posts")
      .update(fallbackPayload)
      .eq("id", id)
      .select()
      .single());
  }

  return { data, error };
}

export async function deletePost(id) {
  const { error } = await supabase
    .from("posts")
    .delete()
    .eq("id", id);

  return { error };
}

export async function createTag(payload) {
  const cleanPayload = {
    ...payload,
    slug: slugify(payload.slug || payload.name),
  };

  const { data, error } = await supabase
    .from("post_tags")
    .insert(cleanPayload)
    .select()
    .single();

  return { data, error };
}

export async function updateTag(id, payload) {
  const cleanPayload = {
    ...payload,
    slug: slugify(payload.slug || payload.name),
  };

  const { data, error } = await supabase
    .from("post_tags")
    .update(cleanPayload)
    .eq("id", id)
    .select()
    .single();

  return { data, error };
}

export async function deleteTag(id) {
  const { error } = await supabase
    .from("post_tags")
    .delete()
    .eq("id", id);

  return { error };
}