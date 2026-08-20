// Shared mock-session state, analogous to the real backend's CookieService.
// One source of truth so auth.ts / oauth.ts / onboarding.ts all agree on
// cookie names instead of each hand-rolling their own.

export const SESSION_COOKIE = "bm_session";
export const ONBOARDING_COOKIE = "bm_onboarding_session";
// Mock-only stand-in for "an account row exists in our DB for this Supabase
// identity" — the real backend knows this from its database; we fake it
// with a long-lived cookie set once onboarding completes, so a second
// "Connect Supabase" click later in dev is treated as a ReturningUser
// instead of walking through onboarding again.
export const HAS_ACCOUNT_COOKIE = "bm_mock_has_account";

// Mock-only stand-ins for the onboarding session's server-side state
// (session.schemaDetails / session.resendDetails in the real backend). The
// real session lives in a DB row keyed by the onboarding cookie; here it's
// spread across a few cookies so each MSW handler (stateless per request)
// can agree on where the user is in the wizard.
export const ONBOARDING_PROJECT_COOKIE = "bm_mock_project_ref";
export const ONBOARDING_SCHEMA_COOKIE = "bm_mock_schema_confirmed";
export const ONBOARDING_RESEND_COOKIE = "bm_mock_resend_from";

function cookieHeader(request: Request): string {
  // Browsers strip the Cookie header from Request objects exposed to
  // Service Worker fetch handlers entirely (same security-driven stripping
  // as Set-Cookie on the response side) — request.headers.get("cookie") is
  // always empty for a genuine browser fetch()/XHR call, even though the
  // real cookie exists. document.cookie is the only reliable read there.
  // In Node (SSR) there's no document, so fall back to the header, which
  // apiClient callers set explicitly (see lib/api/server-cookies.ts).
  if (typeof document !== "undefined") {
    return document.cookie;
  }
  return request.headers.get("cookie") ?? "";
}

export function hasCookie(request: Request, name: string): boolean {
  return cookieHeader(request)
    .split(";")
    .some((c) => c.trim().startsWith(`${name}=`));
}

export function getCookie(request: Request, name: string): string | null {
  const match = cookieHeader(request)
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

/**
 * MSW's browser handlers execute in the page's JS context (the Service
 * Worker forwards intercepted requests to the page via postMessage), so
 * `document` is available there — this is the reliable way to set cookies
 * from a mock: real Set-Cookie response headers are stripped per the Fetch
 * spec even for SW-served responses. No-ops in the Node SSR mock, which
 * never sets cookies itself — it only ever reads what the browser sent.
 */
export function setCookie(name: string, value: string, maxAgeSeconds?: number) {
  if (typeof document === "undefined") return;
  const maxAge = maxAgeSeconds !== undefined ? `; Max-Age=${maxAgeSeconds}` : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/${maxAge}`;
}

export function clearCookie(name: string) {
  setCookie(name, "", 0);
}
