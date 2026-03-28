import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { defaultSiteContent } from "../data/defaultSiteContent";
import { supabase } from "../lib/supabase";

const STORAGE_KEY = "corpore-sano-site-content-v1";
const SITE_SETTINGS_ID = "main";
const SITE_SETTINGS_TABLE = "site_settings";

const SiteContentContext = createContext(null);

function cloneDefaults() {
  return JSON.parse(JSON.stringify(defaultSiteContent));
}

/** Merge saved about sections with base defaults; legacy global `textPanelTheme` fills missing per-section values. */
function mergeAboutSections(baseAbout, savedAbout) {
  const legacyGlobalTheme = savedAbout?.textPanelTheme;
  const baseSections = baseAbout.sections;
  const savedSections = savedAbout?.sections;
  if (!Array.isArray(savedSections) || savedSections.length === 0) {
    return baseSections;
  }
  return savedSections.map((sec, i) => ({
    ...(baseSections[i] || {}),
    ...sec,
    textPanelTheme:
      sec.textPanelTheme ??
      legacyGlobalTheme ??
      baseSections[i]?.textPanelTheme ??
      "grey",
  }));
}

/** Deep-merge persisted site content with bundled defaults (localStorage or Supabase payload). */
function mergeSavedWithBase(saved) {
  try {
    if (!saved || typeof saved !== "object") return cloneDefaults();
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
        sections: mergeAboutSections(base.about, saved.about),
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

function loadMergedFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return cloneDefaults();
    const saved = JSON.parse(raw);
    return mergeSavedWithBase(saved);
  } catch {
    return cloneDefaults();
  }
}

function isPayloadEmpty(p) {
  if (p == null) return true;
  if (typeof p !== "object") return true;
  return Object.keys(p).length === 0;
}

function canUseSupabase() {
  return Boolean(
    import.meta.env.VITE_SUPABASE_URL &&
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY &&
      supabase,
  );
}

export function SiteContentProvider({ children }) {
  const [content, setContentState] = useState(() =>
    typeof window !== "undefined" ? loadMergedFromStorage() : cloneDefaults(),
  );
  const [remoteLoadError, setRemoteLoadError] = useState(null);
  const [lastRemoteSaveError, setLastRemoteSaveError] = useState(null);

  // Pull from Supabase after first paint; if DB payload is still {}, keep localStorage merge.
  useEffect(() => {
    if (!canUseSupabase()) return;

    let cancelled = false;

    async function pull() {
      setRemoteLoadError(null);
      const { data, error } = await supabase
        .from(SITE_SETTINGS_TABLE)
        .select("payload")
        .eq("id", SITE_SETTINGS_ID)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        setRemoteLoadError(error.message);
        return;
      }

      const payload = data?.payload;
      if (isPayloadEmpty(payload)) {
        return;
      }

      const merged = mergeSavedWithBase(payload);
      setContentState(merged);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      } catch {
        /* quota */
      }
    }

    pull();
    return () => {
      cancelled = true;
    };
  }, []);

  const replaceContent = useCallback((full) => {
    setContentState(full);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(full));
    } catch {
      /* quota */
    }

    setLastRemoteSaveError(null);

    if (!canUseSupabase()) return;

    void (async () => {
      const { error } = await supabase.from(SITE_SETTINGS_TABLE).upsert(
        {
          id: SITE_SETTINGS_ID,
          payload: full,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );
      if (error) {
        setLastRemoteSaveError(error.message);
      }
    })();
  }, []);

  const resetToDefaults = useCallback(() => {
    const fresh = cloneDefaults();
    setContentState(fresh);
    setLastRemoteSaveError(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* */
    }

    if (!canUseSupabase()) return;

    void (async () => {
      const { error } = await supabase.from(SITE_SETTINGS_TABLE).upsert(
        {
          id: SITE_SETTINGS_ID,
          payload: fresh,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );
      if (error) {
        setLastRemoteSaveError(error.message);
      }
    })();
  }, []);

  const value = useMemo(
    () => ({
      content,
      replaceContent,
      resetToDefaults,
      remoteLoadError,
      lastRemoteSaveError,
    }),
    [content, replaceContent, resetToDefaults, remoteLoadError, lastRemoteSaveError],
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
