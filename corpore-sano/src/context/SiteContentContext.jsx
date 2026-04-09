import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "../lib/supabase";
import { getSiteDefaultsForLocale, useI18n } from "./I18nContext";

const STORAGE_KEY_V1 = "corpore-sano-site-content-v1";
const STORAGE_KEY_V2 = "corpore-sano-site-content-v2";
const SITE_SETTINGS_ID = "main";
const SITE_SETTINGS_TABLE = "site_settings";

const SiteContentContext = createContext(null);

function cloneDefaults(locale) {
  return JSON.parse(JSON.stringify(getSiteDefaultsForLocale(locale)));
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

/** Deep-merge persisted site content for one locale with bundled defaults. */
function mergeSavedWithBase(saved, locale) {
  try {
    const base = cloneDefaults(locale);
    if (!saved || typeof saved !== "object") return base;
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
    return cloneDefaults(locale);
  }
}

/** @typedef {{ version?: number, locales?: Partial<Record<'sq'|'en', object>> }} StorageV2 */

function readV2Storage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_V2);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && parsed.locales) {
        return /** @type {StorageV2} */ (parsed);
      }
    }
    const v1 = localStorage.getItem(STORAGE_KEY_V1);
    if (v1) {
      const old = JSON.parse(v1);
      return {
        version: 2,
        locales: { sq: old },
      };
    }
  } catch {
    /* */
  }
  return { version: 2, locales: {} };
}

function writeV2Storage(data) {
  localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(data));
  try {
    localStorage.removeItem(STORAGE_KEY_V1);
  } catch {
    /* */
  }
}

function loadMergedFromStorage(locale) {
  try {
    const raw = readV2Storage();
    const saved = raw.locales?.[locale];
    return mergeSavedWithBase(saved, locale);
  } catch {
    return mergeSavedWithBase(null, locale);
  }
}

function isPayloadEmpty(p) {
  if (p == null) return true;
  if (typeof p !== "object") return true;
  return Object.keys(p).length === 0;
}

function canUseSupabase() {
  return Boolean(supabase);
}

/** Normalize remote payload: v2 `{ locales }` or legacy flat site object (treat as sq). */
function normalizeRemotePayload(payload) {
  if (!payload || typeof payload !== "object") {
    return { version: 2, locales: {} };
  }
  if (payload.locales && typeof payload.locales === "object") {
    return /** @type {StorageV2} */ (payload);
  }
  return { version: 2, locales: { sq: payload } };
}

export function SiteContentProvider({ children }) {
  const { locale } = useI18n();
  const [content, setContentState] = useState(() =>
    typeof window !== "undefined"
      ? loadMergedFromStorage(locale)
      : mergeSavedWithBase(null, locale),
  );
  /** Bumps when persisted site payload changes (any locale), so consumers can re-read storage. */
  const [siteContentRevision, setSiteContentRevision] = useState(0);
  const [remoteLoadError, setRemoteLoadError] = useState(null);
  const [lastRemoteSaveError, setLastRemoteSaveError] = useState(null);

  useEffect(() => {
    setContentState(loadMergedFromStorage(locale));
  }, [locale]);

  // Pull from Supabase after first paint
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

      const normalized = normalizeRemotePayload(payload);
      let local = readV2Storage();
      local = {
        version: 2,
        locales: {
          ...local.locales,
          ...normalized.locales,
        },
      };
      writeV2Storage(local);
      setContentState(loadMergedFromStorage(locale));
      setSiteContentRevision((n) => n + 1);
    }

    pull();
    return () => {
      cancelled = true;
    };
  }, []);

  const getMergedContentFor = useCallback((targetLocale) => {
    const loc = targetLocale === "en" ? "en" : "sq";
    return loadMergedFromStorage(loc);
  }, []);

  const replaceContentFor = useCallback(
    (targetLocale, full) => {
      const loc = targetLocale === "en" ? "en" : "sq";
      const uiLoc = locale === "en" ? "en" : "sq";
      const store = readV2Storage();
      store.locales = { ...store.locales, [loc]: full };
      const bFlag = full.global?.bilingualEnabled;
      const other = loc === "en" ? "sq" : "en";
      const otherSaved = store.locales[other];
      if (
        bFlag !== undefined &&
        otherSaved &&
        typeof otherSaved === "object"
      ) {
        store.locales[other] = {
          ...otherSaved,
          global: { ...otherSaved.global, bilingualEnabled: bFlag },
        };
      }
      store.version = 2;
      try {
        writeV2Storage(store);
      } catch {
        /* quota */
      }

      if (loc === uiLoc) {
        setContentState(loadMergedFromStorage(uiLoc));
      }

      setSiteContentRevision((n) => n + 1);
      setLastRemoteSaveError(null);

      if (!canUseSupabase()) return;

      void (async () => {
        const mergedRemote = {
          version: 2,
          locales: store.locales,
        };
        const { error } = await supabase.from(SITE_SETTINGS_TABLE).upsert(
          {
            id: SITE_SETTINGS_ID,
            payload: mergedRemote,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" },
        );
        if (error) {
          setLastRemoteSaveError(error.message);
        }
      })();
    },
    [locale],
  );

  const replaceContent = useCallback(
    (full) => replaceContentFor(locale === "en" ? "en" : "sq", full),
    [locale, replaceContentFor],
  );

  const resetToDefaultsFor = useCallback(
    (targetLocale) => {
      const loc = targetLocale === "en" ? "en" : "sq";
      const uiLoc = locale === "en" ? "en" : "sq";
      const fresh = mergeSavedWithBase(null, loc);
      if (loc === uiLoc) {
        setContentState(fresh);
      }
      setLastRemoteSaveError(null);
      const store = readV2Storage();
      const nextLocales = { ...store.locales };
      delete nextLocales[loc];
      store.locales = nextLocales;
      store.version = 2;
      try {
        writeV2Storage(store);
      } catch {
        /* */
      }

      setSiteContentRevision((n) => n + 1);

      if (!canUseSupabase()) return;

      void (async () => {
        const mergedRemote = {
          version: 2,
          locales: store.locales,
        };
        const { error } = await supabase.from(SITE_SETTINGS_TABLE).upsert(
          {
            id: SITE_SETTINGS_ID,
            payload: mergedRemote,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" },
        );
        if (error) {
          setLastRemoteSaveError(error.message);
        }
      })();
    },
    [locale],
  );

  const resetToDefaults = useCallback(
    () => resetToDefaultsFor(locale === "en" ? "en" : "sq"),
    [locale, resetToDefaultsFor],
  );

  /** Public sites: one toggle; canonical value lives on Albanian (`sq`) merged content. */
  const siteBilingualEnabled = useMemo(() => {
    const raw = readV2Storage();
    const merged = mergeSavedWithBase(raw.locales?.sq, "sq");
    return merged.global?.bilingualEnabled !== false;
  }, [content, siteContentRevision]);

  const value = useMemo(
    () => ({
      content,
      siteBilingualEnabled,
      siteContentRevision,
      getMergedContentFor,
      replaceContent,
      replaceContentFor,
      resetToDefaults,
      resetToDefaultsFor,
      remoteLoadError,
      lastRemoteSaveError,
    }),
    [
      content,
      siteBilingualEnabled,
      siteContentRevision,
      getMergedContentFor,
      replaceContent,
      replaceContentFor,
      resetToDefaults,
      resetToDefaultsFor,
      remoteLoadError,
      lastRemoteSaveError,
    ],
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
