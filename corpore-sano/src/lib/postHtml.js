import DOMPurify from "dompurify";
import {
  postBodyFromContentFieldsOnly,
  postDisplayDescription,
} from "./postsApi";

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "em",
  "b",
  "i",
  "u",
  "s",
  "h2",
  "h3",
  "h4",
  "ul",
  "ol",
  "li",
  "a",
  "blockquote",
  "pre",
  "code",
  "div",
  "hr",
  "img",
  "span",
];

const ALLOWED_ATTR = [
  "href",
  "target",
  "rel",
  "src",
  "alt",
  "class",
  "title",
  "width",
  "height",
];

/**
 * Heuristic: treat as HTML only when it clearly opens a tag (avoids "3 < 5" false positives).
 * @param {unknown} value
 */
export function looksLikeHtml(value) {
  const s = String(value || "").trim();
  if (s.length < 2) return false;
  if (!/^[\s]*</.test(s)) return false;
  return />/.test(s);
}

function escapeHtmlText(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Turn plain text into safe minimal HTML (paragraphs + line breaks).
 * @param {string} text
 */
export function plainTextToSafeHtml(text) {
  const raw = String(text || "").replace(/\r\n/g, "\n").trim();
  if (!raw) return "";
  const paras = raw.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  if (paras.length === 0) return "";
  return paras
    .map((p) => `<p>${escapeHtmlText(p).replace(/\n/g, "<br/>")}</p>`)
    .join("");
}

/**
 * Strip tags for card previews and plain intro text.
 * @param {string} htmlOrText
 */
export function stripTagsToText(htmlOrText) {
  if (htmlOrText == null) return "";
  const s = String(htmlOrText);
  if (typeof document !== "undefined") {
    const d = document.createElement("div");
    d.innerHTML = s;
    const t = d.textContent || d.innerText || "";
    return t.replace(/\s+/g, " ").trim();
  }
  return s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Sanitise admin-authored HTML before dangerouslySetInnerHTML.
 * @param {string} dirty
 */
export function sanitizePostBodyHtml(dirty) {
  if (!dirty || typeof dirty !== "string") return "";
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ["target"],
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form", "input", "button"],
  });
}

/**
 * Build safe HTML for article body (content fields only).
 * @param {object} post
 * @param {'sq'|'en'} locale
 */
export function buildSanitizedBodyHtml(post, locale) {
  const raw = postBodyFromContentFieldsOnly(post, locale);
  if (!raw) return "";
  if (looksLikeHtml(raw)) {
    return sanitizePostBodyHtml(raw);
  }
  return sanitizePostBodyHtml(plainTextToSafeHtml(raw));
}

/**
 * Intro / excerpt: always plain-friendly (no raw tags in output HTML).
 * @param {object} post
 * @param {'sq'|'en'} locale
 */
export function buildSanitizedIntroHtml(post, locale) {
  const desc = postDisplayDescription(post, locale);
  if (!desc) return "";
  const raw = String(desc).trim();
  if (looksLikeHtml(raw)) {
    return sanitizePostBodyHtml(plainTextToSafeHtml(stripTagsToText(raw)));
  }
  return sanitizePostBodyHtml(plainTextToSafeHtml(raw));
}

/**
 * Plain preview for post cards (no HTML tags visible).
 * @param {object} post
 * @param {'sq'|'en'} locale
 * @param {number} [maxLen]
 */
/**
 * Collapse empty TipTap output to null before save.
 * @param {string|null|undefined} html
 */
export function normalizeStoredRichHtml(html) {
  const s = String(html || "").trim();
  if (!s) return null;
  if (typeof DOMParser === "undefined") return s;
  try {
    const doc = new DOMParser().parseFromString(s, "text/html");
    const t = (doc.body.textContent || "").trim();
    if (!t) return null;
  } catch {
    return s;
  }
  return s;
}

export function postCardPlainExcerpt(post, locale, maxLen = 220) {
  let text = stripTagsToText(postDisplayDescription(post, locale));
  if (!text) {
    const body = postBodyFromContentFieldsOnly(post, locale);
    text = body
      ? looksLikeHtml(body)
        ? stripTagsToText(body)
        : String(body).replace(/\s+/g, " ").trim()
      : "";
  }
  text = text.replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (text.length <= maxLen) return text;
  return `${text.slice(0, Math.max(0, maxLen - 1)).trimEnd()}…`;
}
