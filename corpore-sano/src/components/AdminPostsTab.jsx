import { useEffect, useState } from "react";
import { adminT } from "../lib/adminUi";
import {
  createPost,
  deletePost,
  fetchAdminPosts,
  fetchAllActiveTags,
  slugify,
  updatePost,
} from "../lib/postsApi";

const initialForm = {
  title: "",
  slug: "",
  description: "",
  topic: "",
  author: "",
  image_url: "",
  external_url: "",
  tag_id: "",
  status: "draft",
};

function AdminPostsTab() {
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

  async function loadAll() {
    setLoading(true);
    const [{ data: postsData }, { data: tagsData }] = await Promise.all([
      fetchAdminPosts(),
      fetchAllActiveTags(),
    ]);
    setPosts(postsData || []);
    setTags(tagsData || []);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "title" && !prev.slug) {
        next.slug = slugify(value);
      }
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
          title: externalDraft.title.trim(),
          description: externalDraft.description.trim(),
          image_url: externalDraft.image_url.trim(),
          external_url: externalUrl,
          author: form.author || "External source",
          topic: form.topic || "External",
        }
      : form;

    const payload = {
      ...source,
      tag_id: source.tag_id || null,
      image_url: source.image_url || null,
      external_url: source.external_url || null,
    };

    const result = editingId
      ? await updatePost(editingId, payload)
      : await createPost(payload);

    if (result.error) {
      window.alert(result.error.message);
      return;
    }

    setForm(initialForm);
    setUseExternalPage(false);
    setExternalDraft({ url: "", title: "", description: "", image_url: "" });
    setEditingId(null);
    loadAll();
  }

  function handleEdit(post) {
    setEditingId(post.id);
    setForm({
      title: post.title || "",
      slug: post.slug || "",
      description: post.description || "",
      topic: post.topic || "",
      author: post.author || "",
      image_url: post.image_url || "",
      external_url: post.external_url || "",
      tag_id: post.tag_id || "",
      status: post.status || "draft",
    });
    setUseExternalPage(Boolean(post.external_url));
    setExternalDraft({
      url: post.external_url || "",
      title: post.title || "",
      description: post.description || "",
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
          name="title"
          value={form.title}
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
          disabled={useExternalPage}
          className="w-full rounded-md border border-[#e1e5ec] bg-white px-3 py-2 text-[#103152] placeholder:text-[#6b7280] dark:border-[#2a3441] dark:bg-[#161d27] dark:text-[#e8ecf1] dark:placeholder:text-[#8ea0b5]"
        />

        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          placeholder={adminT("adminPosts.descPh")}
          disabled={useExternalPage}
          className="min-h-[140px] w-full rounded-md border border-[#e1e5ec] bg-white px-3 py-2 text-[#103152] placeholder:text-[#6b7280] dark:border-[#2a3441] dark:bg-[#161d27] dark:text-[#e8ecf1] dark:placeholder:text-[#8ea0b5]"
        />

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

        <select
          name="tag_id"
          value={form.tag_id}
          onChange={handleChange}
          className="w-full rounded-md border border-[#e1e5ec] bg-white px-3 py-2 text-[#103152] dark:border-[#2a3441] dark:bg-[#161d27] dark:text-[#e8ecf1]"
        >
          <option value="">{adminT("adminPosts.noTag")}</option>
          {tags.map((tag) => (
            <option key={tag.id} value={tag.id}>
              {tag.name}
            </option>
          ))}
        </select>

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
            {editingId ? "Përditëso postimin" : "Krijo postimin"}
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
                {post.title}
              </h4>
              <p className="text-sm text-[#4d515c] dark:text-[#b8c4d0]">
                {post.author} • {formatPostStatus(post.status)}
                {post.tag?.name ? ` • ${post.tag.name}` : ""}
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