import { useEffect, useState } from "react";
import {
  createTag,
  deleteTag,
  fetchAllActiveTags,
  updateTag,
} from "../lib/postsApi";

const initialForm = {
  name: "",
  slug: "",
  show_in_nav: true,
  nav_order: 0,
};

function AdminPostTagsTab() {
  const [tags, setTags] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);

  async function loadTags() {
    const { data } = await fetchAllActiveTags();
    setTags(data || []);
  }

  useEffect(() => {
    loadTags();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();

    const payload = {
      ...form,
      nav_order: Number(form.nav_order || 0),
    };

    const result = editingId
      ? await updateTag(editingId, payload)
      : await createTag(payload);

    if (result.error) {
      window.alert(result.error.message);
      return;
    }

    setForm(initialForm);
    setEditingId(null);
    loadTags();
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this tag?")) return;
    const { error } = await deleteTag(id);
    if (error) {
      window.alert(error.message);
      return;
    }
    loadTags();
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border p-5">
        <input
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          placeholder="Tag name"
          className="w-full rounded-md border px-3 py-2"
        />

        <input
          value={form.slug}
          onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
          placeholder="Tag slug"
          className="w-full rounded-md border px-3 py-2"
        />

        <input
          type="number"
          value={form.nav_order}
          onChange={(e) => setForm((p) => ({ ...p, nav_order: e.target.value }))}
          placeholder="Nav order"
          className="w-full rounded-md border px-3 py-2"
        />

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.show_in_nav}
            onChange={(e) =>
              setForm((p) => ({ ...p, show_in_nav: e.target.checked }))
            }
          />
          Show in nav
        </label>

        <button
          type="submit"
          className="rounded-md bg-[#218c77] px-5 py-2.5 text-white"
        >
          {editingId ? "Update tag" : "Create tag"}
        </button>
      </form>

      <div className="space-y-3">
        {tags.map((tag) => (
          <div
            key={tag.id}
            className="flex items-center justify-between rounded-xl border p-4"
          >
            <div>
              <p className="font-semibold">{tag.name}</p>
              <p className="text-sm text-slate-500">
                /posts/tag/{tag.slug}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditingId(tag.id);
                  setForm({
                    name: tag.name || "",
                    slug: tag.slug || "",
                    show_in_nav: Boolean(tag.show_in_nav),
                    nav_order: tag.nav_order || 0,
                  });
                }}
                className="rounded-md border px-3 py-2 text-sm"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => handleDelete(tag.id)}
                className="rounded-md border border-red-300 px-3 py-2 text-sm text-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AdminPostTagsTab;