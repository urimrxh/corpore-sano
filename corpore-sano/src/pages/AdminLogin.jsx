import { useEffect, useMemo, useState } from "react";
import { useSiteContent } from "../context/SiteContentContext";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";
import AdminBookingsTab from "../components/AdminBookingsTab";
import AdminPostsTab from "../components/AdminPostsTab";
import AdminPostTagsTab from "../components/AdminPostTagsTab";
import { fetchCurrentAdminProfile } from "../lib/adminsApi";
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

function AdminLogin() {
  const { t } = useI18n();
  const { signOut, user } = useAuth();
  const {
    content,
    siteBilingualEnabled,
    replaceContent,
    resetToDefaults,
    lastRemoteSaveError,
    remoteLoadError,
  } = useSiteContent();

  const TABS = useMemo(
    () => [
      { id: "global", label: t("adminLogin.tabs.global") },
      { id: "home", label: t("adminLogin.tabs.home") },
      { id: "contact", label: t("adminLogin.tabs.contact") },
      { id: "about", label: t("adminLogin.tabs.about") },
      { id: "videos", label: t("adminLogin.tabs.videos") },
      { id: "videosPage", label: t("adminLogin.tabs.videosPage") },
      { id: "footer", label: t("adminLogin.tabs.footer") },
      { id: "pages", label: t("adminLogin.tabs.pages") },
      { id: "bookings", label: t("adminLogin.tabs.bookings") },
      { id: "posts", label: t("adminLogin.tabs.posts") },
      { id: "postTags", label: t("adminLogin.tabs.postTags") },
    ],
    [t],
  );

  const ABOUT_TEXT_PANEL_OPTIONS = useMemo(
    () => [
      { value: "grey", label: t("adminLogin.panelGrey"), swatch: PANEL_SWATCH_BY_VALUE.grey },
      { value: "green-teal", label: t("adminLogin.panelGreenTeal"), swatch: PANEL_SWATCH_BY_VALUE["green-teal"] },
      { value: "green-mint", label: t("adminLogin.panelGreenMint"), swatch: PANEL_SWATCH_BY_VALUE["green-mint"] },
      { value: "white", label: t("adminLogin.panelWhite"), swatch: PANEL_SWATCH_BY_VALUE.white },
      { value: "navy", label: t("adminLogin.panelNavy"), swatch: PANEL_SWATCH_BY_VALUE.navy },
      { value: "black", label: t("adminLogin.panelBlack"), swatch: PANEL_SWATCH_BY_VALUE.black },
    ],
    [t],
  );

  const [tab, setTab] = useState("global");
  const [draft, setDraft] = useState(() => clone(content));
  const [savedFlash, setSavedFlash] = useState(false);
  const [adminProfile, setAdminProfile] = useState(null);

  const isContentTab = !["posts", "postTags"].includes(tab);
  const adminEmail = user?.email ?? "";

  useEffect(() => {
    const next = clone(content);
    next.global = {
      ...next.global,
      bilingualEnabled: siteBilingualEnabled,
    };
    setDraft(next);
  }, [content, siteBilingualEnabled]);

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
      t("adminLogin.fallbackName")
    );
  }, [adminProfile?.full_name, adminEmail, t]);

  function save() {
    replaceContent(draft);
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 2000);
  }

  function handleReset() {
    if (window.confirm(t("adminLogin.confirmReset"))) {
      resetToDefaults();
    }
  }

  return (
    <section className="page-section">
      <div className="container admin-page">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <h1 className="mb-0 text-[28px] font-semibold text-[#103152] dark:text-[#e8ecf1] md:text-[32px]">
            {t("adminLogin.pageTitle")}
          </h1>
          <button
            type="button"
            className="rounded-lg border border-[#e1e5ec] bg-[#f5f8fa] px-3 py-1.5 text-sm font-semibold text-[#103152] hover:cursor-pointer dark:border-[#2a3441] dark:bg-[#1e2835] dark:text-[#e8ecf1] hover:bg-gray-50"
            onClick={() => signOut()}
          >
            {t("adminLogin.signOut")}
          </button>
        </div>

        <div className="mb-6 rounded-2xl border border-[#e1e5ec] bg-[#f5f8fa] px-4 py-4 dark:border-[#2a3441] dark:bg-[#1e2835]">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#4d515c] dark:text-[#8ea0b5]">
            {t("adminLogin.accountLabel")}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-[#103152] dark:text-[#e8ecf1]">
            {t("adminLogin.welcome", { name: adminDisplayName })}
          </h2>
          <p className="mt-1 break-all text-sm text-[#4d515c] dark:text-[#b8c4d0]">
            {adminEmail || t("adminLogin.noEmail")}
          </p>
        </div>

        {remoteLoadError && (
          <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
            {t("adminLogin.remoteLoad", { error: remoteLoadError })}
          </p>
        )}

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
              <label htmlFor="g-cta">{t("adminLogin.headerCta")}</label>
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
              <label htmlFor="g-cta2">{t("adminLogin.footerCta")}</label>
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
                <span className="text-sm font-semibold text-[#103152] dark:text-[#e8ecf1]">
                  {t("adminLogin.bilingualEnabled")}
                </span>
              </label>
              <p className="mt-2 text-xs text-[#4d515c] dark:text-[#8ea0b5]">
                {t("adminLogin.bilingualEnabledHint")}
              </p>
            </div>
          </div>
        )}

        {tab === "home" && (
          <div>
            <div className="admin-field">
              <label htmlFor="h-title">{t("adminLogin.heroTitle")}</label>
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
              <label htmlFor="h-desc">{t("adminLogin.heroDesc")}</label>
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
              <label htmlFor="h-vhead">{t("adminLogin.videoHead")}</label>
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
              <label htmlFor="h-vall">{t("adminLogin.viewAllLabel")}</label>
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
              <label htmlFor="c-title">{t("adminLogin.pageTitleLabel")}</label>
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
              <label htmlFor="c-intro">{t("adminLogin.contactIntro")}</label>
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
              <label htmlFor="c-bg">{t("adminLogin.bgUrl")}</label>
              <input
                id="c-bg"
                type="url"
                placeholder={t("adminLogin.bgPlaceholder")}
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
              <p className="admin-hint">{t("adminLogin.bgHint")}</p>
            </div>
            <h3 className="mb-2 mt-6 text-base font-semibold text-[#103152] dark:text-[#e8ecf1]">
              {t("adminLogin.formLabels")}
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
              <label htmlFor="a-title">{t("adminLogin.pageTitleLabel")}</label>
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
              <label htmlFor="a-intro">{t("adminLogin.aboutIntro")}</label>
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
              {t("adminLogin.sectionsTitle")}
            </h3>
            <p className="admin-hint mb-4">{t("adminLogin.sectionsHint")}</p>

            {draft.about.sections.map((sec, index) => (
              <div key={sec.id} className="admin-card">
                <h3>{t("adminLogin.sectionN", { n: index + 1 })}</h3>

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
                  <label htmlFor={`a-il-${sec.id}`}>{t("adminLogin.imageLeft")}</label>
                </div>

                <div className="admin-field">
                  <label htmlFor={`a-tp-${sec.id}`}>
                    {t("adminLogin.textPanelBg")}
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
                  <label>{t("adminLogin.imageUrl")}</label>
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
                  <label>{t("adminLogin.imageAlt")}</label>
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
                  <label>{t("adminLogin.heading")}</label>
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
                  <label>{t("adminLogin.body")}</label>
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
                  {t("adminLogin.removeSection")}
                </button>
              </div>
            ))}

            <button
              type="button"
              className="admin-btn-secondary rounded-md border border-[#e1e5ec] bg-[#f5f8fa] px-4 py-2 text-sm font-semibold text-[#103152] dark:border-[#2a3441] dark:bg-[#1e2835] dark:text-[#e8ecf1]"
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
                      },
                    ],
                  },
                }))
              }
            >
              {t("adminLogin.addSection")}
            </button>
          </div>
        )}

        {tab === "videos" && (
          <div>
            <p className="mb-4 text-sm text-[#4d515c] dark:text-[#b8c4d0]">
              {t("adminLogin.videosHint")}
            </p>

            {draft.videos.map((v, index) => (
              <div key={v.id} className="admin-card">
                <h3>{t("adminLogin.videoN", { id: v.id })}</h3>

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
                  <label htmlFor={`v-pub-${v.id}`}>{t("adminLogin.published")}</label>
                </div>

                <div className="admin-field">
                  <label>{t("adminLogin.videoTitle")}</label>
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
                  <label>{t("adminLogin.videoDesc")}</label>
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
                  <label>{t("adminLogin.videoUrl")}</label>
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
                  <label>{t("adminLogin.category")}</label>
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
                  className="mt-2 rounded-md bg-[#fef2f2] px-3 py-1.5 text-sm font-semibold text-[#b91c1c]"
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      videos: d.videos.filter((_, i) => i !== index),
                    }))
                  }
                >
                  {t("adminLogin.removeVideo")}
                </button>
              </div>
            ))}

            <button
              type="button"
              className="rounded-md border border-[#e1e5ec] bg-[#f5f8fa] px-4 py-2 text-sm font-semibold text-[#103152] dark:border-[#2a3441] dark:bg-[#1e2835] dark:text-[#e8ecf1]"
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
              {t("adminLogin.addVideo")}
            </button>
          </div>
        )}

        {tab === "videosPage" && (
          <div>
            <div className="admin-field">
              <label>{t("adminLogin.pageTitleLabel")}</label>
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
              <label>{t("adminLogin.videosPageIntro")}</label>
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
              <label>{t("adminLogin.brandName")}</label>
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
              <label>{t("adminLogin.phoneDisplay")}</label>
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
              <label>{t("adminLogin.phoneHref")}</label>
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
              <label>{t("adminLogin.cityLine")}</label>
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
              <label>{t("adminLogin.address")}</label>
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
              <label>{t("adminLogin.email")}</label>
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
              {t("adminLogin.extraFooterTitle")}
            </h3>

            <p className="admin-hint mb-4">{t("adminLogin.extraFooterHint")}</p>

            {(draft.footer.extraInfoFields ?? []).map((field, index) => (
              <div
                key={field.id ?? `footer-extra-${index}`}
                className="admin-card"
              >
                <h3>{t("adminLogin.extraFieldN", { n: index + 1 })}</h3>

                <div className="admin-field">
                  <label>{t("adminLogin.fieldType")}</label>
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
                    <option value="text">{t("adminLogin.typeText")}</option>
                    <option value="title">{t("adminLogin.typeTitle")}</option>
                    <option value="phone">{t("adminLogin.typePhone")}</option>
                    <option value="email">{t("adminLogin.typeEmail")}</option>
                  </select>
                </div>

                <div className="admin-field">
                  <label>{t("adminLogin.value")}</label>
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
                        ? t("adminLogin.linkPhone")
                        : t("adminLogin.linkEmail")}
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
                  {t("adminLogin.removeField")}
                </button>
              </div>
            ))}

            <button
              type="button"
              className="admin-btn-secondary rounded-md border border-[#e1e5ec] bg-[#f5f8fa] px-4 py-2 text-sm font-semibold text-[#103152] dark:border-[#2a3441] dark:bg-[#1e2835] dark:text-[#e8ecf1]"
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
              {t("adminLogin.addFooterField")}
            </button>

            <div className="admin-field">
              <label>{t("adminLogin.copyright")}</label>
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
              {t("adminLogin.socialUrls")}
            </h3>

            {["facebook", "instagram", "linkedin", "emailMailto"].map((k) => (
              <div key={k} className="admin-field">
                <label htmlFor={`soc-${k}`}>{k}</label>
                <input
                  id={`soc-${k}`}
                  type="url"
                  value={draft.footer.social[k]}
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
          </div>
        )}

        {tab === "pages" && (
          <div>
            <div className="admin-card">
              <h3>{t("adminLogin.bookMeetingCard")}</h3>
              <div className="admin-field">
                <label>{t("adminLogin.videoTitle")}</label>
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
                <label>{t("adminLogin.intro")}</label>
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
              <h3>{t("adminLogin.nutritionistsCard")}</h3>
              <div className="admin-field">
                <label>{t("adminLogin.videoTitle")}</label>
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
                <label>{t("adminLogin.intro")}</label>
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
          <div>
            <p className="mb-4 text-sm text-[#4d515c] dark:text-[#b8c4d0]">
              {t("adminLogin.bookingsHint")}
            </p>
            <AdminBookingsTab />
          </div>
        )}

        {tab === "posts" && (
          <div>
            <p className="mb-4 text-sm text-[#4d515c] dark:text-[#b8c4d0]">
              {t("adminLogin.postsHint")}
            </p>
            <AdminPostsTab />
          </div>
        )}

        {tab === "postTags" && (
          <div>
            <p className="mb-4 text-sm text-[#4d515c] dark:text-[#b8c4d0]">
              {t("adminLogin.tagsHint")}
            </p>
            <AdminPostTagsTab />
          </div>
        )}

        {isContentTab && (
          <div className="admin-actions py-[24px] md:py-[12px]">
            <button type="button" className="admin-btn-primary" onClick={save}>
              {t("adminLogin.save")}
            </button>
            <button
              type="button"
              className="admin-btn-secondary"
              onClick={handleReset}
            >
              {t("adminLogin.reset")}
            </button>

            {savedFlash && (
              <span className="text-sm font-medium text-[#3aa57d] dark:text-[#5dcc9f]">
                {t("adminLogin.savedFlash")}
              </span>
            )}

            {lastRemoteSaveError && (
              <span className="max-w-xl text-sm text-[#b91c1c] dark:text-[#fca5a5]">
                {t("adminLogin.remoteSaveFailed", {
                  error: lastRemoteSaveError,
                })}
              </span>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export default AdminLogin;