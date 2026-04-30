import { useEffect, useState } from "react";
import { adminT } from "../lib/adminUi";
import {
  createHeroBanner,
  deleteHeroBanner,
  getHeroBannersAdmin,
  HERO_BANNERS_BUCKET,
  heroBannerColorPickerValue,
  normalizeCtaUrl,
  removeHeroBannerStorageObject,
  resolveHeroBannerDesktopSrc,
  resolveHeroBannerMobileSrc,
  sanitizeHeroBannerColor,
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
  desktop_image_url: "",
  desktop_image_path: "",
  mobile_image_url: "",
  mobile_image_path: "",
  title_color: "",
  subtitle_color: "",
};

/**
 * @param {object} args
 * @returns {{ image_url: string, image_path: string|null, desktop_image_url: string|null, desktop_image_path: string|null, mobile_image_url: string|null, mobile_image_path: string|null }|null}
 */
function buildHeroBannerImagePayload({
  form,
  uploadedDesktop,
  uploadedMobile,
  editingId,
  editingStartedAsDual,
  desktopImageFile,
  mobileImageFile,
}) {
  let dUrl = (uploadedDesktop?.url ?? (form.desktop_image_url || "").trim()) || null;
  let dPath = (uploadedDesktop?.path ?? (form.desktop_image_path || "").trim()) || null;
  let mUrl = (uploadedMobile?.url ?? (form.mobile_image_url || "").trim()) || null;
  let mPath = (uploadedMobile?.path ?? (form.mobile_image_path || "").trim()) || null;

  if (editingStartedAsDual) {
    if (desktopImageFile && uploadedDesktop && !mobileImageFile) {
      mUrl = (form.mobile_image_url || "").trim() || null;
      mPath = (form.mobile_image_path || "").trim() || null;
    }
    if (mobileImageFile && uploadedMobile && !desktopImageFile) {
      dUrl = (form.desktop_image_url || "").trim() || null;
      dPath = (form.desktop_image_path || "").trim() || null;
    }
  }

  if (dUrl && mUrl) {
    return {
      image_url: dUrl,
      image_path: dPath,
      desktop_image_url: dUrl,
      desktop_image_path: dPath,
      mobile_image_url: mUrl,
      mobile_image_path: mPath,
    };
  }

  const singleUrl = dUrl || mUrl;
  const singlePath = dUrl ? dPath : mPath;

  if (singleUrl) {
    return {
      image_url: singleUrl,
      image_path: singlePath ?? null,
      desktop_image_url: null,
      desktop_image_path: null,
      mobile_image_url: null,
      mobile_image_path: null,
    };
  }

  if (editingId) {
    return {
      image_url: (form.image_url || "").trim(),
      image_path: (form.image_path || "").trim() || null,
      desktop_image_url: (form.desktop_image_url || "").trim() || null,
      desktop_image_path: (form.desktop_image_path || "").trim() || null,
      mobile_image_url: (form.mobile_image_url || "").trim() || null,
      mobile_image_path: (form.mobile_image_path || "").trim() || null,
    };
  }

  return null;
}

function AdminHeroBannersTab({ editingLocale = "sq" }) {
  const loc = editingLocale === "en" ? "en" : "sq";
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [editingStartedAsDual, setEditingStartedAsDual] = useState(false);
  const [pathsBeforeEdit, setPathsBeforeEdit] = useState(null);
  const [desktopImageFile, setDesktopImageFile] = useState(null);
  const [mobileImageFile, setMobileImageFile] = useState(null);
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
    setEditingStartedAsDual(false);
    setPathsBeforeEdit(null);
    setDesktopImageFile(null);
    setMobileImageFile(null);
  }

  function handleEdit(row) {
    setEditingId(row.id);
    const dual = Boolean((row.desktop_image_url || "").trim() && (row.mobile_image_url || "").trim());
    setEditingStartedAsDual(dual);
    setPathsBeforeEdit({
      image_path: row.image_path || null,
      desktop_image_path: row.desktop_image_path || null,
      mobile_image_path: row.mobile_image_path || null,
    });
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
      desktop_image_url: row.desktop_image_url || "",
      desktop_image_path: row.desktop_image_path || "",
      mobile_image_url: row.mobile_image_url || "",
      mobile_image_path: row.mobile_image_path || "",
      title_color: row.title_color || "",
      subtitle_color: row.subtitle_color || "",
    });
    setDesktopImageFile(null);
    setMobileImageFile(null);
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

    const titleColorTrim = (form.title_color || "").trim();
    const subtitleColorTrim = (form.subtitle_color || "").trim();
    if (
      (titleColorTrim && !sanitizeHeroBannerColor(form.title_color)) ||
      (subtitleColorTrim && !sanitizeHeroBannerColor(form.subtitle_color))
    ) {
      window.alert(adminT("adminHeroBanners.colorInvalid"));
      return;
    }

    if (!editingId && !desktopImageFile && !mobileImageFile) {
      window.alert(adminT("adminHeroBanners.imageRequired"));
      return;
    }

    setSaving(true);
    try {
      let uploadedDesktop = null;
      let uploadedMobile = null;
      const newUploadPaths = [];

      if (desktopImageFile) {
        const { publicUrl, image_path: newPath, error: upErr } = await uploadHeroBannerImage(desktopImageFile);
        if (upErr) {
          window.alert(upErr.message || String(upErr));
          setSaving(false);
          return;
        }
        uploadedDesktop = { url: publicUrl, path: newPath };
        if (newPath) newUploadPaths.push(newPath);
      }

      if (mobileImageFile) {
        const { publicUrl, image_path: newPath, error: upErr } = await uploadHeroBannerImage(mobileImageFile);
        if (upErr) {
          for (const p of newUploadPaths) {
            await removeHeroBannerStorageObject(p);
          }
          window.alert(upErr.message || String(upErr));
          setSaving(false);
          return;
        }
        uploadedMobile = { url: publicUrl, path: newPath };
        if (newPath) newUploadPaths.push(newPath);
      }

      const imageFields = buildHeroBannerImagePayload({
        form,
        uploadedDesktop,
        uploadedMobile,
        editingId,
        editingStartedAsDual,
        desktopImageFile: Boolean(desktopImageFile),
        mobileImageFile: Boolean(mobileImageFile),
      });

      if (!imageFields || !(imageFields.image_url || "").trim()) {
        for (const p of newUploadPaths) {
          await removeHeroBannerStorageObject(p);
        }
        window.alert(adminT("adminHeroBanners.imageRequired"));
        setSaving(false);
        return;
      }

      const payload = {
        ...form,
        sort_order: sortNum,
        ...imageFields,
        cta_url: urlNorm,
        title_color: sanitizeHeroBannerColor(form.title_color),
        subtitle_color: sanitizeHeroBannerColor(form.subtitle_color),
      };

      const collectPaths = (p) =>
        [p.image_path, p.desktop_image_path, p.mobile_image_path].filter(Boolean);
      const newPathSet = new Set(collectPaths(imageFields));

      if (editingId) {
        const { error } = await updateHeroBanner(editingId, payload);
        if (error) {
          window.alert(error.message || String(error));
          for (const p of newUploadPaths) {
            if (!newPathSet.has(p)) await removeHeroBannerStorageObject(p);
          }
          setSaving(false);
          return;
        }
        if (pathsBeforeEdit) {
          for (const old of collectPaths(pathsBeforeEdit)) {
            if (old && !newPathSet.has(old)) {
              await removeHeroBannerStorageObject(old);
            }
          }
        }
      } else {
        const { error } = await createHeroBanner(payload);
        if (error) {
          window.alert(error.message || String(error));
          for (const p of newUploadPaths) {
            await removeHeroBannerStorageObject(p);
          }
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
    const { error } = await deleteHeroBanner(row.id, null);
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
          <label htmlFor="hb-image-desktop">{adminT("adminHeroBanners.desktopImageLabel")}</label>
          <input
            id="hb-image-desktop"
            type="file"
            accept="image/*"
            className="w-full text-sm text-[#103152] dark:text-[#e8ecf1] file:mr-3 file:rounded-md file:border-0 file:bg-[#218c77] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white"
            onChange={(e) => setDesktopImageFile(e.target.files?.[0] || null)}
          />
          {resolveHeroBannerDesktopSrc(form) && !desktopImageFile ? (
            <p className="mt-2 text-xs text-[#4d515c] dark:text-[#8ea0b5]">
              {adminT("adminHeroBanners.currentDesktopImage")}{" "}
              <a
                href={resolveHeroBannerDesktopSrc(form)}
                className="text-[#218c77] underline dark:text-[#4dc89f]"
                target="_blank"
                rel="noopener noreferrer"
              >
                {adminT("adminHeroBanners.viewImage")}
              </a>
            </p>
          ) : null}
        </div>

        <div className="admin-field">
          <label htmlFor="hb-image-mobile">{adminT("adminHeroBanners.mobileImageLabel")}</label>
          <input
            id="hb-image-mobile"
            type="file"
            accept="image/*"
            className="w-full text-sm text-[#103152] dark:text-[#e8ecf1] file:mr-3 file:rounded-md file:border-0 file:bg-[#218c77] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white"
            onChange={(e) => setMobileImageFile(e.target.files?.[0] || null)}
          />
          {resolveHeroBannerMobileSrc(form) && !mobileImageFile ? (
            <p className="mt-2 text-xs text-[#4d515c] dark:text-[#8ea0b5]">
              {adminT("adminHeroBanners.currentMobileImage")}{" "}
              <a
                href={resolveHeroBannerMobileSrc(form)}
                className="text-[#218c77] underline dark:text-[#4dc89f]"
                target="_blank"
                rel="noopener noreferrer"
              >
                {adminT("adminHeroBanners.viewImage")}
              </a>
            </p>
          ) : null}
        </div>

        <p className="text-xs text-[#4d515c] dark:text-[#8ea0b5]">{adminT("adminHeroBanners.dualImageHint")}</p>

        <div className="admin-field">
          <label htmlFor="hb-title">{adminT("adminHeroBanners.bannerTitle")}</label>
          <input
            id="hb-title"
            value={loc === "en" ? form.title_en : form.title_sq}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                [loc === "en" ? "title_en" : "title_sq"]: e.target.value,
              }))
            }
            className="w-full rounded-md border border-[#e1e5ec] bg-white px-3 py-2 text-[#103152] dark:border-[#2a3441] dark:bg-[#161d27] dark:text-[#e8ecf1]"
          />
        </div>

        <div className="admin-field">
          <label htmlFor="hb-sub">{adminT("adminHeroBanners.bannerSubtitle")}</label>
          <textarea
            id="hb-sub"
            value={loc === "en" ? form.subtitle_en : form.subtitle_sq}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                [loc === "en" ? "subtitle_en" : "subtitle_sq"]: e.target.value,
              }))
            }
            rows={3}
            className="w-full rounded-md border border-[#e1e5ec] bg-white px-3 py-2 text-[#103152] dark:border-[#2a3441] dark:bg-[#161d27] dark:text-[#e8ecf1]"
          />
        </div>

        <div className="admin-field">
          <label htmlFor="hb-title-color">{adminT("adminHeroBanners.titleColor")}</label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              id="hb-title-color"
              type="text"
              name="title_color"
              value={form.title_color}
              onChange={handleChange}
              placeholder="#ffffff"
              autoComplete="off"
              className="min-w-[8rem] flex-1 rounded-md border border-[#e1e5ec] bg-white px-3 py-2 text-[#103152] placeholder:text-[#6b7280] dark:border-[#2a3441] dark:bg-[#161d27] dark:text-[#e8ecf1]"
            />
            <input
              type="color"
              aria-label={adminT("adminHeroBanners.titleColorPicker")}
              value={heroBannerColorPickerValue(form.title_color)}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  title_color: e.target.value,
                }))
              }
              className="h-9 w-14 cursor-pointer rounded border border-[#e1e5ec] bg-white p-0 dark:border-[#2a3441]"
            />
            <button
              type="button"
              className="admin-btn-secondary whitespace-nowrap px-3 py-1.5 text-sm"
              onClick={() => setForm((p) => ({ ...p, title_color: "" }))}
            >
              {adminT("adminHeroBanners.useDefaultColor")}
            </button>
          </div>
          <p className="mt-1 text-xs text-[#4d515c] dark:text-[#8ea0b5]">{adminT("adminHeroBanners.colorHint")}</p>
        </div>

        <div className="admin-field">
          <label htmlFor="hb-subtitle-color">{adminT("adminHeroBanners.subtitleColor")}</label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              id="hb-subtitle-color"
              type="text"
              name="subtitle_color"
              value={form.subtitle_color}
              onChange={handleChange}
              placeholder="#ffffff"
              autoComplete="off"
              className="min-w-[8rem] flex-1 rounded-md border border-[#e1e5ec] bg-white px-3 py-2 text-[#103152] placeholder:text-[#6b7280] dark:border-[#2a3441] dark:bg-[#161d27] dark:text-[#e8ecf1]"
            />
            <input
              type="color"
              aria-label={adminT("adminHeroBanners.subtitleColorPicker")}
              value={heroBannerColorPickerValue(form.subtitle_color)}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  subtitle_color: e.target.value,
                }))
              }
              className="h-9 w-14 cursor-pointer rounded border border-[#e1e5ec] bg-white p-0 dark:border-[#2a3441]"
            />
            <button
              type="button"
              className="admin-btn-secondary whitespace-nowrap px-3 py-1.5 text-sm"
              onClick={() => setForm((p) => ({ ...p, subtitle_color: "" }))}
            >
              {adminT("adminHeroBanners.useDefaultColor")}
            </button>
          </div>
        </div>

        <div className="admin-field">
          <label htmlFor="hb-cta">{adminT("adminHeroBanners.bannerCtaLabel")}</label>
          <input
            id="hb-cta"
            value={loc === "en" ? form.cta_label_en : form.cta_label_sq}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                [loc === "en" ? "cta_label_en" : "cta_label_sq"]: e.target.value,
              }))
            }
            className="w-full rounded-md border border-[#e1e5ec] bg-white px-3 py-2 text-[#103152] dark:border-[#2a3441] dark:bg-[#161d27] dark:text-[#e8ecf1]"
          />
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
                className="h-4 w-4 rounded border-[#e1e5ec] text-[#218c77] dark:border-[#2a3441] mr-[5px]"
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
                  {resolveHeroBannerDesktopSrc(row) ? (
                    <img
                      src={resolveHeroBannerDesktopSrc(row)}
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
