import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { defaultSiteContent } from "../data/defaultSiteContent";

const STORAGE_KEY = "corpore-sano-site-content-v1";

const SiteContentContext = createContext(null);

function cloneDefaults() {
  return JSON.parse(JSON.stringify(defaultSiteContent));
}

function loadMerged() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return cloneDefaults();
    const saved = JSON.parse(raw);
    const base = cloneDefaults();
    return {
      ...base,
      ...saved,
      global: { ...base.global, ...saved.global },
      home: { ...base.home, ...saved.home },
      contact: {
        ...base.contact,
        ...saved.contact,
        form: {
          ...base.contact.form,
          ...saved.contact?.form,
          labels: {
            ...base.contact.form.labels,
            ...saved.contact?.form?.labels,
          },
        },
      },
      about: {
        ...base.about,
        ...saved.about,
        sections:
          Array.isArray(saved.about?.sections) && saved.about.sections.length > 0
            ? saved.about.sections
            : base.about.sections,
      },
      videos:
        Array.isArray(saved.videos) && saved.videos.length > 0
          ? saved.videos
          : base.videos,
      videosPage: { ...base.videosPage, ...saved.videosPage },
      footer: {
        ...base.footer,
        ...saved.footer,
        social: { ...base.footer.social, ...saved.footer?.social },
      },
      bookMeeting: { ...base.bookMeeting, ...saved.bookMeeting },
      nutritionists: { ...base.nutritionists, ...saved.nutritionists },
    };
  } catch {
    return cloneDefaults();
  }
}

export function SiteContentProvider({ children }) {
  const [content, setContentState] = useState(() =>
    typeof window !== "undefined" ? loadMerged() : cloneDefaults(),
  );

  const replaceContent = useCallback((full) => {
    setContentState(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(full));
      } catch {
        /* quota */
      }
      return full;
    });
  }, []);

  const resetToDefaults = useCallback(() => {
    const fresh = cloneDefaults();
    setContentState(fresh);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* */
    }
  }, []);

  const value = useMemo(
    () => ({ content, replaceContent, resetToDefaults }),
    [content, replaceContent, resetToDefaults],
  );

  return (
    <SiteContentContext.Provider value={value}>
      {children}
    </SiteContentContext.Provider>
  );
}

export function useSiteContent() {
  const ctx = useContext(SiteContentContext);
  if (!ctx) {
    throw new Error("useSiteContent must be used within SiteContentProvider");
  }
  return ctx;
}
