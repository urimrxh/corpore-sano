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

/**
 * Heading for tag archive: localized title with fallbacks.
 * @param {object|null} tag
 * @param {'sq'|'en'} locale
 */
export function tagDisplayTitle(tag, locale) {
  if (!tag) return "";
  const primary = (locale === "en" ? tag.title_en : tag.title_sq) || "";
  const alt = (locale === "en" ? tag.title_sq : tag.title_en) || "";
  const p = primary.trim();
  if (p) return p;
  const a = alt.trim();
  if (a) return a;
  return (tag.name || "").trim();
}

function stripPostMetaPayload(payload) {
  const { tag_ids: _t, ...rest } = payload;
  return rest;
}

async function fetchDescendantTagIds(parentId) {
  const { data } = await supabase.from("post_tags").select("id").eq("parent_id", parentId);
  return [parentId, ...(data || []).map((r) => r.id)];
}

async function fetchPublishedPostIdsForTagIds(tagIds) {
  if (!tagIds.length) return [];
  const { data: assignRows, error: e1 } = await supabase
    .from("post_tag_assignments")
    .select("post_id")
    .in("tag_id", tagIds);
  if (e1) throw e1;
  const ids = new Set((assignRows || []).map((r) => r.post_id));

  const { data: legacyRows, error: e2 } = await supabase
    .from("posts")
    .select("id")
    .eq("status", "published")
    .in("tag_id", tagIds);
  if (e2) throw e2;
  (legacyRows || []).forEach((r) => ids.add(r.id));
  return [...ids];
}

/** Top-level nav tags only (no subcategories). */
export async function fetchNavPostTags() {
  const { data, error } = await supabase
    .from("post_tags")
    .select("*")
    .eq("is_active", true)
    .eq("show_in_nav", true)
    .is("parent_id", null)
    .order("nav_order", { ascending: true })
    .order("name", { ascending: true });

  return { data: data || [], error };
}

/** All tags for admin (including inactive and subcategories). */
export async function fetchAdminPostTags() {
  const { data, error } = await supabase
    .from("post_tags")
    .select("*")
    .order("parent_id", { ascending: true, nullsFirst: true })
    .order("nav_order", { ascending: true })
    .order("name", { ascending: true });

  return { data: data || [], error };
}

/** @deprecated prefer fetchAdminPostTags */
export async function fetchAllActiveTags() {
  const { data, error } = await supabase
    .from("post_tags")
    .select("*")
    .eq("is_active", true)
    .order("parent_id", { ascending: true, nullsFirst: true })
    .order("nav_order", { ascending: true })
    .order("name", { ascending: true });

  return { data: data || [], error };
}

export async function fetchChildTagsForParent(parentId) {
  const { data, error } = await supabase
    .from("post_tags")
    .select("*")
    .eq("parent_id", parentId)
    .eq("is_active", true)
    .order("name", { ascending: true });

  return { data: data || [], error };
}

/**
 * Tag archive: parent slug only, or parent + subcategory slug.
 * Parent page lists posts assigned to the parent or any of its subcategories.
 * Subcategory page lists posts assigned only to that subcategory.
 */
export async function fetchPostsForTagArchive(parentSlug, subSlug) {
  let tag = null;
  let parentTag = null;

  if (subSlug) {
    const { data: p } = await supabase.from("post_tags").select("*").eq("slug", parentSlug).maybeSingle();
    if (!p || p.parent_id) {
      return {
        data: [],
        tag: null,
        parentTag: null,
        subTag: null,
        error: new Error("Tag not found"),
      };
    }
    parentTag = p;
    const { data: c } = await supabase
      .from("post_tags")
      .select("*")
      .eq("slug", subSlug)
      .eq("parent_id", p.id)
      .maybeSingle();
    if (!c) {
      return {
        data: [],
        tag: null,
        parentTag,
        subTag: null,
        error: new Error("Subcategory not found"),
      };
    }
    tag = c;
  } else {
    const { data: t } = await supabase.from("post_tags").select("*").eq("slug", parentSlug).maybeSingle();
    if (!t) {
      return {
        data: [],
        tag: null,
        parentTag: null,
        subTag: null,
        error: new Error("Tag not found"),
      };
    }
    tag = t;
    if (t.parent_id) {
      const { data: p } = await supabase.from("post_tags").select("*").eq("id", t.parent_id).maybeSingle();
      parentTag = p || null;
    } else {
      parentTag = t;
    }
  }

  let tagIdsForPosts;
  if (subSlug) {
    tagIdsForPosts = [tag.id];
  } else if (!tag.parent_id) {
    tagIdsForPosts = await fetchDescendantTagIds(tag.id);
  } else {
    tagIdsForPosts = [tag.id];
  }

  let postIds = [];
  try {
    postIds = await fetchPublishedPostIdsForTagIds(tagIdsForPosts);
  } catch (e) {
    return {
      data: [],
      tag,
      parentTag,
      subTag: subSlug ? tag : null,
      error: e,
    };
  }

  if (!postIds.length) {
    return {
      data: [],
      tag,
      parentTag,
      subTag: subSlug ? tag : null,
      error: null,
    };
  }

  const { data, error } = await supabase
    .from("posts")
    .select(`
      *,
      tag:post_tags (
        id,
        name,
        slug,
        parent_id,
        title_sq,
        title_en
      )
    `)
    .eq("status", "published")
    .in("id", postIds)
    .order("published_at", { ascending: false });

  return {
    data: data || [],
    tag,
    parentTag,
    subTag: subSlug ? tag : null,
    error,
  };
}

/** @deprecated use fetchPostsForTagArchive(slug, null) */
export async function fetchPostsByTagSlug(tagSlug) {
  return fetchPostsForTagArchive(tagSlug, null);
}

export async function fetchPostTagIds(postId) {
  if (!supabase || !postId) {
    return { data: [], error: null };
  }
  const { data, error } = await supabase
    .from("post_tag_assignments")
    .select("tag_id")
    .eq("post_id", postId);
  return { data: (data || []).map((r) => r.tag_id), error };
}

export async function replacePostTagAssignments(postId, tagIds) {
  if (!supabase || !postId) return { error: new Error("Missing supabase or post id") };
  const unique = [...new Set((tagIds || []).filter(Boolean))];
  const { error: delErr } = await supabase.from("post_tag_assignments").delete().eq("post_id", postId);
  if (delErr) return { error: delErr };
  if (!unique.length) return { error: null };
  const rows = unique.map((tag_id) => ({ post_id: postId, tag_id }));
  const { error: insErr } = await supabase.from("post_tag_assignments").insert(rows);
  return { error: insErr };
}

export async function fetchLatestPosts(limit = 4) {
  const { data, error } = await supabase
    .from("posts")
    .select(`
      *,
      tag:post_tags (
        id,
        name,
        slug,
        parent_id,
        title_sq,
        title_en
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
        slug,
        parent_id,
        title_sq,
        title_en
      )
    `)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);

  return { data: data || [], error };
}

export async function fetchPostBySlug(slug) {
  const { data, error } = await supabase
    .from("posts")
    .select(`
      *,
      tag:post_tags (
        id,
        name,
        slug,
        parent_id,
        title_sq,
        title_en
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
        slug,
        parent_id,
        title_sq,
        title_en
      )
    `)
    .order("created_at", { ascending: false });

  return { data: data || [], error };
}

export async function createPost(payload) {
  const row = stripPostMetaPayload(payload);
  const tagIds = Array.isArray(payload.tag_ids) ? payload.tag_ids.filter(Boolean) : [];
  const tag_id = row.tag_id || (tagIds.length ? tagIds[0] : null);

  const cleanPayload = {
    ...row,
    tag_id: tag_id || null,
    slug: row.slug ? slugify(row.slug) : slugify(row.title),
    published_at:
      row.status === "published"
        ? row.published_at || new Date().toISOString()
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

  if (!error && data?.id) {
    const effectiveIds = tagIds.length ? tagIds : tag_id ? [tag_id] : [];
    const { error: aErr } = await replacePostTagAssignments(data.id, effectiveIds);
    if (aErr) return { data, error: aErr };
  }

  return { data, error };
}

export async function updatePost(id, payload) {
  const row = stripPostMetaPayload(payload);
  const tagIdsRaw = payload.tag_ids;
  const tagIds = Array.isArray(tagIdsRaw) ? tagIdsRaw.filter(Boolean) : null;

  const cleanPayload = {
    ...row,
    slug: row.slug ? slugify(row.slug) : slugify(row.title),
    published_at:
      row.status === "published"
        ? row.published_at || new Date().toISOString()
        : null,
  };

  if (tagIds !== null) {
    cleanPayload.tag_id = tagIds.length ? tagIds[0] : null;
  }

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

  if (!error && tagIds !== null) {
    const { error: aErr } = await replacePostTagAssignments(id, tagIds);
    if (aErr) return { data, error: aErr };
  }

  return { data, error };
}

export async function deletePost(id) {
  const { error } = await supabase.from("posts").delete().eq("id", id);

  return { error };
}

function cleanTagPayload(payload) {
  const hasParent = Boolean(payload.parent_id);
  return {
    name: (payload.name || "").trim(),
    slug: slugify(payload.slug || payload.name),
    parent_id: payload.parent_id || null,
    title_sq: (payload.title_sq || "").trim() || null,
    title_en: (payload.title_en || "").trim() || null,
    show_in_nav: hasParent ? false : Boolean(payload.show_in_nav),
    is_active: payload.is_active !== false,
    nav_order: Number(payload.nav_order) || 0,
  };
}

export async function createTag(payload) {
  const cleanPayload = cleanTagPayload(payload);

  const { data, error } = await supabase
    .from("post_tags")
    .insert(cleanPayload)
    .select()
    .single();

  return { data, error };
}

export async function updateTag(id, payload) {
  const cleanPayload = cleanTagPayload(payload);

  const { data, error } = await supabase
    .from("post_tags")
    .update(cleanPayload)
    .eq("id", id)
    .select()
    .single();

  return { data, error };
}

export async function deleteTag(id) {
  const { error } = await supabase.from("post_tags").delete().eq("id", id);

  return { error };
}
