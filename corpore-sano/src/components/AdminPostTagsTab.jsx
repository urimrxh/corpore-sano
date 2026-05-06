import { useEffect, useMemo, useState } from "react";
import { adminT } from "../lib/adminUi";
import { createTag, deleteTag, fetchAdminPostTags, slugify, updateTag } from "../lib/postsApi";

const initialForm = {
  name: "",
  slug: "",
  title_sq: "",
  title_en: "",
  parent_id: "",
  show_in_nav: true,
  nav_order: 0,
  is_active: true,
};

function AdminPostTagsTab({ editingLocale = "sq" }) {
  const loc = editingLocale === "en" ? "en" : "sq";
  const titleKey = loc === "en" ? "title_en" : "title_sq";
  const [tags, setTags] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);

  const parentOptions = useMemo(() => (tags || []).filter((t) => !t.parent_id), [tags]);

  async function loadTags() {
    const { data } = await fetchAdminPostTags();
    setTags(data || []);
  }

  useEffect(() => {
    loadTags();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!(form.name || "").trim()) {
      window.alert(adminT("adminTags.nameRequired"));
      return;
    }

    const payload = {
      ...form,
      slug: slugify(form.name),
      parent_id: form.parent_id || null,
      nav_order: Number(form.nav_order || 0),
    };

    const result = editingId ? await updateTag(editingId, payload) : await createTag(payload);
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

  function tagRouteLine(tagRow) {
    if (tagRow.parent_id) {
      const p = tags.find((t) => t.id === tagRow.parent_id);
      if (p) return `/posts/tag/${p.slug}/${tagRow.slug}`;
    }
    return `/posts/tag/${tagRow.slug}`;
  }

  const sortedList = useMemo(() => {
    const parents = tags.filter((t) => !t.parent_id);
    const children = tags.filter((t) => t.parent_id);
    const out = [];
    parents.forEach((p) => {
      out.push(p);
      children
        .filter((c) => c.parent_id === p.id)
        .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
        .forEach((c) => out.push(c));
    });
    children
      .filter((c) => !parents.some((p) => p.id === c.parent_id))
      .forEach((c) => out.push(c));
    return out;
  }, [tags]);

  return (
    <div className="space-y-8">
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-[#e1e5ec] bg-white p-5 dark:border-[#2a3441] dark:bg-[#1e2835]"
      >
        <input
          value={form.name}
          onChange={(e) =>
            setForm((p) => ({ ...p, name: e.target.value, slug: slugify(e.target.value) }))
          }
          placeholder={adminT("adminTags.namePh")}
          className="w-full rounded-md border border-[#e1e5ec] bg-white px-3 py-2 text-[#103152] placeholder:text-[#6b7280] dark:border-[#2a3441] dark:bg-[#161d27] dark:text-[#e8ecf1] dark:placeholder:text-[#8ea0b5]"
        />

        <input
          value={form.slug}
          placeholder={adminT("adminTags.slugPh")}
          readOnly
          disabled
          className="w-full rounded-md border border-[#e1e5ec] bg-white px-3 py-2 text-[#103152] placeholder:text-[#6b7280] dark:border-[#2a3441] dark:bg-[#161d27] dark:text-[#e8ecf1] dark:placeholder:text-[#8ea0b5]"
        />

        <input
          value={form[titleKey]}
          onChange={(e) => setForm((p) => ({ ...p, [titleKey]: e.target.value }))}
          placeholder={loc === "en" ? adminT("adminTags.titleEnPh") : adminT("adminTags.titleSqPh")}
          className="w-full rounded-md border border-[#e1e5ec] bg-white px-3 py-2 text-[#103152] placeholder:text-[#6b7280] dark:border-[#2a3441] dark:bg-[#161d27] dark:text-[#e8ecf1] dark:placeholder:text-[#8ea0b5]"
        />

        <div className="admin-field">
          <label className="text-sm text-[#4d515c] dark:text-[#b8c4d0]">{adminT("adminTags.parentLabel")}</label>
          <select
            value={form.parent_id || ""}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                parent_id: e.target.value,
                show_in_nav: e.target.value ? false : p.show_in_nav,
              }))
            }
            className="mt-1 w-full rounded-md border border-[#e1e5ec] bg-white px-3 py-2 text-[#103152] dark:border-[#2a3441] dark:bg-[#161d27] dark:text-[#e8ecf1]"
          >
            <option value="">{adminT("adminTags.parentNone")}</option>
            {parentOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-[#4d515c] dark:text-[#8ea0b5]">{adminT("adminTags.parentHint")}</p>
        </div>

        <label className="text-sm text-[#4d515c] dark:text-[#b8c4d0]">{adminT("adminTags.orderLabel")}</label>
        <input
          type="number"
          value={form.nav_order}
          onChange={(e) => setForm((p) => ({ ...p, nav_order: e.target.value }))}
          placeholder={adminT("adminTags.orderPh")}
          disabled={Boolean(form.parent_id)}
          className="w-full rounded-md border border-[#e1e5ec] bg-white px-3 py-2 text-[#103152] placeholder:text-[#6b7280] disabled:opacity-50 dark:border-[#2a3441] dark:bg-[#161d27] dark:text-[#e8ecf1] dark:placeholder:text-[#8ea0b5]"
        />

        <label className="flex items-center gap-2 text-[#103152] dark:text-[#e8ecf1]">
          <input
            type="checkbox"
            checked={form.show_in_nav}
            disabled={Boolean(form.parent_id)}
            onChange={(e) => setForm((p) => ({ ...p, show_in_nav: e.target.checked }))}
          />
          {adminT("adminTags.showNav")}
        </label>

        <label className="flex items-center gap-2 text-[#103152] dark:text-[#e8ecf1]">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
          />
          {adminT("adminTags.active")}
        </label>

        <button type="submit" className="admin-btn-primary">
          {editingId ? adminT("adminTags.update") : adminT("adminTags.create")}
        </button>
      </form>

      <div className="space-y-3">
        {sortedList.map((tag) => {
          const parent = tag.parent_id ? tags.find((t) => t.id === tag.parent_id) : null;
          return (
            <div
              key={tag.id}
              className={`flex flex-col gap-3 rounded-xl border border-[#e1e5ec] bg-white p-4 sm:flex-row sm:items-center sm:justify-between dark:border-[#2a3441] dark:bg-[#1e2835] ${tag.parent_id ? "ml-0 sm:ml-6" : ""}`}
            >
              <div>
                {parent ? (
                  <>
                    <p className="font-semibold text-[#103152] dark:text-[#e8ecf1]">{parent.name}</p>
                    <p className="mt-0.5 text-sm text-[#4d515c] dark:text-[#b8c4d0]">{tag.name}</p>
                  </>
                ) : (
                  <p className="font-semibold text-[#103152] dark:text-[#e8ecf1]">{tag.name}</p>
                )}
                <p className="text-sm text-[#4d515c] dark:text-[#b8c4d0]">{tagRouteLine(tag)}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(tag.id);
                    setForm({
                      name: tag.name || "",
                      slug: tag.slug || "",
                      title_sq: tag.title_sq || "",
                      title_en: tag.title_en || "",
                      parent_id: tag.parent_id || "",
                      show_in_nav: Boolean(tag.show_in_nav),
                      nav_order: tag.nav_order ?? 0,
                      is_active: tag.is_active !== false,
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
          );
        })}
      </div>
    </div>
  );
}

export default AdminPostTagsTab;
