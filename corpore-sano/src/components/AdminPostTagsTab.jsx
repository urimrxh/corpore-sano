import { useEffect, useState } from "react";
import { adminT } from "../lib/adminUi";
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
    if (!window.confirm(adminT("adminTags.confirmDelete"))) return;
    const { error } = await deleteTag(id);
    if (error) {
      window.alert(error.message);
      return;
    }
    loadTags();
  }

  return (
    <div className="space-y-8">
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-[#e1e5ec] bg-white p-5 dark:border-[#2a3441] dark:bg-[#1e2835]"
      >
        <input
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          placeholder={adminT("adminTags.namePh")}
          className="w-full rounded-md border border-[#e1e5ec] bg-white px-3 py-2 text-[#103152] placeholder:text-[#6b7280] dark:border-[#2a3441] dark:bg-[#161d27] dark:text-[#e8ecf1] dark:placeholder:text-[#8ea0b5]"
        />

        <input
          value={form.slug}
          onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
          placeholder={adminT("adminTags.slugPh")}
          className="w-full rounded-md border border-[#e1e5ec] bg-white px-3 py-2 text-[#103152] placeholder:text-[#6b7280] dark:border-[#2a3441] dark:bg-[#161d27] dark:text-[#e8ecf1] dark:placeholder:text-[#8ea0b5]"
        />
        <label className="text-sm text-[#4d515c] dark:text-[#b8c4d0]">
          {adminT("adminTags.orderLabel")}
        </label>
        <input
          type="number"
          value={form.nav_order}
          onChange={(e) => setForm((p) => ({ ...p, nav_order: e.target.value }))}
          placeholder={adminT("adminTags.orderPh")}
          className="w-full rounded-md border border-[#e1e5ec] bg-white px-3 py-2 text-[#103152] placeholder:text-[#6b7280] dark:border-[#2a3441] dark:bg-[#161d27] dark:text-[#e8ecf1] dark:placeholder:text-[#8ea0b5]"
        />

        <label className="flex items-center gap-2 text-[#103152] dark:text-[#e8ecf1]">
          <input
            type="checkbox"
            checked={form.show_in_nav}
            onChange={(e) =>
              setForm((p) => ({ ...p, show_in_nav: e.target.checked }))
            }
          />
          {adminT("adminTags.showNav")}
        </label>

        <button type="submit" className="admin-btn-primary">
          {editingId ? adminT("adminTags.update") : adminT("adminTags.create")}
        </button>
      </form>

      <div className="space-y-3">
        {tags.map((tag) => (
          <div
            key={tag.id}
            className="flex flex-col gap-3 rounded-xl border border-[#e1e5ec] bg-white p-4 sm:flex-row sm:items-center sm:justify-between dark:border-[#2a3441] dark:bg-[#1e2835]"
          >
            <div>
              <p className="font-semibold text-[#103152] dark:text-[#e8ecf1]">
                {tag.name}
              </p>
              <p className="text-sm text-[#4d515c] dark:text-[#b8c4d0]">
                /posts/tag/{tag.slug}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
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
                className="admin-btn-secondary admin-btn-secondary--sm"
              >
                {adminT("adminTags.edit")}
              </button>
              <button
                type="button"
                onClick={() => handleDelete(tag.id)}
                className="admin-btn-danger admin-btn-danger--sm"
              >
                {adminT("adminTags.delete")}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AdminPostTagsTab;