import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useSiteContent } from "../context/SiteContentContext";
import { useAuth } from "../context/AuthContext";
import { adminT } from "../lib/adminUi";
import AdminBookingsTab from "../components/AdminBookingsTab";
import AdminAvailabilitySettings from "../components/AdminAvailabilitySettings";
import AdminPostsTab from "../components/AdminPostsTab";
import AdminPostTagsTab from "../components/AdminPostTagsTab";
import AdminHeroBannersTab from "../components/AdminHeroBannersTab";
import { fetchCurrentAdminProfile } from "../lib/adminsApi";
import Seo from "../components/Seo";
import { SEO_ADMIN_DESCRIPTION, SEO_ADMIN_TITLE } from "../seoCopy";
import "../style/admin.css";

const PANEL_SWATCH_BY_VALUE = {
  grey: "#454d55",
  "green-teal": "#218c77",
  "green-mint": "#3aa57d",
  white: "#ffffff",
  navy: "#103152",
  black: "#0d1218",
};

function aboutPanelSwatchHex(theme) {
  return PANEL_SWATCH_BY_VALUE[theme ?? "grey"] ?? "#454d55";
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

const ADMIN_EDIT_LOCALE_KEY = "corpore-sano-admin-edit-locale-v1";

function readStoredAdminEditLocale() {
  if (typeof window === "undefined") return "sq";
  try {
    const v = sessionStorage.getItem(ADMIN_EDIT_LOCALE_KEY);
    if (v === "en" || v === "sq") return v;
  } catch {
    /* */
  }
  return "sq";
}

function writeStoredAdminEditLocale(/** @type {"sq"|"en"} */ v) {
  try {
    sessionStorage.setItem(ADMIN_EDIT_LOCALE_KEY, v);
  } catch {
    /* */
  }
}

function AdminLogin() {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const {
    siteBilingualEnabled,
    siteContentRevision,
    getMergedContentFor,
    replaceContentFor,
    resetToDefaultsFor,
    lastRemoteSaveError,
    remoteLoadError,
  } = useSiteContent();

  const [adminEditLocale, setAdminEditLocaleState] = useState(readStoredAdminEditLocale);

  function setAdminEditLocale(/** @type {"sq"|"en"} */ next) {
    const v = next === "en" ? "en" : "sq";
    setAdminEditLocaleState(v);
    writeStoredAdminEditLocale(v);
  }

  const TABS = useMemo(
    () => [
      { id: "global", label: adminT("adminLogin.tabs.global") },
      { id: "home", label: adminT("adminLogin.tabs.home") },
      { id: "heroBanners", label: adminT("adminLogin.tabs.heroBanners") },
      { id: "contact", label: adminT("adminLogin.tabs.contact") },
      { id: "about", label: adminT("adminLogin.tabs.about") },
      { id: "videos", label: adminT("adminLogin.tabs.videos") },
      { id: "videosPage", label: adminT("adminLogin.tabs.videosPage") },
      { id: "footer", label: adminT("adminLogin.tabs.footer") },
      { id: "pages", label: adminT("adminLogin.tabs.pages") },
      { id: "bookings", label: adminT("adminLogin.tabs.bookings") },
      { id: "posts", label: adminT("adminLogin.tabs.posts") },
      { id: "postTags", label: adminT("adminLogin.tabs.postTags") },
    ],
    [],
  );

  const ABOUT_TEXT_PANEL_OPTIONS = useMemo(
    () => [
      { value: "grey", label: adminT("adminLogin.panelGrey"), swatch: PANEL_SWATCH_BY_VALUE.grey },
      { value: "green-teal", label: adminT("adminLogin.panelGreenTeal"), swatch: PANEL_SWATCH_BY_VALUE["green-teal"] },
      { value: "green-mint", label: adminT("adminLogin.panelGreenMint"), swatch: PANEL_SWATCH_BY_VALUE["green-mint"] },
      { value: "white", label: adminT("adminLogin.panelWhite"), swatch: PANEL_SWATCH_BY_VALUE.white },
      { value: "navy", label: adminT("adminLogin.panelNavy"), swatch: PANEL_SWATCH_BY_VALUE.navy },
      { value: "black", label: adminT("adminLogin.panelBlack"), swatch: PANEL_SWATCH_BY_VALUE.black },
    ],
    [],
  );

  const [tab, setTab] = useState("global");
  const [draft, setDraft] = useState(() => {
    const next = clone(getMergedContentFor(readStoredAdminEditLocale()));
    next.global = {
      ...next.global,
      bilingualEnabled: siteBilingualEnabled,
    };
    return next;
  });
  const [savedFlash, setSavedFlash] = useState(false);
  const [adminProfile, setAdminProfile] = useState(null);

  const isContentTab = !["bookings", "posts", "postTags", "heroBanners"].includes(tab);
  const adminEmail = user?.email ?? "";

  useEffect(() => {
    const next = clone(getMergedContentFor(adminEditLocale));
    next.global = {
      ...next.global,
      bilingualEnabled: siteBilingualEnabled,
    };
    setDraft(next);
  }, [
    adminEditLocale,
    siteBilingualEnabled,
    siteContentRevision,
    getMergedContentFor,
  ]);

  useEffect(() => {
    let cancelled = false;

    async function loadAdminProfile() {
      if (!user?.email) {
        setAdminProfile(null);
        return;
      }

      const { data } = await fetchCurrentAdminProfile(user.email);

      if (!cancelled) {
        setAdminProfile(data ?? null);
      }
    }

    loadAdminProfile();

    return () => {
      cancelled = true;
    };
  }, [user?.email]);

  const adminDisplayName = useMemo(() => {
    return (
      adminProfile?.full_name ||
      adminEmail.split("@")[0] ||
      adminEmail ||
      adminT("adminLogin.fallbackName")
    );
  }, [adminProfile?.full_name, adminEmail]);

  function save() {
    replaceContentFor(adminEditLocale, draft);
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 2000);
  }

  function handleReset() {
    if (window.confirm(adminT("adminLogin.confirmReset"))) {
      resetToDefaultsFor(adminEditLocale);
    }
  }

  return (
    <>
      <Seo title={SEO_ADMIN_TITLE} description={SEO_ADMIN_DESCRIPTION} path={location.pathname} noindex />
      <section className="page-section">
      <div className="container admin-page">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <h1 className="mb-0 text-[28px] font-semibold text-[#103152] dark:text-[#e8ecf1] md:text-[32px]">
            {adminT("adminLogin.pageTitle")}
          </h1>
          <button
            type="button"
            className="admin-btn-secondary admin-btn-secondary--sm"
            onClick={() => signOut()}
          >
            {adminT("adminLogin.signOut")}
          </button>
        </div>

        <div className="mb-6 rounded-2xl border border-[#e1e5ec] bg-[#f5f8fa] px-4 py-4 dark:border-[#2a3441] dark:bg-[#1e2835]">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#4d515c] dark:text-[#8ea0b5]">
            {adminT("adminLogin.accountLabel")}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-[#103152] dark:text-[#e8ecf1]">
            {adminT("adminLogin.welcome", { name: adminDisplayName })}
          </h2>
          <p className="mt-1 break-all text-sm text-[#4d515c] dark:text-[#b8c4d0]">
            {adminEmail || adminT("adminLogin.noEmail")}
          </p>
        </div>

        {remoteLoadError && (
          <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
            {adminT("adminLogin.remoteLoad", { error: remoteLoadError })}
          </p>
        )}

        <div className="mb-4 rounded-xl border border-[#e1e5ec] bg-white px-4 py-3 dark:border-[#2a3441] dark:bg-[#121a22]">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#4d515c] dark:text-[#8ea0b5]">
            {adminT("adminLogin.editingLocaleLabel")}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-[#e1e5ec] p-0.5 dark:border-[#2a3441]">
              <button
                type="button"
                className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors hover:cursor-pointer ${
                  adminEditLocale === "sq"
                    ? "bg-[#218c77] text-white"
                    : "text-[#103152] hover:bg-[#f0f4f8] dark:text-[#e8ecf1] dark:hover:bg-[#1e2835]"
                }`}
                onClick={() => setAdminEditLocale("sq")}
              >
                {adminT("adminLogin.editingLocaleSq")}
              </button>
              <button
                type="button"
                className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors hover:cursor-pointer ${
                  adminEditLocale === "en"
                    ? "bg-[#218c77] text-white"
                    : "text-[#103152] hover:bg-[#f0f4f8] dark:text-[#e8ecf1] dark:hover:bg-[#1e2835]"
                }`}
                onClick={() => setAdminEditLocale("en")}
              >
                {adminT("adminLogin.editingLocaleEn")}
              </button>
            </div>
          </div>
          <p className="mt-2 text-xs text-[#4d515c] dark:text-[#8ea0b5]">
            {adminT("adminLogin.editingLocaleHint")}
          </p>
        </div>

        <div className="admin-tabs" role="tablist">
          {TABS.map((tabItem) => (
            <button
              key={tabItem.id}
              type="button"
              role="tab"
              aria-selected={tab === tabItem.id}
              className={tab === tabItem.id ? "admin-tabs__btn--active" : ""}
              onClick={() => setTab(tabItem.id)}
            >
              {tabItem.label}
            </button>
          ))}
        </div>

        {tab === "global" && (
          <div>
            <div className="admin-field">
              <label htmlFor="g-cta">{adminT("adminLogin.headerCta")}</label>
              <input
                id="g-cta"
                type="text"
                value={draft.global.consultationCta}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    global: { ...d.global, consultationCta: e.target.value },
                  }))
                }
              />
            </div>
            <div className="admin-field">
              <label htmlFor="g-cta2">{adminT("adminLogin.footerCta")}</label>
              <input
                id="g-cta2"
                type="text"
                value={draft.global.consultationCtaFooter}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    global: {
                      ...d.global,
                      consultationCtaFooter: e.target.value,
                    },
                  }))
                }
              />
            </div>
            <div className="admin-field">
              <label
                htmlFor="g-bilingual"
                className="flex cursor-pointer items-start gap-3 font-normal"
              >
                <input
                  id="g-bilingual"
                  type="checkbox"
                  className="mt-1 h-4 w-4 shrink-0 rounded border-[#e1e5ec] text-[#218c77] focus:ring-[#218c77] dark:border-[#2a3441]"
                  checked={draft.global.bilingualEnabled !== false}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      global: {
                        ...d.global,
                        bilingualEnabled: e.target.checked,
                      },
                    }))
                  }
                />
                <span className="text-sm font-semibold text-[#103152] dark:text-[#e8ecf1] ml-[5px]">
                  {adminT("adminLogin.bilingualEnabled")}
                </span>
              </label>
              <p className="mt-2 text-xs text-[#4d515c] dark:text-[#8ea0b5]">
                {adminT("adminLogin.bilingualEnabledHint")}
              </p>
            </div>

            <div className="admin-field mt-6 border-t border-[#e1e5ec] pt-6 dark:border-[#2a3441]">
              <p className="mb-1 text-sm font-semibold text-[#103152] dark:text-[#e8ecf1]">
                {adminT("adminLogin.sectionsHiddenTitle")}
              </p>
              <p className="mb-4 text-xs text-[#4d515c] dark:text-[#8ea0b5]">
                {adminT("adminLogin.sectionsHiddenHint")}
              </p>
              {(
                [
                  ["homeLatestPosts", "hideHomeLatestPosts"],
                  ["homeVideos", "hideHomeVideos"],
                  ["videosPage", "hideVideosPage"],
                  ["posts", "hidePosts"],
                  ["nutritionists", "hideNutritionists"],
                ]
              ).map(([key, labelKey]) => (
                <label
                  key={key}
                  htmlFor={`g-hide-${key}`}
                  className="mb-3 flex cursor-pointer items-start gap-3 font-normal"
                >
                  <input
                    id={`g-hide-${key}`}
                    type="checkbox"
                    className="mt-1 h-4 w-4 shrink-0 rounded border-[#e1e5ec] text-[#218c77] focus:ring-[#218c77] dark:border-[#2a3441]"
                    checked={draft.global.sectionsHidden?.[key] === true}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        global: {
                          ...d.global,
                          sectionsHidden: {
                            homeLatestPosts: false,
                            homeVideos: false,
                            videosPage: false,
                            posts: false,
                            nutritionists: false,
                            ...d.global.sectionsHidden,
                            [key]: e.target.checked,
                          },
                        },
                      }))
                    }
                  />
                  <span className="ml-[5px] text-sm text-[#103152] dark:text-[#e8ecf1]">
                    {adminT(`adminLogin.${labelKey}`)}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {tab === "home" && (
          <div>
            <div className="admin-field">
              <label htmlFor="h-title">{adminT("adminLogin.heroTitle")}</label>
              <textarea
                id="h-title"
                value={draft.home.heroTitle}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    home: { ...d.home, heroTitle: e.target.value },
                  }))
                }
              />
            </div>
            <div className="admin-field">
              <label htmlFor="h-desc">{adminT("adminLogin.heroDesc")}</label>
              <textarea
                id="h-desc"
                value={draft.home.heroDescription}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    home: { ...d.home, heroDescription: e.target.value },
                  }))
                }
              />
            </div>
            <div className="admin-field">
              <label htmlFor="h-vhead">{adminT("adminLogin.videoHead")}</label>
              <input
                id="h-vhead"
                type="text"
                value={draft.home.videoSectionHeading}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    home: { ...d.home, videoSectionHeading: e.target.value },
                  }))
                }
              />
            </div>
            <div className="admin-field">
              <label htmlFor="h-vall">{adminT("adminLogin.viewAllLabel")}</label>
              <input
                id="h-vall"
                type="text"
                value={draft.home.videosViewAllLabel}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    home: { ...d.home, videosViewAllLabel: e.target.value },
                  }))
                }
              />
            </div>
          </div>
        )}

        {tab === "contact" && (
          <div>
            <div className="admin-field">
              <label htmlFor="c-title">{adminT("adminLogin.pageTitleLabel")}</label>
              <input
                id="c-title"
                type="text"
                value={draft.contact.pageTitle}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    contact: { ...d.contact, pageTitle: e.target.value },
                  }))
                }
              />
            </div>
            <div className="admin-field">
              <label htmlFor="c-intro">{adminT("adminLogin.contactIntro")}</label>
              <textarea
                id="c-intro"
                value={draft.contact.pageIntro}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    contact: { ...d.contact, pageIntro: e.target.value },
                  }))
                }
              />
            </div>
            <div className="admin-field">
              <label htmlFor="c-bg">{adminT("adminLogin.bgUrl")}</label>
              <input
                id="c-bg"
                type="url"
                placeholder={adminT("adminLogin.bgPlaceholder")}
                value={draft.contact.backgroundImageUrl}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    contact: {
                      ...d.contact,
                      backgroundImageUrl: e.target.value,
                    },
                  }))
                }
              />
              <p className="admin-hint">{adminT("adminLogin.bgHint")}</p>
            </div>
            <h3 className="mb-2 mt-6 text-base font-semibold text-[#103152] dark:text-[#e8ecf1]">
              {adminT("adminLogin.formLabels")}
            </h3>
            {Object.keys(draft.contact.form.labels).map((key) => (
              <div key={key} className="admin-field">
                <label htmlFor={`c-l-${key}`}>{key}</label>
                <textarea
                  id={`c-l-${key}`}
                  rows={key === "success" ? 2 : 1}
                  value={draft.contact.form.labels[key]}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      contact: {
                        ...d.contact,
                        form: {
                          ...d.contact.form,
                          labels: {
                            ...d.contact.form.labels,
                            [key]: e.target.value,
                          },
                        },
                      },
                    }))
                  }
                />
              </div>
            ))}
          </div>
        )}

        {tab === "about" && (
          <div>
            <div className="admin-field">
              <label htmlFor="a-title">{adminT("adminLogin.pageTitleLabel")}</label>
              <input
                id="a-title"
                type="text"
                value={draft.about.pageTitle}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    about: { ...d.about, pageTitle: e.target.value },
                  }))
                }
              />
            </div>
            <div className="admin-field">
              <label htmlFor="a-intro">{adminT("adminLogin.aboutIntro")}</label>
              <textarea
                id="a-intro"
                value={draft.about.pageIntro}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    about: { ...d.about, pageIntro: e.target.value },
                  }))
                }
              />
            </div>

            <h3 className="mb-2 mt-6 text-base font-semibold text-[#103152] dark:text-[#e8ecf1]">
              {adminT("adminLogin.sectionsTitle")}
            </h3>
            <p className="admin-hint mb-4">{adminT("adminLogin.sectionsHint")}</p>

            {draft.about.sections.map((sec, index) => (
              <div key={sec.id} className="admin-card">
                <h3>{adminT("adminLogin.sectionN", { n: index + 1 })}</h3>

                <div className="admin-field admin-field--inline">
                  <input
                    type="checkbox"
                    id={`a-il-${sec.id}`}
                    checked={sec.imageLeft}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        about: {
                          ...d.about,
                          sections: d.about.sections.map((s, i) =>
                            i === index
                              ? { ...s, imageLeft: e.target.checked }
                              : s,
                          ),
                        },
                      }))
                    }
                  />
                  <label htmlFor={`a-il-${sec.id}`}>{adminT("adminLogin.imageLeft")}</label>
                </div>

                <div className="admin-field">
                  <label htmlFor={`a-tp-${sec.id}`}>
                    {adminT("adminLogin.textPanelBg")}
                  </label>
                  <div className="admin-about-text-panel-row">
                    <select
                      id={`a-tp-${sec.id}`}
                      className="admin-about-text-panel-select"
                      value={sec.textPanelTheme ?? "grey"}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          about: {
                            ...d.about,
                            sections: d.about.sections.map((s, i) =>
                              i === index
                                ? { ...s, textPanelTheme: e.target.value }
                                : s,
                            ),
                          },
                        }))
                      }
                    >
                      {ABOUT_TEXT_PANEL_OPTIONS.map(({ value, label }) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <span
                      className="admin-about-swatch"
                      style={{
                        backgroundColor: aboutPanelSwatchHex(sec.textPanelTheme),
                      }}
                      title={aboutPanelSwatchHex(sec.textPanelTheme)}
                      role="presentation"
                      aria-hidden
                    />
                  </div>
                </div>

                <div className="admin-field">
                  <label>{adminT("adminLogin.imageUrl")}</label>
                  <input
                    type="url"
                    value={sec.image}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        about: {
                          ...d.about,
                          sections: d.about.sections.map((s, i) =>
                            i === index ? { ...s, image: e.target.value } : s,
                          ),
                        },
                      }))
                    }
                  />
                </div>

                <div className="admin-field">
                  <label>{adminT("adminLogin.imageAlt")}</label>
                  <input
                    type="text"
                    value={sec.imageAlt}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        about: {
                          ...d.about,
                          sections: d.about.sections.map((s, i) =>
                            i === index
                              ? { ...s, imageAlt: e.target.value }
                              : s,
                          ),
                        },
                      }))
                    }
                  />
                </div>

                <div className="admin-field">
                  <label>{adminT("adminLogin.heading")}</label>
                  <input
                    type="text"
                    value={sec.title}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        about: {
                          ...d.about,
                          sections: d.about.sections.map((s, i) =>
                            i === index ? { ...s, title: e.target.value } : s,
                          ),
                        },
                      }))
                    }
                  />
                </div>

                <div className="admin-field">
                  <label>{adminT("adminLogin.body")}</label>
                  <textarea
                    value={sec.body}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        about: {
                          ...d.about,
                          sections: d.about.sections.map((s, i) =>
                            i === index ? { ...s, body: e.target.value } : s,
                          ),
                        },
                      }))
                    }
                  />
                </div>

                <div className="admin-field">
                  <label htmlFor={`a-btn-l-${sec.id}`}>
                    {adminT("adminLogin.aboutSectionButtonLabel")}
                  </label>
                  <input
                    id={`a-btn-l-${sec.id}`}
                    type="text"
                    value={sec.buttonLabel ?? ""}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        about: {
                          ...d.about,
                          sections: d.about.sections.map((s, i) =>
                            i === index
                              ? { ...s, buttonLabel: e.target.value }
                              : s,
                          ),
                        },
                      }))
                    }
                  />
                </div>

                <div className="admin-field">
                  <label htmlFor={`a-btn-u-${sec.id}`}>
                    {adminT("adminLogin.aboutSectionButtonUrl")}
                  </label>
                  <input
                    id={`a-btn-u-${sec.id}`}
                    type="text"
                    value={sec.buttonUrl ?? ""}
                    placeholder="/book-meeting or https://…"
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        about: {
                          ...d.about,
                          sections: d.about.sections.map((s, i) =>
                            i === index
                              ? { ...s, buttonUrl: e.target.value }
                              : s,
                          ),
                        },
                      }))
                    }
                  />
                </div>

                <div className="admin-field">
                  <label htmlFor={`a-sec-u-${sec.id}`}>
                    {adminT("adminLogin.aboutSectionWholeUrl")}
                  </label>
                  <input
                    id={`a-sec-u-${sec.id}`}
                    type="text"
                    value={sec.sectionUrl ?? ""}
                    placeholder="/posts/example or https://…"
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        about: {
                          ...d.about,
                          sections: d.about.sections.map((s, i) =>
                            i === index
                              ? { ...s, sectionUrl: e.target.value }
                              : s,
                          ),
                        },
                      }))
                    }
                  />
                </div>

                <div className="admin-field admin-field--inline">
                  <input
                    type="checkbox"
                    id={`a-sec-hit-${sec.id}`}
                    checked={Boolean(sec.isSectionClickable)}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        about: {
                          ...d.about,
                          sections: d.about.sections.map((s, i) =>
                            i === index
                              ? { ...s, isSectionClickable: e.target.checked }
                              : s,
                          ),
                        },
                      }))
                    }
                  />
                  <label htmlFor={`a-sec-hit-${sec.id}`}>
                    {adminT("adminLogin.aboutSectionClickable")}
                  </label>
                </div>
                <p className="admin-hint mb-2">
                  {adminT("adminLogin.aboutSectionClickableHint")}
                </p>

                <button
                  type="button"
                  className="admin-btn-danger rounded-md px-3 py-1.5 text-sm font-semibold"
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      about: {
                        ...d.about,
                        sections: d.about.sections.filter((_, i) => i !== index),
                      },
                    }))
                  }
                >
                  {adminT("adminLogin.removeSection")}
                </button>
              </div>
            ))}

            <button
              type="button"
              className="admin-btn-secondary"
              onClick={() =>
                setDraft((d) => ({
                  ...d,
                  about: {
                    ...d.about,
                    sections: [
                      ...d.about.sections,
                      {
                        id: `about-${Date.now()}`,
                        imageLeft: d.about.sections.length % 2 === 0,
                        textPanelTheme: "grey",
                        image: "",
                        imageAlt: "",
                        title: "",
                        body: "",
                        buttonLabel: "",
                        buttonUrl: "",
                        sectionUrl: "",
                        isSectionClickable: false,
                      },
                    ],
                  },
                }))
              }
            >
              {adminT("adminLogin.addSection")}
            </button>
          </div>
        )}

        {tab === "videos" && (
          <div>
            <p className="mb-4 text-sm text-[#4d515c] dark:text-[#b8c4d0]">
              {adminT("adminLogin.videosHint")}
            </p>

            {draft.videos.map((v, index) => (
              <div key={v.id} className="admin-card">
                <h3>{adminT("adminLogin.videoN", { id: v.id })}</h3>

                <div className="admin-field admin-field--inline">
                  <input
                    type="checkbox"
                    id={`v-pub-${v.id}`}
                    checked={v.isPublished}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        videos: d.videos.map((x, i) =>
                          i === index
                            ? { ...x, isPublished: e.target.checked }
                            : x,
                        ),
                      }))
                    }
                  />
                  <label htmlFor={`v-pub-${v.id}`}>{adminT("adminLogin.published")}</label>
                </div>

                <div className="admin-field">
                  <label>{adminT("adminLogin.videoTitle")}</label>
                  <input
                    type="text"
                    value={v.title}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        videos: d.videos.map((x, i) =>
                          i === index ? { ...x, title: e.target.value } : x,
                        ),
                      }))
                    }
                  />
                </div>

                <div className="admin-field">
                  <label>{adminT("adminLogin.videoDesc")}</label>
                  <textarea
                    value={v.desc}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        videos: d.videos.map((x, i) =>
                          i === index ? { ...x, desc: e.target.value } : x,
                        ),
                      }))
                    }
                  />
                </div>

                <div className="admin-field">
                  <label>{adminT("adminLogin.videoUrl")}</label>
                  <input
                    type="url"
                    value={v.videoUrl}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        videos: d.videos.map((x, i) =>
                          i === index ? { ...x, videoUrl: e.target.value } : x,
                        ),
                      }))
                    }
                  />
                </div>

                <div className="admin-field">
                  <label>{adminT("adminLogin.category")}</label>
                  <input
                    type="text"
                    value={v.category}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        videos: d.videos.map((x, i) =>
                          i === index ? { ...x, category: e.target.value } : x,
                        ),
                      }))
                    }
                  />
                </div>

                <button
                  type="button"
                  className="admin-btn-danger-soft mt-2"
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      videos: d.videos.filter((_, i) => i !== index),
                    }))
                  }
                >
                  {adminT("adminLogin.removeVideo")}
                </button>
              </div>
            ))}

            <button
              type="button"
              className="admin-btn-secondary"
              onClick={() =>
                setDraft((d) => {
                  const nextId =
                    Math.max(0, ...d.videos.map((x) => Number(x.id) || 0)) + 1;
                  return {
                    ...d,
                    videos: [
                      ...d.videos,
                      {
                        id: nextId,
                        title: "",
                        desc: "",
                        videoUrl: "https://www.youtube.com/watch?v=",
                        startAt: 0,
                        endAt: null,
                        category: "",
                        isPublished: true,
                      },
                    ],
                  };
                })
              }
            >
              {adminT("adminLogin.addVideo")}
            </button>
          </div>
        )}

        {tab === "videosPage" && (
          <div>
            <div className="admin-field">
              <label>{adminT("adminLogin.pageTitleLabel")}</label>
              <input
                type="text"
                value={draft.videosPage.title}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    videosPage: { ...d.videosPage, title: e.target.value },
                  }))
                }
              />
            </div>
            <div className="admin-field">
              <label>{adminT("adminLogin.videosPageIntro")}</label>
              <textarea
                value={draft.videosPage.intro}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    videosPage: { ...d.videosPage, intro: e.target.value },
                  }))
                }
              />
            </div>
          </div>
        )}

        {tab === "footer" && (
          <div>
            <div className="admin-field">
              <label>{adminT("adminLogin.brandName")}</label>
              <input
                type="text"
                value={draft.footer.brandName}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    footer: { ...d.footer, brandName: e.target.value },
                  }))
                }
              />
            </div>
            <div className="admin-field">
              <label>{adminT("adminLogin.phoneDisplay")}</label>
              <input
                type="text"
                value={draft.footer.phone}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    footer: { ...d.footer, phone: e.target.value },
                  }))
                }
              />
            </div>
            <div className="admin-field">
              <label>{adminT("adminLogin.phoneHref")}</label>
              <input
                type="text"
                value={draft.footer.phoneHref}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    footer: { ...d.footer, phoneHref: e.target.value },
                  }))
                }
              />
            </div>
            <div className="admin-field">
              <label>{adminT("adminLogin.phoneSecondaryDisplay")}</label>
              <input
                type="text"
                value={draft.footer.phoneSecondary ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    footer: { ...d.footer, phoneSecondary: e.target.value },
                  }))
                }
              />
            </div>
            <div className="admin-field">
              <label>{adminT("adminLogin.phoneSecondaryHref")}</label>
              <input
                type="text"
                value={draft.footer.phoneSecondaryHref ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    footer: { ...d.footer, phoneSecondaryHref: e.target.value },
                  }))
                }
              />
            </div>
            <div className="admin-field">
              <label>{adminT("adminLogin.cityLine")}</label>
              <input
                type="text"
                value={draft.footer.cityLine}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    footer: { ...d.footer, cityLine: e.target.value },
                  }))
                }
              />
            </div>
            <div className="admin-field">
              <label>{adminT("adminLogin.address")}</label>
              <textarea
                value={draft.footer.address}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    footer: { ...d.footer, address: e.target.value },
                  }))
                }
              />
            </div>
            <div className="admin-field">
              <label>{adminT("adminLogin.email")}</label>
              <input
                type="email"
                value={draft.footer.email}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    footer: { ...d.footer, email: e.target.value },
                  }))
                }
              />
            </div>

            <h3 className="mb-2 mt-6 text-base font-semibold text-[#103152] dark:text-[#e8ecf1]">
              {adminT("adminLogin.extraFooterTitle")}
            </h3>

            <p className="admin-hint mb-4">{adminT("adminLogin.extraFooterHint")}</p>

            {(draft.footer.extraInfoFields ?? []).map((field, index) => (
              <div
                key={field.id ?? `footer-extra-${index}`}
                className="admin-card"
              >
                <h3>{adminT("adminLogin.extraFieldN", { n: index + 1 })}</h3>

                <div className="admin-field">
                  <label>{adminT("adminLogin.fieldType")}</label>
                  <select
                    value={field.type ?? "text"}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        footer: {
                          ...d.footer,
                          extraInfoFields: (
                            d.footer.extraInfoFields ?? []
                          ).map((item, i) =>
                            i === index
                              ? {
                                  ...item,
                                  type: e.target.value,
                                  href:
                                    e.target.value === "text" ||
                                    e.target.value === "title"
                                      ? ""
                                      : item.href ?? "",
                                }
                              : item,
                          ),
                        },
                      }))
                    }
                  >
                    <option value="text">{adminT("adminLogin.typeText")}</option>
                    <option value="title">{adminT("adminLogin.typeTitle")}</option>
                    <option value="phone">{adminT("adminLogin.typePhone")}</option>
                    <option value="email">{adminT("adminLogin.typeEmail")}</option>
                  </select>
                </div>

                <div className="admin-field">
                  <label>{adminT("adminLogin.value")}</label>
                  <input
                    type="text"
                    value={field.value ?? ""}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        footer: {
                          ...d.footer,
                          extraInfoFields: (
                            d.footer.extraInfoFields ?? []
                          ).map((item, i) =>
                            i === index
                              ? { ...item, value: e.target.value }
                              : item,
                          ),
                        },
                      }))
                    }
                  />
                </div>

                {(field.type === "phone" || field.type === "email") && (
                  <div className="admin-field">
                    <label>
                      {field.type === "phone"
                        ? adminT("adminLogin.linkPhone")
                        : adminT("adminLogin.linkEmail")}
                    </label>
                    <input
                      type="text"
                      value={field.href ?? ""}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          footer: {
                            ...d.footer,
                            extraInfoFields: (
                              d.footer.extraInfoFields ?? []
                            ).map((item, i) =>
                              i === index
                                ? { ...item, href: e.target.value }
                                : item,
                            ),
                          },
                        }))
                      }
                    />
                  </div>
                )}

                <button
                  type="button"
                  className="admin-btn-danger rounded-md px-3 py-1.5 text-sm font-semibold"
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      footer: {
                        ...d.footer,
                        extraInfoFields: (
                          d.footer.extraInfoFields ?? []
                        ).filter((_, i) => i !== index),
                      },
                    }))
                  }
                >
                  {adminT("adminLogin.removeField")}
                </button>
              </div>
            ))}

            <button
              type="button"
              className="admin-btn-secondary"
              onClick={() =>
                setDraft((d) => ({
                  ...d,
                  footer: {
                    ...d.footer,
                    extraInfoFields: [
                      ...(d.footer.extraInfoFields ?? []),
                      {
                        id: `footer-extra-${Date.now()}-${Math.random()
                          .toString(36)
                          .slice(2, 8)}`,
                        type: "text",
                        value: "",
                        href: "",
                      },
                    ],
                  },
                }))
              }
            >
              {adminT("adminLogin.addFooterField")}
            </button>

            <div className="admin-field">
              <label>{adminT("adminLogin.copyright")}</label>
              <input
                type="text"
                value={draft.footer.copyright}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    footer: { ...d.footer, copyright: e.target.value },
                  }))
                }
              />
            </div>

            <h3 className="mb-2 mt-4 text-base font-semibold text-[#103152] dark:text-[#e8ecf1]">
              {adminT("adminLogin.socialUrls")}
            </h3>

            {["facebook", "instagram", "emailMailto"].map((k) => (
              <div key={k} className="admin-field">
                <label htmlFor={`soc-${k}`}>{k}</label>
                <input
                  id={`soc-${k}`}
                  type="url"
                  value={draft.footer.social[k] ?? ""}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      footer: {
                        ...d.footer,
                        social: { ...d.footer.social, [k]: e.target.value },
                      },
                    }))
                  }
                />
              </div>
            ))}

            <h4 className="mb-2 mt-4 text-sm font-semibold text-[#103152] dark:text-[#e8ecf1]">
              {adminT("adminLogin.linkedinProfilesHeading")}
            </h4>
            <p className="admin-hint mb-3">{adminT("adminLogin.linkedinProfilesHint")}</p>
            {(draft.footer.social.linkedinProfiles ?? []).map((row, index) => (
              <div
                key={row.id || `li-${index}`}
                className="admin-card mb-3"
              >
                <div className="admin-field">
                  <label>{adminT("adminLogin.linkedinProfileName")}</label>
                  <input
                    type="text"
                    value={row.name ?? ""}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        footer: {
                          ...d.footer,
                          social: {
                            ...d.footer.social,
                            linkedinProfiles: (
                              d.footer.social.linkedinProfiles ?? []
                            ).map((item, i) =>
                              i === index ? { ...item, name: e.target.value } : item,
                            ),
                          },
                        },
                      }))
                    }
                  />
                </div>
                <div className="admin-field">
                  <label>{adminT("adminLogin.linkedinProfileUrl")}</label>
                  <input
                    type="url"
                    value={row.url ?? ""}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        footer: {
                          ...d.footer,
                          social: {
                            ...d.footer.social,
                            linkedinProfiles: (
                              d.footer.social.linkedinProfiles ?? []
                            ).map((item, i) =>
                              i === index ? { ...item, url: e.target.value } : item,
                            ),
                          },
                        },
                      }))
                    }
                  />
                </div>
                <button
                  type="button"
                  className="admin-btn-danger rounded-md px-3 py-1.5 text-sm font-semibold"
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      footer: {
                        ...d.footer,
                        social: {
                          ...d.footer.social,
                          linkedinProfiles: (
                            d.footer.social.linkedinProfiles ?? []
                          ).filter((_, i) => i !== index),
                        },
                      },
                    }))
                  }
                >
                  {adminT("adminLogin.linkedinProfileRemove")}
                </button>
              </div>
            ))}
            <button
              type="button"
              className="admin-btn-secondary"
              onClick={() =>
                setDraft((d) => ({
                  ...d,
                  footer: {
                    ...d.footer,
                    social: {
                      ...d.footer.social,
                      linkedinProfiles: [
                        ...(d.footer.social.linkedinProfiles ?? []),
                        {
                          id: `li-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                          name: "",
                          url: "",
                        },
                      ],
                    },
                  },
                }))
              }
            >
              {adminT("adminLogin.linkedinProfileAdd")}
            </button>
          </div>
        )}

        {tab === "pages" && (
          <div>
            <div className="admin-card">
              <h3>{adminT("adminLogin.bookMeetingCard")}</h3>
              <div className="admin-field">
                <label>{adminT("adminLogin.videoTitle")}</label>
                <input
                  type="text"
                  value={draft.bookMeeting.title}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      bookMeeting: { ...d.bookMeeting, title: e.target.value },
                    }))
                  }
                />
              </div>
              <div className="admin-field">
                <label>{adminT("adminLogin.intro")}</label>
                <textarea
                  value={draft.bookMeeting.intro}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      bookMeeting: { ...d.bookMeeting, intro: e.target.value },
                    }))
                  }
                />
              </div>
            </div>

            <div className="admin-card">
              <h3>{adminT("adminLogin.nutritionistsCard")}</h3>
              <div className="admin-field">
                <label>{adminT("adminLogin.videoTitle")}</label>
                <input
                  type="text"
                  value={draft.nutritionists.title}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      nutritionists: {
                        ...d.nutritionists,
                        title: e.target.value,
                      },
                    }))
                  }
                />
              </div>
              <div className="admin-field">
                <label>{adminT("adminLogin.intro")}</label>
                <textarea
                  value={draft.nutritionists.intro}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      nutritionists: {
                        ...d.nutritionists,
                        intro: e.target.value,
                      },
                    }))
                  }
                />
              </div>
            </div>
          </div>
        )}

        {tab === "bookings" && (
          <div className="space-y-6">
            <div>
              <p className="mb-4 text-sm text-[#4d515c] dark:text-[#b8c4d0]">
                {adminT("adminLogin.bookingsHint")}
              </p>
              <AdminBookingsTab />
            </div>

            <div className="rounded-2xl border border-[#e1e5ec] bg-white p-4 dark:border-[#2a3441] dark:bg-[#121a22] md:p-6">
              <h2 className="text-lg font-semibold text-[#103152] dark:text-[#e8ecf1]">
                Weekly availability
              </h2>
              <p className="mb-4 mt-1 text-sm text-[#4d515c] dark:text-[#b8c4d0]">
                Set the working days, start time, end time, and slot duration for the currently logged-in admin.
              </p>

              {adminProfile?.id ? (
                <AdminAvailabilitySettings adminId={adminProfile.id} />
              ) : (
                <p className="text-sm text-[#b91c1c] dark:text-[#fca5a5]">
                  Could not load the active admin profile, so availability settings cannot be shown yet.
                </p>
              )}
            </div>
          </div>
        )}

        {tab === "heroBanners" && (
          <div>
            <p className="mb-4 text-sm text-[#4d515c] dark:text-[#b8c4d0]">
              {adminT("adminLogin.heroBannersHint")}
            </p>
            <AdminHeroBannersTab editingLocale={adminEditLocale} />
          </div>
        )}

        {tab === "posts" && (
          <div>
            <p className="mb-4 text-sm text-[#4d515c] dark:text-[#b8c4d0]">
              {adminT("adminLogin.postsHint")}
            </p>
            <AdminPostsTab editingLocale={adminEditLocale} />
          </div>
        )}

        {tab === "postTags" && (
          <div>
            <p className="mb-4 text-sm text-[#4d515c] dark:text-[#b8c4d0]">
              {adminT("adminLogin.tagsHint")}
            </p>
            <AdminPostTagsTab editingLocale={adminEditLocale} />
          </div>
        )}

        {isContentTab && (
          <div className="admin-actions py-[24px] md:py-[12px]">
            <button type="button" className="admin-btn-primary" onClick={save}>
              {adminT("adminLogin.save")}
            </button>
            <button
              type="button"
              className="admin-btn-secondary"
              onClick={handleReset}
            >
              {adminT("adminLogin.reset")}
            </button>

            {savedFlash && (
              <span className="text-sm font-medium text-[#3aa57d] dark:text-[#5dcc9f]">
                {adminT("adminLogin.savedFlash")}
              </span>
            )}

            {lastRemoteSaveError && (
              <span className="max-w-xl text-sm text-[#b91c1c] dark:text-[#fca5a5]">
                {adminT("adminLogin.remoteSaveFailed", {
                  error: lastRemoteSaveError,
                })}
              </span>
            )}
          </div>
        )}
      </div>
    </section>
    </>
  );
}

export default AdminLogin;
