import en from "../locales/en.json";

function getByPath(obj, path) {
  if (!obj || !path) return undefined;
  return path.split(".").reduce((o, key) => (o == null ? o : o[key]), obj);
}

/**
 * English-only strings for the admin UI (independent of the site visitor language).
 * Pass paths under `en.json` → `ui`, e.g. `adminT("adminLogin.pageTitle")`.
 */
export function adminT(path, vars) {
  let s = getByPath(en.ui, path);
  if (s == null) s = path;
  if (vars && typeof s === "string") {
    for (const [k, val] of Object.entries(vars)) {
      s = s.replaceAll(`{${k}}`, String(val));
    }
  }
  return s;
}

/** Date/time formatting in admin tables (always English locale). */
export const ADMIN_INTL_LOCALE_TAG = "en-GB";
