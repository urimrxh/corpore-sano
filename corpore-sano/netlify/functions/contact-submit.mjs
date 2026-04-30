/**
 * Contact form: validate, honeypot, store in Supabase, notify admins via Resend.
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *      RESEND_API_KEY, RESEND_FROM,
 *      CONTACT_RECIPIENT_EMAILS (comma- or semicolon-separated)
 */
import { createClient } from "@supabase/supabase-js";
import { sendResendEmail, escapeHtml } from "./lib/resendEmail.mjs";

const MAX_NAME = 200;
const MAX_EMAIL = 320;
const MAX_SUBJECT = 300;
const MAX_MESSAGE = 12000;

const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body),
  };
}

function trimStr(v, max) {
  const s = typeof v === "string" ? v.trim() : "";
  if (s.length > max) return null;
  return s;
}

function isValidEmail(email) {
  if (!email || email.length > MAX_EMAIL) return false;
  // Practical check — not full RFC
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function parseRecipientEmails(raw) {
  if (!raw || typeof raw !== "string") return [];
  return [
    ...new Set(
      raw
        .split(/[,;]/)
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
}

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return json(405, { ok: false, error: "Method not allowed", code: "METHOD" });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { ok: false, error: "Invalid JSON", code: "BAD_JSON" });
  }

  const honeypot = trimStr(body.website ?? body.company, 500) || "";
  if (honeypot.length > 0) {
    return json(200, { ok: true, saved: true, emailSent: true });
  }

  const fullName = trimStr(body.fullName ?? body.full_name, MAX_NAME);
  const email = trimStr(body.email, MAX_EMAIL);
  const subject = trimStr(body.subject, MAX_SUBJECT);
  const message = trimStr(body.message, MAX_MESSAGE);
  const locale = body.locale === "en" ? "en" : "sq";

  if (!fullName || !fullName.length) {
    return json(400, {
      ok: false,
      error: "Full name is required",
      code: "VALIDATION",
    });
  }
  if (!email || !isValidEmail(email)) {
    return json(400, {
      ok: false,
      error: "A valid email is required",
      code: "VALIDATION",
    });
  }
  if (!subject || !subject.length) {
    return json(400, {
      ok: false,
      error: "Subject is required",
      code: "VALIDATION",
    });
  }
  if (!message || !message.length) {
    return json(400, {
      ok: false,
      error: "Message is required",
      code: "VALIDATION",
    });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error("contact-submit: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return json(500, {
      ok: false,
      error: "Server configuration error",
      code: "CONFIG",
    });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: inserted, error: insertErr } = await supabase
    .from("contact_messages")
    .insert({
      full_name: fullName,
      email,
      subject,
      message,
      locale,
    })
    .select("id")
    .single();

  if (insertErr) {
    console.error("contact-submit: insert failed", insertErr.message);
    return json(500, {
      ok: false,
      error: "Could not save your message",
      code: "STORE",
    });
  }

  const recipients = parseRecipientEmails(process.env.CONTACT_RECIPIENT_EMAILS);
  let emailSent = false;

  if (recipients.length === 0) {
    console.warn(
      "contact-submit: CONTACT_RECIPIENT_EMAILS empty — message saved, no email",
    );
  } else {
    const resendKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM;

    if (!resendKey || !from) {
      console.warn(
        "contact-submit: RESEND_API_KEY or RESEND_FROM missing — message saved, no email",
      );
    } else {
      const adminSubject = `[Corpore Sano Contact] ${subject}`;
      const html = `<!doctype html>
<html><head><meta charset="UTF-8"/></head>
<body style="font-family:Arial,sans-serif;line-height:1.5;color:#111827;">
  <h2 style="margin:0 0 16px;">New contact form message</h2>
  <table style="border-collapse:collapse;max-width:640px;">
    <tr><td style="padding:6px 12px 6px 0;vertical-align:top;font-weight:600;">Name</td><td style="padding:6px 0;">${escapeHtml(fullName)}</td></tr>
    <tr><td style="padding:6px 12px 6px 0;vertical-align:top;font-weight:600;">Email</td><td style="padding:6px 0;"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
    <tr><td style="padding:6px 12px 6px 0;vertical-align:top;font-weight:600;">Locale</td><td style="padding:6px 0;">${escapeHtml(locale)}</td></tr>
    <tr><td style="padding:6px 12px 6px 0;vertical-align:top;font-weight:600;">Subject</td><td style="padding:6px 0;">${escapeHtml(subject)}</td></tr>
  </table>
  <p style="margin:16px 0 8px;font-weight:600;">Message</p>
  <pre style="white-space:pre-wrap;background:#f9fafb;padding:12px;border-radius:8px;border:1px solid #e5e7eb;margin:0;">${escapeHtml(message)}</pre>
  <p style="margin-top:24px;font-size:12px;color:#6b7280;">Message id: ${escapeHtml(String(inserted?.id || ""))}</p>
</body></html>`;

      const text = `New contact form message

Name: ${fullName}
Email: ${email}
Locale: ${locale}
Subject: ${subject}

Message:
${message}

Message id: ${inserted?.id || ""}`;

      try {
        await sendResendEmail({
          to: recipients,
          subject: adminSubject,
          html,
          text,
          replyTo: email,
        });
        emailSent = true;
      } catch (err) {
        console.error("contact-submit: Resend failed", err?.message || err);
      }
    }
  }

  return json(200, {
    ok: true,
    saved: true,
    emailSent,
    id: inserted?.id ?? null,
  });
};
