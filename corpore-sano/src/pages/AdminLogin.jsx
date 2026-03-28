import { useEffect, useState } from "react";
import { useSiteContent } from "../context/SiteContentContext";
import { useAuth } from "../context/AuthContext";
import AdminBookingsTab from "../components/AdminBookingsTab";
import "../style/admin.css";

const TABS = [
  { id: "global", label: "Global & CTAs" },
  { id: "home", label: "Home" },
  { id: "contact", label: "Contact" },
  { id: "about", label: "About" },
  { id: "videos", label: "Videos" },
  { id: "videosPage", label: "Videos page" },
  { id: "footer", label: "Footer" },
  { id: "pages", label: "Other pages" },
  { id: "bookings", label: "Bookings" },
];

const ABOUT_TEXT_PANEL_OPTIONS = [
  { value: "grey", label: "Grey (#454d55) — default", swatch: "#454d55" },
  { value: "green-teal", label: "Green teal (#218c77)", swatch: "#218c77" },
  { value: "green-mint", label: "Green mint (#3aa57d)", swatch: "#3aa57d" },
  { value: "white", label: "White (#ffffff)", swatch: "#ffffff" },
  { value: "navy", label: "Navy (#103152)", swatch: "#103152" },
  { value: "black", label: "Black (#0d1218)", swatch: "#0d1218" },
];

function aboutPanelSwatchHex(theme) {
  const key = theme ?? "grey";
  return (
    ABOUT_TEXT_PANEL_OPTIONS.find((o) => o.value === key)?.swatch ?? "#454d55"
  );
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function AdminLogin() {
  const { signOut } = useAuth();
  const {
    content,
    replaceContent,
    resetToDefaults,
    lastRemoteSaveError,
    remoteLoadError,
  } = useSiteContent();
  const [tab, setTab] = useState("global");
  const [draft, setDraft] = useState(() => clone(content));
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    setDraft(clone(content));
  }, [content]);

  function save() {
    replaceContent(draft);
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 2000);
  }

  function handleReset() {
    if (
      window.confirm(
        "Reset all site copy to defaults? This clears saved admin data in this browser.",
      )
    ) {
      resetToDefaults();
    }
  }

  return (
    <section className="page-section">
      <div className="container admin-page">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <h1 className="mb-0 text-[28px] font-semibold text-[#103152] dark:text-[#e8ecf1] md:text-[32px]">
            Site content
          </h1>
          <button
            type="button"
            className="rounded-lg border border-[#e1e5ec] bg-[#f5f8fa] px-3 py-1.5 text-sm font-semibold text-[#103152] dark:border-[#2a3441] dark:bg-[#1e2835] dark:text-[#e8ecf1]"
            onClick={() => signOut()}
          >
            Sign out
          </button>
        </div>
        {remoteLoadError && (
          <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
            Could not load site from Supabase: {remoteLoadError}. Using saved
            browser data or defaults.
          </p>
        )}

        <div className="admin-tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={tab === t.id ? "admin-tabs__btn--active" : ""}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "global" && (
          <div>
            <div className="admin-field">
              <label htmlFor="g-cta">Header “Free consultation” button</label>
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
              <label htmlFor="g-cta2">Footer CTA button</label>
              <input
                id="g-cta2"
                type="text"
                value={draft.global.consultationCtaFooter}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    global: { ...d.global, consultationCtaFooter: e.target.value },
                  }))
                }
              />
            </div>
          </div>
        )}

        {tab === "home" && (
          <div>
            <div className="admin-field">
              <label htmlFor="h-title">Hero title</label>
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
              <label htmlFor="h-desc">Hero description</label>
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
              <label htmlFor="h-vhead">Video section heading</label>
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
              <label htmlFor="h-vall">“View all” link label</label>
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
              <label htmlFor="c-title">Page title</label>
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
              <label htmlFor="c-intro">Intro</label>
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
              <label htmlFor="c-bg">Background image URL</label>
              <input
                id="c-bg"
                type="url"
                placeholder="Leave empty to use the default bundled image"
                value={draft.contact.backgroundImageUrl}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    contact: { ...d.contact, backgroundImageUrl: e.target.value },
                  }))
                }
              />
              <p className="admin-hint">
                Full URL (https://…) or a path under <code>/public</code> e.g.{" "}
                <code>/my-bg.jpg</code>
              </p>
            </div>
            <h3 className="mb-2 mt-6 text-base font-semibold text-[#103152] dark:text-[#e8ecf1]">
              Form labels
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
              <label htmlFor="a-title">Page title</label>
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
              <label htmlFor="a-intro">Page intro</label>
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
              Sections (alternating layout is automatic)
            </h3>
            <p className="admin-hint mb-4">
              Each section has its own text-column background; colors adjust for
              readable contrast.
            </p>
            {draft.about.sections.map((sec, index) => (
              <div key={sec.id} className="admin-card">
                <h3>Section {index + 1}</h3>
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
                  <label htmlFor={`a-il-${sec.id}`}>Image on the left</label>
                </div>
                <div className="admin-field">
                  <label htmlFor={`a-tp-${sec.id}`}>
                    Text column background (this section only)
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
                  <label>Image URL</label>
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
                  <label>Image alt text</label>
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
                  <label>Heading</label>
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
                  <label>Body</label>
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
                  Remove section
                </button>
              </div>
            ))}
            <button
              type="button"
              className="admin-btn-secondary rounded-md border border-[#e1e5ec] dark:border-[#2a3441] bg-[#f5f8fa] dark:bg-[#1e2835] px-4 py-2 text-sm font-semibold text-[#103152] dark:text-[#e8ecf1]"
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
              + Add section
            </button>
          </div>
        )}

        {tab === "videos" && (
          <div>
            <p className="mb-4 text-sm text-[#4d515c] dark:text-[#b8c4d0]">
              Only videos with “Published” checked appear on the site. YouTube
              watch URLs work best.
            </p>
            {draft.videos.map((v, index) => (
              <div key={v.id} className="admin-card">
                <h3>Video #{v.id}</h3>
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
                  <label htmlFor={`v-pub-${v.id}`}>Published</label>
                </div>
                <div className="admin-field">
                  <label>Title</label>
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
                  <label>Description</label>
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
                  <label>Video URL (YouTube)</label>
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
                  <label>Category</label>
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
                  Remove video
                </button>
              </div>
            ))}
            <button
              type="button"
              className="rounded-md border border-[#e1e5ec] dark:border-[#2a3441] bg-[#f5f8fa] dark:bg-[#1e2835] px-4 py-2 text-sm font-semibold text-[#103152] dark:text-[#e8ecf1]"
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
              + Add video
            </button>
          </div>
        )}

        {tab === "videosPage" && (
          <div>
            <div className="admin-field">
              <label>Page title</label>
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
              <label>Intro</label>
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
              <label>Brand name</label>
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
              <label>Phone (display)</label>
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
              <label>Phone (href, digits only e.g. +38344123456)</label>
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
              <label>City line</label>
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
              <label>Address</label>
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
              <label>Email</label>
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
            <div className="admin-field">
              <label>Copyright line</label>
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
              Social URLs
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
              <h3>Book a meeting</h3>
              <div className="admin-field">
                <label>Title</label>
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
                <label>Intro</label>
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
              <h3>Nutritionists</h3>
              <div className="admin-field">
                <label>Title</label>
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
                <label>Intro</label>
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
              Consultation requests from the home page booking flow. Male
              bookings use the male specialist calendar; female use the female
              calendar when Google sync is configured.
            </p>
            <AdminBookingsTab />
          </div>
        )}

        <div className="admin-actions">
          <button type="button" className="admin-btn-primary" onClick={save}>
            Save changes
          </button>
          <button type="button" className="admin-btn-secondary" onClick={handleReset}>
            Reset to defaults
          </button>
          {savedFlash && (
            <span className="text-sm font-medium text-[#3aa57d] dark:text-[#5dcc9f]">Saved locally.</span>
          )}
          {lastRemoteSaveError && (
            <span className="max-w-xl text-sm text-[#b91c1c] dark:text-[#fca5a5]">
              Supabase sync failed: {lastRemoteSaveError}. Check that you are
              signed in (writes require authentication) and that RLS policies
              allow updates.
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

export default AdminLogin;
