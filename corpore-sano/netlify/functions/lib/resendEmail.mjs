const BRAND = {
  name: process.env.EMAIL_BRAND_NAME || "Corpore Sano",
  website: process.env.EMAIL_WEBSITE_URL || "https://corporesano-ks.com",
  contactEmail: process.env.EMAIL_CONTACT_EMAIL || "info@corporesano-ks.com",
  address: process.env.EMAIL_CONTACT_ADDRESS || "Prishtinë, Kosova",
  logoUrl: process.env.EMAIL_LOGO_URL || "https://corporesano-ks.com/logo.png",
  replyTo:
    process.env.RESEND_REPLY_TO ||
    process.env.EMAIL_CONTACT_EMAIL ||
    "info@corporesano-ks.com",
};

const RESEND_API_URL = "https://api.resend.com/emails";
const RESEND_TIMEOUT_MS = 15000;

function normalizeEmailList(value) {
  return [
    ...new Set(
      (Array.isArray(value) ? value : [value])
        .flatMap((entry) => String(entry || "").split(","))
        .map((email) => email.trim())
        .filter(Boolean),
    ),
  ];
}

export async function sendResendEmail({
  to,
  subject,
  html,
  text,
  cc,
  bcc,
  replyTo,
}) {
  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  const recipients = normalizeEmailList(to);
  const ccRecipients = normalizeEmailList(cc);
  const bccRecipients = normalizeEmailList(bcc);
  const replyToRecipient =
    normalizeEmailList(replyTo || BRAND.replyTo)[0] || undefined;
  const safeSubject = String(subject || "").trim();

  if (!resendKey) {
    throw new Error("Missing RESEND_API_KEY");
  }

  if (!from) {
    throw new Error("Missing RESEND_FROM");
  }

  if (!recipients.length) {
    throw new Error("sendResendEmail: missing recipient email");
  }

  if (!safeSubject) {
    throw new Error("sendResendEmail: missing email subject");
  }

  if (!html && !text) {
    throw new Error("sendResendEmail: either html or text content is required");
  }

  const payload = {
    from,
    to: recipients,
    subject: safeSubject,
  };

  if (html) payload.html = html;
  if (text) payload.text = text;
  if (replyToRecipient) payload.reply_to = replyToRecipient;
  if (ccRecipients.length) payload.cc = ccRecipients;
  if (bccRecipients.length) payload.bcc = bccRecipients;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), RESEND_TIMEOUT_MS);

  let res;

  try {
    res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err) {
    if (err?.name === "AbortError") {
      throw new Error(`Resend request timed out after ${RESEND_TIMEOUT_MS}ms`);
    }

    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  const rawBody = await res.text();
  let parsedBody = null;

  try {
    parsedBody = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    parsedBody = null;
  }

  if (!res.ok) {
    throw new Error(
      `Resend failed: ${res.status} ${res.statusText} ${rawBody}`,
    );
  }

  console.log(
    "sendResendEmail: message accepted by Resend",
    JSON.stringify({
      to: recipients,
      cc: ccRecipients,
      bcc: bccRecipients,
      subject: safeSubject,
      resendId: parsedBody?.id || parsedBody?.data?.id || null,
    }),
  );

  return parsedBody;
}

export function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function formatAppointment(isoString) {
  if (!isoString) return "";

  const date = new Date(isoString);

  if (Number.isNaN(date.getTime())) {
    return String(isoString);
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Europe/Belgrade",
  }).format(date);
}

export function emailButton(label, url, background = "#2563eb") {
  const safeLabel = escapeHtml(label);
  const safeUrl = escapeHtml(url);

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px 0;">
      <tr>
        <td align="center" bgcolor="${background}" style="border-radius:10px;">
          <a
            href="${safeUrl}"
            style="display:inline-block;padding:14px 22px;font-size:15px;line-height:20px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;"
          >
            ${safeLabel}
          </a>
        </td>
      </tr>
    </table>
  `;
}

export function renderBilingualEmail({
  preheader = "",
  title = "",
  albanianHtml = "",
  englishHtml = "",
  footerNote = "You received this email because an appointment-related action was requested on the Corpore Sano website.",
}) {
  const safePreheader = escapeHtml(preheader);
  const safeTitle = escapeHtml(title || BRAND.name);
  const safeBrandName = escapeHtml(BRAND.name);
  const safeWebsite = escapeHtml(BRAND.website);
  const safeContactEmail = escapeHtml(BRAND.contactEmail);
  const safeAddress = escapeHtml(BRAND.address);
  const safeLogoUrl = escapeHtml(BRAND.logoUrl);
  const safeFooterNote = escapeHtml(footerNote);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${safeTitle}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">
      ${safePreheader}
    </div>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f4f7fb;margin:0;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr>
              <td style="padding:28px 28px 18px 28px;text-align:center;background-color:#ffffff;">
                ${
                  BRAND.logoUrl
                    ? `<img src="${safeLogoUrl}" alt="${safeBrandName}" width="96" style="display:block;margin:0 auto 14px auto;max-width:96px;height:auto;border:0;" />`
                    : ""
                }
                <div style="font-size:24px;line-height:32px;font-weight:700;color:#111827;margin-bottom:4px;">
                  ${safeBrandName}
                </div>
                <div style="font-size:14px;line-height:22px;color:#6b7280;">
                  Nutrition & wellbeing
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:8px 28px 32px 28px;">
                <div style="font-size:16px;line-height:28px;color:#111827;">
                  ${albanianHtml}
                </div>

                <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0;" />

                <div style="font-size:16px;line-height:28px;color:#111827;">
                  <p style="margin:0 0 16px 0;"><strong>English</strong></p>
                  ${englishHtml}
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:22px 28px;background-color:#f9fafb;border-top:1px solid #e5e7eb;">
                <div style="font-size:13px;line-height:22px;color:#4b5563;font-weight:700;margin-bottom:8px;">
                  ${safeBrandName}
                </div>
                <div style="font-size:13px;line-height:22px;color:#6b7280;">
                  Email:
                  <a href="mailto:${safeContactEmail}" style="color:#2563eb;text-decoration:none;">${safeContactEmail}</a>
                </div>
                <div style="font-size:13px;line-height:22px;color:#6b7280;">
                  Address: ${safeAddress}
                </div>
                <div style="font-size:13px;line-height:22px;color:#6b7280;">
                  Website:
                  <a href="${safeWebsite}" style="color:#2563eb;text-decoration:none;">${safeWebsite}</a>
                </div>

                <div style="margin-top:14px;font-size:12px;line-height:20px;color:#9ca3af;">
                  ${safeFooterNote}
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function buildBilingualText({
  albanian = "",
  english = "",
  footerNote = "You received this email because an appointment-related action was requested on the Corpore Sano website.",
}) {
  return `${albanian}

----------------------------------------

${english}

${footerNote}

${BRAND.name}
Email: ${BRAND.contactEmail}
Address: ${BRAND.address}
Website: ${BRAND.website}`;
}