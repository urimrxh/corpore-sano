/**
 * Absolute origin for calling other Netlify functions from a function (fetch needs https URL).
 * URL is set on production; fallbacks help branch deploys / edge cases.
 */
export function getDeploySiteOrigin() {
  const raw =
    process.env.URL ||
    process.env.DEPLOY_PRIME_URL ||
    process.env.DEPLOY_URL ||
    "";
  const s = String(raw).trim().replace(/\/$/, "");
  if (!s.startsWith("http")) {
    return "";
  }
  return s;
}

export function createCalendarEventFunctionUrl() {
  const origin = getDeploySiteOrigin();
  if (!origin) return "";
  return `${origin}/.netlify/functions/create-calendar-event`;
}
