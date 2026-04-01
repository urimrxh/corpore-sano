export async function sendResendEmail({ to, subject, html }) {
    const resendKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM;
  
    if (!resendKey) {
      throw new Error("Missing RESEND_API_KEY");
    }
  
    if (!from) {
      throw new Error("Missing RESEND_FROM");
    }
  
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
      }),
    });
  
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Resend failed: ${res.status} ${res.statusText} ${text}`);
    }
  
    return res.json().catch(() => null);
  }
  
  export function escapeHtml(value = "") {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
  
  export function formatAppointment(isoString) {
    if (!isoString) return "";
    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "Europe/Belgrade",
    }).format(new Date(isoString));
  }