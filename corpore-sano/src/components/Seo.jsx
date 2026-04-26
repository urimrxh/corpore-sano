import { Helmet } from "react-helmet-async";

/** @type {string} */
export const SITE_NAME = "Corpore Sano";
/** @type {string} */
export const SITE_URL = "https://corporesano-ks.com";

// Default share image: stable public asset. TODO: Add public/og-image.jpg at 1200×630 for proper Open Graph cropping/aspect ratio, then point defaults here to "/og-image.jpg".
const DEFAULT_OG_IMAGE_PATH = "/logo.png";
const DEFAULT_TYPE = "website";

/**
 * @param {string} siteUrl
 * @param {string} [pathOrAbsolute]
 */
function toAbsoluteUrl(siteUrl, pathOrAbsolute) {
  if (!pathOrAbsolute) {
    return `${siteUrl.replace(/\/$/, "")}${DEFAULT_OG_IMAGE_PATH}`;
  }
  if (/^https?:\/\//i.test(pathOrAbsolute)) {
    return pathOrAbsolute;
  }
  const path = pathOrAbsolute.startsWith("/") ? pathOrAbsolute : `/${pathOrAbsolute}`;
  return `${siteUrl.replace(/\/$/, "")}${path}`;
}

/**
 * @param {string} siteUrl
 * @param {string} path
 */
function toCanonicalUrl(siteUrl, path) {
  const base = siteUrl.replace(/\/$/, "");
  const raw = path.startsWith("/") ? path : `/${path}`;
  if (raw === "/") return `${base}/`;
  return `${base}${raw.replace(/\/+$/, "")}`;
}

/** Resolve a path or absolute URL to an absolute URL (for JSON-LD, og:image from CMS). */
export function resolveAbsoluteUrl(pathOrAbsolute) {
  if (pathOrAbsolute == null || pathOrAbsolute === "") return "";
  const s = String(pathOrAbsolute);
  if (/^https?:\/\//i.test(s)) return s;
  const path = s.startsWith("/") ? s : `/${s}`;
  return `${SITE_URL.replace(/\/$/, "")}${path}`;
}

/**
 * @param {object} props
 * @param {string} props.title
 * @param {string} props.description
 * @param {string} props.path - site path, e.g. `/about`
 * @param {string} [props.image] - absolute URL or path starting with /
 * @param {string} [props.type]
 * @param {boolean} [props.noindex]
 * @param {object|object[]} [props.jsonLd]
 */
export default function Seo({
  title,
  description,
  path,
  image,
  type = DEFAULT_TYPE,
  noindex,
  jsonLd,
}) {
  const canonical = toCanonicalUrl(SITE_URL, path ?? "/");
  const ogImage = toAbsoluteUrl(SITE_URL, image ?? DEFAULT_OG_IMAGE_PATH);
  const ogUrl = canonical;

  const ldBlocks = jsonLd
    ? Array.isArray(jsonLd)
      ? jsonLd
      : [jsonLd]
    : [];

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />

      {noindex ? <meta name="robots" content="noindex, nofollow" /> : null}

      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={ogUrl} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content={SITE_NAME} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {ldBlocks.map((block, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(block)}
        </script>
      ))}
    </Helmet>
  );
}
