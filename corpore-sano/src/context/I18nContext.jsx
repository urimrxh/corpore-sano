import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { enUS } from "date-fns/locale";
import { sq } from "date-fns/locale";

import enMessages from "../locales/en.json";
import sqMessages from "../locales/sq.json";

const STORAGE_KEY = "corpore-sano-locale-v1";

/** @typedef {'sq' | 'en'} AppLocale */

const MESSAGES = {
  sq: sqMessages,
  en: enMessages,
};


const I18nContext = createContext(null);

function getByPath(obj, path) {
  if (!obj || !path) return undefined;
  return path.split(".").reduce((o, key) => (o == null ? o : o[key]), obj);
}

export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState(() => {
    if (typeof window === "undefined") return "sq";
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "en" || stored === "sq") return stored;
    } catch {
      /* */
    }
    return "sq";
  });

  const setLocale = useCallback((next) => {
    const v = next === "en" ? "en" : "sq";
    setLocaleState(v);
    try {
      localStorage.setItem(STORAGE_KEY, v);
    } catch {
      /* */
    }
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = locale === "en" ? "en" : "sq";
  }, [locale]);

  const messages = MESSAGES[locale] || MESSAGES.sq;

  const t = useCallback(
    (path, vars) => {
      let s = getByPath(messages.ui, path);
      if (s == null) s = path;
      if (vars && typeof s === "string") {
        for (const [k, val] of Object.entries(vars)) {
          s = s.replaceAll(`{${k}}`, String(val));
        }
      }
      return s;
    },
    [messages],
  );

  const intlLocaleTag = locale === "en" ? "en-GB" : "sq-AL";

  const dayPickerLocale = locale === "en" ? enUS : sq;

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
      intlLocaleTag,
      dayPickerLocale,
      messages,
    }),
    [locale, setLocale, t, intlLocaleTag, dayPickerLocale, messages],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return ctx;
}

export function getSiteDefaultsForLocale(/** @type {AppLocale} */ loc) {
  const pack = MESSAGES[loc] || MESSAGES.sq;
  return JSON.parse(JSON.stringify(pack.site));
}
