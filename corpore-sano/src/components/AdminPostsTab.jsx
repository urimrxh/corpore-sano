import { useEffect, useMemo, useState } from "react";
import { adminT } from "../lib/adminUi";
import { normalizeStoredRichHtml } from "../lib/postHtml";
import {
  createPost,
  deletePost,
  fetchAdminPostTags,
  fetchAdminPosts,
  fetchPostTagIds,
  postDisplayTitle,
  slugify,
  updatePost,
} from "../lib/postsApi";
import AdminRichTextEditor from "./AdminRichTextEditor";

const initialForm = {
  title_sq: "",
  title_en: "",
  slug: "",
  description_sq: "",
  description_en: "",
  content_sq: "",
  content_en: "",
  topic: "",
  author: "",
  image_url: "",
  external_url: "",
  tag_ids: [],
  status: "published",
};

function AdminPostsTab({ editingLocale = "sq" }) {
  const loc = editingLocale === "en" ? "en" : "sq";
  const titleKey = loc === "en" ? "title_en" : "title_sq";
  const descriptionKey = loc === "en" ? "description_en" : "description_sq";
  const contentKey = loc === "en" ? "content_en" : "content_sq";

  function formatPostStatus(status) {
    if (status === "published") return adminT("adminPosts.statusPublished");
    if (status === "draft") return adminT("adminPosts.statusDraft");
    return status || "";
  }

  const [posts, setPosts] = useState([]);
  const [tags, setTags] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [useExternalPage, setUseExternalPage] = useState(false);
  const [externalDraft, setExternalDraft] = useState({
    url: "",
    title: "",
    description: "",
    image_url: "",
  });
  const [previewLoading, setPreviewLoading] = useState(false);

  const parentTags = useMemo(
    () => (tags || []).filter((t) => !t.parent_id),
    [tags],
  );

  async function loadAll() {
    setLoading(true);
    const [{ data: postsData, error: postsErr }, { data: tagsData, error: tagsErr }] =
      await Promise.all([fetchAdminPosts(), fetchAdminPostTags()]);
    if (postsErr) console.error("[AdminPostsTab] fetchAdminPosts", postsErr);
    if (tagsErr) console.error("[AdminPostsTab] fetchAdminPostTags", tagsErr);
    setPosts(postsData || []);
    setTags(tagsData || []);
    setLoading(false);
  }

  function toggleTagId(tagId) {
    setForm((prev) => {
      const next = new Set(prev.tag_ids || []);
      if (next.has(tagId)) next.delete(tagId);
      else next.add(tagId);
      return { ...prev, tag_ids: [...next] };
    });
  }

  useEffect(() => {
    loadAll();
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === titleKey) {
        next.slug = slugify(value);
      }
      if (name === "slug") next.slug = slugify(value);
      return next;
    });
  }

  async function fetchExternalPreview(url) {
    const normalizedUrl = String(url || "").trim();
    if (!normalizedUrl) return;

    setPreviewLoading(true);
    try {
      const res = await fetch(
        `/.netlify/functions/fetch-link-preview?url=${encodeURIComponent(normalizedUrl)}`,
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Could not fetch link preview.");
      }

      setExternalDraft((prev) => ({
        ...prev,
        title: prev.title || data.title || "",
        description: prev.description || data.description || "",
        image_url: prev.image_url || data.image || "",
      }));
    } catch (err) {
      window.alert(err?.message || "Could not fetch link preview.");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const externalUrl = externalDraft.url.trim();
    if (useExternalPage && !externalUrl) {
      window.alert(adminT("adminPosts.externalUrlRequired"));
      return;
    }

    const source = useExternalPage
      ? {
          ...form,
          [titleKey]: externalDraft.title.trim(),
          [descriptionKey]: externalDraft.description.trim(),
          image_url: externalDraft.image_url.trim(),
          external_url: externalUrl,
          author: form.author || "External source",
          topic: form.topic || "External",
        }
      : form;

    const payload = {
      ...source,
      tag_ids: Array.isArray(form.tag_ids) ? form.tag_ids.filter(Boolean) : [],
      image_url: source.image_url || null,
      external_url: source.external_url || null,
      slug: slugify(source.slug || source[titleKey]),
      title: (source[titleKey] || "").trim(),
      description: (source[descriptionKey] || "").trim(),
    };

    payload.title_sq = (payload.title_sq || "").trim();
    payload.title_en = (payload.title_en || "").trim();
    payload.description_sq = (payload.description_sq || "").trim();
    payload.description_en = (payload.description_en || "").trim();

    if (useExternalPage) {
      payload.content_sq = null;
      payload.content_en = null;
    } else {
      payload.content_sq = normalizeStoredRichHtml(form.content_sq);
      payload.content_en = normalizeStoredRichHtml(form.content_en);
    }

    const result = editingId
      ? await updatePost(editingId, payload)
      : await createPost(payload);

    if (result.error) {
      window.alert(result.error.message);
      return;
    }

    if (useExternalPage && !result?.data?.external_url) {
      window.alert(adminT("adminPosts.externalSaveMissingColumn"));
    }

    setForm(initialForm);
    setUseExternalPage(false);
    setExternalDraft({ url: "", title: "", description: "", image_url: "" });
    setEditingId(null);
    loadAll();
  }

  async function handleEdit(post) {
    setEditingId(post.id);
    const { data: assignIds } = await fetchPostTagIds(post.id);
    const ids =
      assignIds?.length ? assignIds : post.tag_id ? [post.tag_id] : [];
    const sqTitle = post.title_sq || post.title || "";
    const enTitle = post.title_en || post.title || "";
    const sqDescription = post.description_sq || post.description || "";
    const enDescription = post.description_en || post.description || "";
    setForm({
      title_sq: sqTitle,
      title_en: enTitle,
      slug: post.slug || "",
      description_sq: sqDescription,
      description_en: enDescription,
      content_sq: post.content_sq || "",
      content_en: post.content_en || "",
      topic: post.topic || "",
      author: post.author || "",
      image_url: post.image_url || "",
      external_url: post.external_url || "",
      tag_ids: ids,
      status: post.status || "published",
    });
    setUseExternalPage(Boolean(post.external_url));
    setExternalDraft({
      url: post.external_url || "",
      title: (loc === "en" ? enTitle : sqTitle) || "",
      description: (loc === "en" ? enDescription : sqDescription) || "",
      image_url: post.image_url || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id) {
    if (!window.confirm(adminT("adminPosts.confirmDelete"))) return;

    const { error } = await deletePost(id);
    if (error) {
      window.alert(error.message);
      return;
    }

    loadAll();
  }

  if (loading) return <p>{adminT("adminPosts.loading")}</p>;

  return (
    <div className="space-y-8">
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-[#e1e5ec] bg-white p-5 dark:border-[#2a3441] dark:bg-[#1e2835]"
      >
        <h3 className="text-xl font-semibold text-[#103152] dark:text-[#e8ecf1]">
          {editingId ? adminT("adminPosts.editPost") : adminT("adminPosts.addPost")}
        </h3>

        <input
          name={titleKey}
          value={form[titleKey]}
          onChange={handleChange}
          placeholder={adminT("adminPosts.titlePh")}
          disabled={useExternalPage}
          className="w-full rounded-md border border-[#e1e5ec] bg-white px-3 py-2 text-[#103152] placeholder:text-[#6b7280] dark:border-[#2a3441] dark:bg-[#161d27] dark:text-[#e8ecf1] dark:placeholder:text-[#8ea0b5]"
        />

        <input
          name="slug"
          value={form.slug}
          onChange={handleChange}
          placeholder={adminT("adminPosts.slugPh")}
          disabled
          readOnly
          className="w-full rounded-md border border-[#e1e5ec] bg-white px-3 py-2 text-[#103152] placeholder:text-[#6b7280] dark:border-[#2a3441] dark:bg-[#161d27] dark:text-[#e8ecf1] dark:placeholder:text-[#8ea0b5]"
        />

        <div>
          <label className="mb-1 block text-sm font-semibold text-[#103152] dark:text-[#e8ecf1]">
            {adminT("adminPosts.descPh")}
          </label>
          <p className="mb-2 text-xs text-[#4d515c] dark:text-[#8ea0b5]">
            {adminT("adminPosts.descHint")}
          </p>
          <textarea
            name={descriptionKey}
            value={form[descriptionKey]}
            onChange={handleChange}
            placeholder={adminT("adminPosts.descPh")}
            disabled={useExternalPage}
            className="min-h-[100px] w-full rounded-md border border-[#e1e5ec] bg-white px-3 py-2 text-[#103152] placeholder:text-[#6b7280] dark:border-[#2a3441] dark:bg-[#161d27] dark:text-[#e8ecf1] dark:placeholder:text-[#8ea0b5]"
          />
        </div>

        {!useExternalPage ? (
          <div className="space-y-6">
            <AdminRichTextEditor
              key={`${editingId ?? "new"}-${contentKey}`}
              mountKey={`${editingId ?? "new"}-${contentKey}`}
              initialHtml={form[contentKey]}
              onChange={(html) =>
                setForm((prev) => ({ ...prev, [contentKey]: html }))
              }
              label={loc === "en" ? adminT("adminPosts.bodyEnLabel") : adminT("adminPosts.bodySqLabel")}
              placeholder={loc === "en" ? adminT("adminPosts.bodyEnPh") : adminT("adminPosts.bodySqPh")}
              disabled={false}
            />
          </div>
        ) : null}

        <input
          name="topic"
          value={form.topic}
          onChange={handleChange}
          placeholder={adminT("adminPosts.topicPh")}
          disabled={useExternalPage}
          className="w-full rounded-md border border-[#e1e5ec] bg-white px-3 py-2 text-[#103152] placeholder:text-[#6b7280] dark:border-[#2a3441] dark:bg-[#161d27] dark:text-[#e8ecf1] dark:placeholder:text-[#8ea0b5]"
        />

        <input
          name="author"
          value={form.author}
          onChange={handleChange}
          placeholder={adminT("adminPosts.authorPh")}
          disabled={useExternalPage}
          className="w-full rounded-md border border-[#e1e5ec] bg-white px-3 py-2 text-[#103152] placeholder:text-[#6b7280] dark:border-[#2a3441] dark:bg-[#161d27] dark:text-[#e8ecf1] dark:placeholder:text-[#8ea0b5]"
        />

        <input
          name="image_url"
          value={form.image_url}
          onChange={handleChange}
          placeholder={adminT("adminPosts.imagePh")}
          disabled={useExternalPage}
          className="w-full rounded-md border border-[#e1e5ec] bg-white px-3 py-2 text-[#103152] dark:border-[#2a3441] dark:bg-[#161d27] dark:text-[#e8ecf1]"
        />

        <div className="rounded-md border border-[#e1e5ec] bg-[#f8fafc] p-3 dark:border-[#2a3441] dark:bg-[#161d27]">
          <p className="mb-1 text-sm font-semibold text-[#103152] dark:text-[#e8ecf1]">
            {adminT("adminPosts.tagsLabel")}
          </p>
          <p className="mb-3 text-xs text-[#4d515c] dark:text-[#8ea0b5]">
            {adminT("adminPosts.tagsHint")}
          </p>
          <div className="max-h-48 space-y-2 overflow-y-auto">
            {parentTags.length === 0 ? (
              <p className="text-sm text-[#4d515c] dark:text-[#b8c4d0]">
                {adminT("adminPosts.noTagsYet")}
              </p>
            ) : (
              parentTags.map((parent) => (
                <div key={parent.id} className="space-y-1">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-[#103152] dark:text-[#e8ecf1]">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-[#e1e5ec] text-[#218c77] dark:border-[#2a3441]"
                      checked={form.tag_ids.includes(parent.id)}
                      onChange={() => toggleTagId(parent.id)}
                    />
                    {parent.name}
                  </label>
                  {tags
                    .filter((t) => t.parent_id === parent.id)
                    .map((child) => (
                      <label
                        key={child.id}
                        className="ml-5 flex cursor-pointer items-center gap-2 text-sm text-[#4d515c] dark:text-[#b8c4d0]"
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-[#e1e5ec] text-[#218c77] dark:border-[#2a3441]"
                          checked={form.tag_ids.includes(child.id)}
                          onChange={() => toggleTagId(child.id)}
                        />
                        {child.name}
                      </label>
                    ))}
                </div>
              ))
            )}
          </div>
        </div>

        <select
          name="status"
          value={form.status}
          onChange={handleChange}
          className="w-full rounded-md border border-[#e1e5ec] bg-white px-3 py-2 text-[#103152] dark:border-[#2a3441] dark:bg-[#161d27] dark:text-[#e8ecf1]"
        >
          <option value="draft">{adminT("adminPosts.draft")}</option>
          <option value="published">{adminT("adminPosts.published")}</option>
        </select>

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[#e1e5ec] px-3 py-2 dark:border-[#2a3441]">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 shrink-0 rounded border-[#e1e5ec] text-[#218c77] focus:ring-[#218c77] dark:border-[#2a3441]"
            checked={useExternalPage}
            onChange={(e) => setUseExternalPage(e.target.checked)}
          />
          <span className="text-sm text-[#103152] dark:text-[#e8ecf1]">
            {adminT("adminPosts.externalModeLabel")}
          </span>
        </label>

        {useExternalPage ? (
          <div className="space-y-3 rounded-lg border border-[#e1e5ec] bg-[#f8fafc] p-3 dark:border-[#2a3441] dark:bg-[#161d27]">
            <input
              value={externalDraft.url}
              onChange={(e) =>
                setExternalDraft((prev) => ({ ...prev, url: e.target.value }))
              }
              onBlur={(e) => {
                const value = e.target.value.trim();
                if (value) {
                  void fetchExternalPreview(value);
                }
              }}
              type="url"
              placeholder={adminT("adminPosts.externalUrlPh")}
              className="w-full rounded-md border border-[#e1e5ec] bg-white px-3 py-2 text-[#103152] dark:border-[#2a3441] dark:bg-[#0f1722] dark:text-[#e8ecf1]"
            />
            <input
              value={externalDraft.title}
              onChange={(e) =>
                setExternalDraft((prev) => ({ ...prev, title: e.target.value }))
              }
              type="text"
              placeholder={adminT("adminPosts.externalTitlePh")}
              className="w-full rounded-md border border-[#e1e5ec] bg-white px-3 py-2 text-[#103152] dark:border-[#2a3441] dark:bg-[#0f1722] dark:text-[#e8ecf1]"
            />
            <textarea
              value={externalDraft.description}
              onChange={(e) =>
                setExternalDraft((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder={adminT("adminPosts.externalDescPh")}
              className="min-h-[120px] w-full rounded-md border border-[#e1e5ec] bg-white px-3 py-2 text-[#103152] dark:border-[#2a3441] dark:bg-[#0f1722] dark:text-[#e8ecf1]"
            />
            <input
              value={externalDraft.image_url}
              onChange={(e) =>
                setExternalDraft((prev) => ({
                  ...prev,
                  image_url: e.target.value,
                }))
              }
              type="url"
              placeholder={adminT("adminPosts.externalImagePh")}
              className="w-full rounded-md border border-[#e1e5ec] bg-white px-3 py-2 text-[#103152] dark:border-[#2a3441] dark:bg-[#0f1722] dark:text-[#e8ecf1]"
            />
            <button
              type="button"
              onClick={() => void fetchExternalPreview(externalDraft.url)}
              disabled={!externalDraft.url.trim() || previewLoading}
              className="admin-btn-secondary admin-btn-secondary--sm"
            >
              {previewLoading
                ? adminT("adminPosts.externalFetching")
                : adminT("adminPosts.externalFetch")}
            </button>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button type="submit" className="admin-btn-primary">
            {editingId ? adminT("adminPosts.update") : adminT("adminPosts.create")}
          </button>

          {editingId ? (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm(initialForm);
                setUseExternalPage(false);
                setExternalDraft({ url: "", title: "", description: "", image_url: "" });
              }}
              className="admin-btn-secondary"
            >
              {adminT("adminPosts.cancel")}
            </button>
          ) : null}
        </div>
      </form>

      <div className="space-y-4">
        {posts.map((post) => (
          <div
            key={post.id}
            className="flex flex-col gap-3 rounded-xl border border-[#e1e5ec] bg-white p-4 dark:border-[#2a3441] dark:bg-[#1e2835] md:flex-row md:items-center md:justify-between"
          >
            <div>
              <h4 className="font-semibold text-[#103152] dark:text-[#e8ecf1]">
                {postDisplayTitle(post, loc)}
              </h4>
              <p className="text-sm text-[#4d515c] dark:text-[#b8c4d0]">
                {post.author} • {formatPostStatus(post.status)}
                {post.assignedTagNames || post.tag?.name
                  ? ` • ${post.assignedTagNames || post.tag.name}`
                  : ""}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleEdit(post)}
                className="admin-btn-secondary admin-btn-secondary--sm"
              >
                {adminT("adminPosts.edit")}
              </button>
              <button
                type="button"
                onClick={() => handleDelete(post.id)}
                className="admin-btn-danger admin-btn-danger--sm"
              >
                {adminT("adminPosts.delete")}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AdminPostsTab;