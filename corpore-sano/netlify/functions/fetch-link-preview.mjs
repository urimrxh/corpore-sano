function decodeHtmlEntities(value) {
  if (!value) return "";
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function extractMetaContent(html, key, attr = "property") {
  const regex = new RegExp(
    `<meta[^>]*${attr}=["']${key}["'][^>]*content=["']([^"']+)["'][^>]*>`,
    "i",
  );
  const altRegex = new RegExp(
    `<meta[^>]*content=["']([^"']+)["'][^>]*${attr}=["']${key}["'][^>]*>`,
    "i",
  );
  const match = html.match(regex) || html.match(altRegex);
  return decodeHtmlEntities(match?.[1]?.trim() || "");
}

function extractTitle(html) {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return decodeHtmlEntities(titleMatch?.[1]?.trim() || "");
}

function absoluteUrl(candidate, sourceUrl) {
  if (!candidate) return "";
  try {
    return new URL(candidate, sourceUrl).toString();
  } catch {
    return "";
  }
}

export const handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  const rawUrl = event.queryStringParameters?.url || "";
  const url = rawUrl.trim();
  if (!url) {
    return { statusCode: 400, body: JSON.stringify({ error: "url required" }) };
  }

  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return { statusCode: 400, body: JSON.stringify({ error: "Invalid url protocol" }) };
    }
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid url" }) };
  }

  try {
    const response = await fetch(url, {
      redirect: "follow",
      headers: {
        "user-agent": "CorporeSanoPreviewBot/1.0",
        accept: "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) {
      return {
        statusCode: 502,
        body: JSON.stringify({ error: `Preview fetch failed (${response.status})` }),
      };
    }

    const html = await response.text();
    const title =
      extractMetaContent(html, "og:title") ||
      extractMetaContent(html, "twitter:title", "name") ||
      extractTitle(html);
    const description =
      extractMetaContent(html, "og:description") ||
      extractMetaContent(html, "twitter:description", "name") ||
      extractMetaContent(html, "description", "name");
    const image = absoluteUrl(
      extractMetaContent(html, "og:image") ||
        extractMetaContent(html, "twitter:image", "name"),
      url,
    );

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, image }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: error?.message || "Could not fetch preview" }),
    };
  }
};
