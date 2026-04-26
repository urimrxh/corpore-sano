import { useEffect, useState } from "react";
import { adminT } from "../lib/adminUi";
import {
  createHeroBanner,
  deleteHeroBanner,
  getHeroBannersAdmin,
  HERO_BANNERS_BUCKET,
  normalizeCtaUrl,
  removeHeroBannerStorageObject,
  updateHeroBanner,
  uploadHeroBannerImage,
} from "../lib/heroBannersApi";

const emptyForm = {
  title_sq: "",
  subtitle_sq: "",
  cta_label_sq: "",
  title_en: "",
  subtitle_en: "",
  cta_label_en: "",
  cta_url: "",
  sort_order: 0,
  is_active: true,
  image_url: "",
  image_path: "",
};

function AdminHeroBannersTab() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadAll() {
    setLoading(true);
    const { data, error } = await getHeroBannersAdmin();
    if (error) {
      window.alert(error.message || String(error));
      setRows([]);
    } else {
      setRows(data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setImageFile(null);
  }

  function handleEdit(row) {
    setEditingId(row.id);
    setForm({
      title_sq: row.title_sq || "",
      subtitle_sq: row.subtitle_sq || "",
      cta_label_sq: row.cta_label_sq || "",
      title_en: row.title_en || "",
      subtitle_en: row.subtitle_en || "",
      cta_label_en: row.cta_label_en || "",
      cta_url: row.cta_url || "",
      sort_order: row.sort_order ?? 0,
      is_active: row.is_active !== false,
      image_url: row.image_url || "",
      image_path: row.image_path || "",
    });
    setImageFile(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!(form.title_sq.trim() || form.title_en.trim())) {
      window.alert(adminT("adminHeroBanners.titleRequired"));
      return;
    }

    const sortNum = parseInt(String(form.sort_order), 10);
    if (Number.isNaN(sortNum)) {
      window.alert(adminT("adminHeroBanners.sortInvalid"));
      return;
    }

    const hasLabel = form.cta_label_sq.trim() || form.cta_label_en.trim();
    const urlNorm = normalizeCtaUrl(form.cta_url);
    if (hasLabel && !urlNorm) {
      window.alert(adminT("adminHeroBanners.ctaUrlMissing"));
      return;
    }

    if (!editingId && !imageFile) {
      window.alert(adminT("adminHeroBanners.imageRequired"));
      return;
    }

    setSaving(true);
    try {
      let image_url = form.image_url;
      let image_path = form.image_path;
      const oldPath = editingId ? form.image_path : null;

      if (imageFile) {
        const { publicUrl, image_path: newPath, error: upErr } = await uploadHeroBannerImage(imageFile);
        if (upErr) {
          window.alert(upErr.message || String(upErr));
          setSaving(false);
          return;
        }
        image_url = publicUrl;
        image_path = newPath;
      }

      if (!image_url) {
        window.alert(adminT("adminHeroBanners.imageRequired"));
        setSaving(false);
        return;
      }

      const payload = {
        ...form,
        sort_order: sortNum,
        image_url,
        image_path,
        cta_url: urlNorm,
      };

      if (editingId) {
        const { error } = await updateHeroBanner(editingId, payload);
        if (error) {
          window.alert(error.message || String(error));
          if (imageFile && image_path && image_path !== oldPath) {
            await removeHeroBannerStorageObject(image_path);
          }
          setSaving(false);
          return;
        }
        if (imageFile && oldPath && oldPath !== image_path) {
          await removeHeroBannerStorageObject(oldPath);
        }
      } else {
        const { error } = await createHeroBanner(payload);
        if (error) {
          window.alert(error.message || String(error));
          if (image_path) await removeHeroBannerStorageObject(image_path);
          setSaving(false);
          return;
        }
      }

      resetForm();
      await loadAll();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(row) {
    if (!window.confirm(adminT("adminHeroBanners.confirmDelete"))) return;
    const { error } = await deleteHeroBanner(row.id, row.image_path);
    if (error) {
      window.alert(error.message || String(error));
      return;
    }
    if (editingId === row.id) resetForm();
    loadAll();
  }

  if (loading) {
    return <p className="text-[#4d515c] dark:text-[#b8c4d0]">{adminT("adminHeroBanners.loading")}</p>;
  }

  return (
    <div className="space-y-8">
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-[#e1e5ec] bg-white p-5 dark:border-[#2a3441] dark:bg-[#1e2835]"
      >
        <h3 className="text-xl font-semibold text-[#103152] dark:text-[#e8ecf1]">
          {editingId ? adminT("adminHeroBanners.editBanner") : adminT("adminHeroBanners.addBanner")}
        </h3>

        <p className="text-xs text-[#4d515c] dark:text-[#8ea0b5]">
          {adminT("adminHeroBanners.bucketHint", { bucket: HERO_BANNERS_BUCKET })}
        </p>

        <div className="admin-field">
          <label htmlFor="hb-image">{adminT("adminHeroBanners.imageLabel")}</label>
          <input
            id="hb-image"
            type="file"
            accept="image/*"
            className="w-full text-sm text-[#103152] dark:text-[#e8ecf1] file:mr-3 file:rounded-md file:border-0 file:bg-[#218c77] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white"
            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
          />
          {form.image_url && !imageFile ? (
            <p className="mt-2 text-xs text-[#4d515c] dark:text-[#8ea0b5]">
              {adminT("adminHeroBanners.currentImage")}{" "}
              <a
                href={form.image_url}
                className="text-[#218c77] underline dark:text-[#4dc89f]"
                target="_blank"
                rel="noopener noreferrer"
              >
                {adminT("adminHeroBanners.viewImage")}
              </a>
            </p>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="admin-field">
            <label htmlFor="hb-title-sq">{adminT("adminHeroBanners.titleSq")}</label>
            <input
              id="hb-title-sq"
              name="title_sq"
              value={form.title_sq}
              onChange={handleChange}
              className="w-full rounded-md border border-[#e1e5ec] bg-white px-3 py-2 text-[#103152] dark:border-[#2a3441] dark:bg-[#161d27] dark:text-[#e8ecf1]"
            />
          </div>
          <div className="admin-field">
            <label htmlFor="hb-title-en">{adminT("adminHeroBanners.titleEn")}</label>
            <input
              id="hb-title-en"
              name="title_en"
              value={form.title_en}
              onChange={handleChange}
              className="w-full rounded-md border border-[#e1e5ec] bg-white px-3 py-2 text-[#103152] dark:border-[#2a3441] dark:bg-[#161d27] dark:text-[#e8ecf1]"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="admin-field">
            <label htmlFor="hb-sub-sq">{adminT("adminHeroBanners.subtitleSq")}</label>
            <textarea
              id="hb-sub-sq"
              name="subtitle_sq"
              value={form.subtitle_sq}
              onChange={handleChange}
              rows={3}
              className="w-full rounded-md border border-[#e1e5ec] bg-white px-3 py-2 text-[#103152] dark:border-[#2a3441] dark:bg-[#161d27] dark:text-[#e8ecf1]"
            />
          </div>
          <div className="admin-field">
            <label htmlFor="hb-sub-en">{adminT("adminHeroBanners.subtitleEn")}</label>
            <textarea
              id="hb-sub-en"
              name="subtitle_en"
              value={form.subtitle_en}
              onChange={handleChange}
              rows={3}
              className="w-full rounded-md border border-[#e1e5ec] bg-white px-3 py-2 text-[#103152] dark:border-[#2a3441] dark:bg-[#161d27] dark:text-[#e8ecf1]"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="admin-field">
            <label htmlFor="hb-cta-sq">{adminT("adminHeroBanners.ctaSq")}</label>
            <input
              id="hb-cta-sq"
              name="cta_label_sq"
              value={form.cta_label_sq}
              onChange={handleChange}
              className="w-full rounded-md border border-[#e1e5ec] bg-white px-3 py-2 text-[#103152] dark:border-[#2a3441] dark:bg-[#161d27] dark:text-[#e8ecf1]"
            />
          </div>
          <div className="admin-field">
            <label htmlFor="hb-cta-en">{adminT("adminHeroBanners.ctaEn")}</label>
            <input
              id="hb-cta-en"
              name="cta_label_en"
              value={form.cta_label_en}
              onChange={handleChange}
              className="w-full rounded-md border border-[#e1e5ec] bg-white px-3 py-2 text-[#103152] dark:border-[#2a3441] dark:bg-[#161d27] dark:text-[#e8ecf1]"
            />
          </div>
        </div>

        <div className="admin-field">
          <label htmlFor="hb-cta-url">{adminT("adminHeroBanners.ctaUrl")}</label>
          <input
            id="hb-cta-url"
            name="cta_url"
            value={form.cta_url}
            onChange={handleChange}
            placeholder="/book-meeting or https://…"
            className="w-full rounded-md border border-[#e1e5ec] bg-white px-3 py-2 text-[#103152] placeholder:text-[#6b7280] dark:border-[#2a3441] dark:bg-[#161d27] dark:text-[#e8ecf1]"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="admin-field">
            <label htmlFor="hb-sort">{adminT("adminHeroBanners.sortOrder")}</label>
            <input
              id="hb-sort"
              name="sort_order"
              type="number"
              value={form.sort_order}
              onChange={handleChange}
              className="w-full rounded-md border border-[#e1e5ec] bg-white px-3 py-2 text-[#103152] dark:border-[#2a3441] dark:bg-[#161d27] dark:text-[#e8ecf1]"
            />
          </div>
          <div className="admin-field flex items-end">
            <label htmlFor="hb-active" className="flex cursor-pointer items-center gap-3 font-normal">
              <input
                id="hb-active"
                name="is_active"
                type="checkbox"
                checked={form.is_active}
                onChange={handleChange}
                className="h-4 w-4 rounded border-[#e1e5ec] text-[#218c77] dark:border-[#2a3441]"
              />
              <span className="text-sm font-semibold text-[#103152] dark:text-[#e8ecf1]">
                {adminT("adminHeroBanners.active")}
              </span>
            </label>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button type="submit" className="admin-btn-primary" disabled={saving}>
            {saving ? adminT("adminHeroBanners.saving") : editingId ? adminT("adminHeroBanners.update") : adminT("adminHeroBanners.create")}
          </button>
          {editingId ? (
            <button type="button" className="admin-btn-secondary" onClick={resetForm} disabled={saving}>
              {adminT("adminHeroBanners.cancel")}
            </button>
          ) : null}
        </div>
      </form>

      <div className="overflow-x-auto rounded-xl border border-[#e1e5ec] bg-white dark:border-[#2a3441] dark:bg-[#121a22]">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[#e1e5ec] bg-[#f5f8fa] dark:border-[#2a3441] dark:bg-[#1e2835]">
            <tr>
              <th className="px-3 py-2 font-semibold text-[#103152] dark:text-[#e8ecf1]">
                {adminT("adminHeroBanners.colOrder")}
              </th>
              <th className="px-3 py-2 font-semibold text-[#103152] dark:text-[#e8ecf1]">
                {adminT("adminHeroBanners.colPreview")}
              </th>
              <th className="px-3 py-2 font-semibold text-[#103152] dark:text-[#e8ecf1]">
                {adminT("adminHeroBanners.colTitles")}
              </th>
              <th className="px-3 py-2 font-semibold text-[#103152] dark:text-[#e8ecf1]">
                {adminT("adminHeroBanners.colActive")}
              </th>
              <th className="px-3 py-2 font-semibold text-[#103152] dark:text-[#e8ecf1]">
                {adminT("adminHeroBanners.colActions")}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-[#e1e5ec] dark:border-[#2a3441]">
                <td className="px-3 py-2 text-[#103152] dark:text-[#e8ecf1]">{row.sort_order}</td>
                <td className="px-3 py-2">
                  {row.image_url ? (
                    <img
                      src={row.image_url}
                      alt={adminT("adminHeroBanners.previewAlt")}
                      className="h-12 w-20 rounded object-cover"
                    />
                  ) : (
                    "—"
                  )}
                </td>
                <td className="max-w-[200px] px-3 py-2 text-[#4d515c] dark:text-[#b8c4d0]">
                  <div className="truncate font-medium text-[#103152] dark:text-[#e8ecf1]">{row.title_sq || "—"}</div>
                  <div className="truncate text-xs">{row.title_en || "—"}</div>
                </td>
                <td className="px-3 py-2 text-[#103152] dark:text-[#e8ecf1]">
                  {row.is_active ? adminT("adminHeroBanners.yes") : adminT("adminHeroBanners.no")}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="text-sm font-medium text-[#218c77] underline dark:text-[#4dc89f]" onClick={() => handleEdit(row)}>
                      {adminT("adminHeroBanners.edit")}
                    </button>
                    <button type="button" className="text-sm font-medium text-[#b91c1c] underline dark:text-[#fca5a5]" onClick={() => handleDelete(row)}>
                      {adminT("adminHeroBanners.delete")}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length ? (
          <p className="p-4 text-sm text-[#4d515c] dark:text-[#b8c4d0]">{adminT("adminHeroBanners.empty")}</p>
        ) : null}
      </div>
    </div>
  );
}

export default AdminHeroBannersTab;
