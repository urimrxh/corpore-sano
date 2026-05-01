import { supabase } from "./supabase";

const POST_TAG_SELECT =
  "id, name, slug, parent_id, title_sq, title_en";

const ASSIGNMENTS_CHUNK = 150;

function logPostsApiError(context, error) {
  if (!error) return;
  const msg = error?.message || String(error);
  console.error(`[postsApi] ${context}`, msg, error);
}

function chunkIds(ids, size = ASSIGNMENTS_CHUNK) {
  const u = [...new Set((ids || []).filter(Boolean))];
  const out = [];
  for (let i = 0; i < u.length; i += size) out.push(u.slice(i, i + size));
  return out;
}

/**
 * Build Map post_id -> ordered tag_id[] from assignment rows.
 * @param {{ post_id: string, tag_id: string }[]} rows
 */
function assignmentsByPostId(rows) {
  /** @type {Map<string, string[]>} */
  const m = new Map();
  for (const r of rows || []) {
    const pid = r.post_id;
    const tid = r.tag_id;
    if (!pid || !tid) continue;
    if (!m.has(pid)) m.set(pid, []);
    m.get(pid).push(tid);
  }
  return m;
}

/** @param {any[]} tagRows */
function tagMapFromRows(tagRows) {
  /** @type {Map<string, object>} */
  const m = new Map();
  for (const t of tagRows || []) {
    if (t?.id) m.set(t.id, t);
  }
  return m;
}

/**
 * Primary tag: legacy `posts.tag_id` if that tag exists, else first assignment tag found in map.
 */
function primaryTagForPost(post, assignMap, tagMap) {
  if (post?.tag_id && tagMap.has(post.tag_id)) {
    return tagMap.get(post.tag_id);
  }
  const ordered = assignMap.get(post.id) || [];
  for (const tid of ordered) {
    if (tagMap.has(tid)) return tagMap.get(tid);
  }
  return null;
}

function assignedTagsInOrder(post, assignMap, tagMap) {
  const ordered = assignMap.get(post.id) || [];
  return ordered.map((id) => tagMap.get(id)).filter(Boolean);
}

/**
 * Attach `tag` (primary), `assignedTags` (ordered), `assignedTagNames` (comma-separated for admin UI).
 */
function enrichPostsWithTags(posts, assignRows, tagRows) {
  const assignMap = assignmentsByPostId(assignRows);
  const tagMap = tagMapFromRows(tagRows);
  return (posts || []).map((post) => {
    const assignedTags = assignedTagsInOrder(post, assignMap, tagMap);
    const tag = primaryTagForPost(post, assignMap, tagMap);
    const assignedTagNames = assignedTags.map((t) => t.name).filter(Boolean).join(", ");
    return {
      ...post,
      tag: tag || null,
      assignedTags,
      assignedTagNames,
    };
  });
}

/**
 * @param {string[]} postIds
 * @returns {Promise<{ data: { post_id: string, tag_id: string }[], error: Error | null }>}
 */
async function fetchAssignmentsForPostIds(postIds) {
  if (!supabase || !postIds.length) {
    return { data: [], error: null };
  }
  const all = [];
  let lastError = null;
  for (const chunk of chunkIds(postIds)) {
    const { data, error } = await supabase
      .from("post_tag_assignments")
      .select("post_id, tag_id")
      .in("post_id", chunk);
    if (error) {
      logPostsApiError("fetchAssignmentsForPostIds", error);
      lastError = error;
      break;
    }
    all.push(...(data || []));
  }
  return { data: all, error: lastError };
}

/**
 * @param {string[]} tagIds
 */
async function fetchPostTagRecordsByIds(tagIds) {
  if (!supabase || !tagIds.length) {
    return { data: [], error: null };
  }
  const all = [];
  let lastError = null;
  for (const chunk of chunkIds(tagIds)) {
    const { data, error } = await supabase
      .from("post_tags")
      .select(POST_TAG_SELECT)
      .in("id", chunk);
    if (error) {
      logPostsApiError("fetchPostTagRecordsByIds", error);
      lastError = error;
      break;
    }
    all.push(...(data || []));
  }
  return { data: all, error: lastError };
}

function collectTagIdsForPosts(posts, assignRows) {
  const ids = new Set();
  for (const p of posts || []) {
    if (p?.tag_id) ids.add(p.tag_id);
  }
  for (const r of assignRows || []) {
    if (r?.tag_id) ids.add(r.tag_id);
  }
  return [...ids];
}

/**
 * After loading posts + assignments + tags, merge; on assignment/tag errors still return posts with partial tags.
 * @param {object[]} posts
 * @param {{ data: any[], error: any }} assignResult
 * @param {{ data: any[], error: any }} tagResult
 * @returns {{ rows: object[], secondaryError: Error | null }}
 */
function mergePostsWithTagJoins(posts, assignResult, tagResult) {
  const secondaryError = assignResult.error || tagResult.error || null;
  const rows = enrichPostsWithTags(
    posts,
    assignResult.data || [],
    tagResult.data || [],
  );
  return { rows, secondaryError };
}

/**
 * Strip any stale PostgREST embed key (defensive).
 * @param {object|null|undefined} row
 */
export function normalizePostRow(row) {
  if (!row || typeof row !== "object") return row;
  if (!Object.prototype.hasOwnProperty.call(row, "post_tags")) return row;
  const { post_tags: _pt, ...rest } = row;
  return rest;
}

/**
 * Safe public title: localized columns fall back to legacy `title`.
 * @param {object|null|undefined} post
 * @param {'sq'|'en'} locale
 */
export function postDisplayTitle(post, locale = "sq") {
  if (!post) return "";
  const base = String(post.title || "").trim();
  const sq = String(post.title_sq || "").trim();
  const en = String(post.title_en || "").trim();
  if (locale === "en") return en || sq || base;
  return sq || en || base;
}

/**
 * Safe public description/excerpt fallbacks for legacy `description`.
 * @param {object|null|undefined} post
 * @param {'sq'|'en'} locale
 */
export function postDisplayDescription(post, locale = "sq") {
  if (!post) return "";
  const base = String(post.description || "").trim();
  const sq = String(
    post.description_sq || post.excerpt_sq || "",
  ).trim();
  const en = String(
    post.description_en || post.excerpt_en || "",
  ).trim();
  if (locale === "en") return en || sq || base;
  return sq || en || base;
}

/**
 * Optional bilingual body when columns exist.
 * @param {object|null|undefined} post
 * @param {'sq'|'en'} locale
 */
export function postDisplayContent(post, locale = "sq") {
  if (!post) return "";
  const sq = String(post.content_sq || "").trim();
  const en = String(post.content_en || "").trim();
  if (locale === "en") return en || sq;
  return sq || en;
}

/**
 * Article body from content_* / legacy `content` only (no description fallback).
 * Used so the detail page can show excerpt + body without duplicating description.
 * @param {object|null|undefined} post
 * @param {'sq'|'en'} locale
 */
export function postBodyFromContentFieldsOnly(post, locale = "sq") {
  if (!post) return "";
  const sq = String(post.content_sq || "").trim();
  const en = String(post.content_en || "").trim();
  const legacy = String(post.content || "").trim();
  if (locale === "en") return en || sq || legacy;
  return sq || en || legacy;
}

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
  const { data, error } = await supabase
    .from("post_tags")
    .select("id")
    .eq("parent_id", parentId);
  if (error) {
    console.warn("[postsApi] fetchDescendantTagIds", error.message || error);
    return [parentId];
  }
  return [parentId, ...(data || []).map((r) => r.id)];
}

async function fetchPublishedPostIdsForTagIds(tagIds) {
  if (!tagIds.length) return [];
  const { data: assignRows, error: e1 } = await supabase
    .from("post_tag_assignments")
    .select("post_id")
    .in("tag_id", tagIds);
  if (e1) {
    logPostsApiError("fetchPublishedPostIdsForTagIds assignments", e1);
    throw e1;
  }
  const ids = new Set((assignRows || []).map((r) => r.post_id));

  const { data: legacyRows, error: e2 } = await supabase
    .from("posts")
    .select("id")
    .eq("status", "published")
    .in("tag_id", tagIds);
  if (e2) {
    logPostsApiError("fetchPublishedPostIdsForTagIds legacy tag_id", e2);
    throw e2;
  }
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

  if (error) console.warn("[postsApi] fetchNavPostTags", error.message || error);

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

  if (error) console.warn("[postsApi] fetchAdminPostTags", error.message || error);

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

  if (error) console.warn("[postsApi] fetchAllActiveTags", error.message || error);

  return { data: data || [], error };
}

export async function fetchChildTagsForParent(parentId) {
  const { data, error } = await supabase
    .from("post_tags")
    .select("*")
    .eq("parent_id", parentId)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) console.warn("[postsApi] fetchChildTagsForParent", error.message || error);

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
    const { data: p } = await supabase
      .from("post_tags")
      .select("*")
      .eq("slug", parentSlug)
      .maybeSingle();
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
    const { data: t } = await supabase
      .from("post_tags")
      .select("*")
      .eq("slug", parentSlug)
      .maybeSingle();
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
      const { data: p } = await supabase
        .from("post_tags")
        .select("*")
        .eq("id", t.parent_id)
        .maybeSingle();
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

  const { data: rawPosts, error: postsErr } = await supabase
    .from("posts")
    .select("*")
    .eq("status", "published")
    .in("id", postIds)
    .order("published_at", { ascending: false });

  if (postsErr) {
    logPostsApiError("fetchPostsForTagArchive posts list", postsErr);
    return {
      data: [],
      tag,
      parentTag,
      subTag: subSlug ? tag : null,
      error: postsErr,
    };
  }

  const posts = (rawPosts || []).map(normalizePostRow);
  const postIdList = posts.map((p) => p.id);
  const assignResult = await fetchAssignmentsForPostIds(postIdList);
  const tagIds = collectTagIdsForPosts(posts, assignResult.data);
  const tagResult = await fetchPostTagRecordsByIds(tagIds);
  const { rows, secondaryError } = mergePostsWithTagJoins(
    posts,
    assignResult,
    tagResult,
  );
  if (secondaryError) {
    logPostsApiError("fetchPostsForTagArchive tag join", secondaryError);
  }

  return {
    data: rows,
    tag,
    parentTag,
    subTag: subSlug ? tag : null,
    error: secondaryError || null,
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
  if (error) console.warn("[postsApi] fetchPostTagIds", error.message || error);
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
  const { data: rawPosts, error } = await supabase
    .from("posts")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) {
    logPostsApiError("fetchLatestPosts", error);
    return { data: [], error };
  }

  const posts = (rawPosts || []).map(normalizePostRow);
  const postIds = posts.map((p) => p.id);
  const assignResult = await fetchAssignmentsForPostIds(postIds);
  const tagIds = collectTagIdsForPosts(posts, assignResult.data);
  const tagResult = await fetchPostTagRecordsByIds(tagIds);
  const { rows, secondaryError } = mergePostsWithTagJoins(
    posts,
    assignResult,
    tagResult,
  );
  if (secondaryError) {
    logPostsApiError("fetchLatestPosts tag join", secondaryError);
  }

  return { data: rows, error: error || secondaryError || null };
}

export async function fetchPublishedPosts(limit = 100) {
  const { data: rawPosts, error } = await supabase
    .from("posts")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) {
    logPostsApiError("fetchPublishedPosts", error);
    return { data: [], error };
  }

  const posts = (rawPosts || []).map(normalizePostRow);
  const postIds = posts.map((p) => p.id);
  const assignResult = await fetchAssignmentsForPostIds(postIds);
  const tagIds = collectTagIdsForPosts(posts, assignResult.data);
  const tagResult = await fetchPostTagRecordsByIds(tagIds);
  const { rows, secondaryError } = mergePostsWithTagJoins(
    posts,
    assignResult,
    tagResult,
  );
  if (secondaryError) {
    logPostsApiError("fetchPublishedPosts tag join", secondaryError);
  }

  return { data: rows, error: error || secondaryError || null };
}

export async function fetchPostBySlug(slug) {
  const { data: raw, error } = await supabase
    .from("posts")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    logPostsApiError("fetchPostBySlug", error);
    return { data: null, error };
  }
  if (!raw) {
    return { data: null, error: null };
  }

  const post = normalizePostRow(raw);
  const assignResult = await fetchAssignmentsForPostIds([post.id]);
  const tagIds = collectTagIdsForPosts([post], assignResult.data);
  const tagResult = await fetchPostTagRecordsByIds(tagIds);
  const { rows, secondaryError } = mergePostsWithTagJoins(
    [post],
    assignResult,
    tagResult,
  );
  if (secondaryError) {
    logPostsApiError("fetchPostBySlug tag join", secondaryError);
  }

  return {
    data: rows[0] || post,
    error: secondaryError || null,
  };
}

export async function fetchAdminPosts() {
  const { data: rawPosts, error } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    logPostsApiError("fetchAdminPosts", error);
    return { data: [], error };
  }

  const posts = (rawPosts || []).map(normalizePostRow);
  const postIds = posts.map((p) => p.id);
  const assignResult = await fetchAssignmentsForPostIds(postIds);
  const tagIds = collectTagIdsForPosts(posts, assignResult.data);
  const tagResult = await fetchPostTagRecordsByIds(tagIds);
  const { rows, secondaryError } = mergePostsWithTagJoins(
    posts,
    assignResult,
    tagResult,
  );
  if (secondaryError) {
    logPostsApiError("fetchAdminPosts tag join", secondaryError);
  }

  return { data: rows, error: error || secondaryError || null };
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
