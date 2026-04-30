/**
 * POST contact form to Netlify function.
 * Set VITE_CONTACT_SUBMIT_URL to a full URL when using `vite` without `netlify dev`.
 */
export function resolveContactSubmitUrl() {
  const explicit = import.meta.env.VITE_CONTACT_SUBMIT_URL;
  if (typeof explicit === "string" && explicit.startsWith("http")) {
    return explicit;
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}/.netlify/functions/contact-submit`;
  }
  return null;
}

/**
 * @param {object} payload
 * @param {string} payload.fullName
 * @param {string} payload.email
 * @param {string} payload.subject
 * @param {string} payload.message
 * @param {'sq'|'en'} payload.locale
 * @param {string} [payload.website] honeypot — must be empty
 */
export async function submitContactForm(payload) {
  const url = resolveContactSubmitUrl();
  if (!url) {
    return { ok: false, code: "NO_URL", error: "Missing submit URL" };
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    let data = null;
    try {
      data = await res.json();
    } catch {
      /* non-JSON */
    }

    if (res.ok && data?.ok) {
      return {
        ok: true,
        saved: Boolean(data.saved),
        emailSent: Boolean(data.emailSent),
        id: data.id ?? null,
      };
    }

    return {
      ok: false,
      code: data?.code || "SERVER",
      error: data?.error || res.statusText || "Request failed",
      status: res.status,
    };
  } catch (e) {
    return {
      ok: false,
      code: "NETWORK",
      error: e?.message || "Network error",
    };
  }
}
