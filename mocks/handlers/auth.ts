import { http, HttpResponse } from "msw";

// Mirrors the real backend's httpOnly session cookie (apiClient uses
// withCredentials: true): a cookie decides auth state, same as production.
// Inverted from a real session cookie for dev convenience — you start
// authenticated with no setup, and *signing out* is what sets a cookie —
// so a cold load never needs a client-side seed step to show the dashboard.
export const SIGNED_OUT_COOKIE = "bm_mock_signed_out";

function isSignedOut(request: Request): boolean {
  const cookie = request.headers.get("cookie") ?? "";
  return cookie
    .split(";")
    .some((c) => c.trim().startsWith(`${SIGNED_OUT_COOKIE}=`));
}

export const authHandlers = [
  http.get("*/api/v1/me", ({ request }) => {
    if (isSignedOut(request)) {
      return new HttpResponse(null, { status: 401 });
    }
    return HttpResponse.json({
      email: "laki@raisepine.com",
      plan: "free",
      connectionName: "my-saas-app",
    });
  }),

  http.post("*/api/v1/auth/logout", () => {
    // Set-Cookie response headers are stripped by the Fetch API spec even
    // from mocked responses, so set it directly (browser-only; the Node SSR
    // mock never sets cookies itself, it just reads what the browser sent).
    if (typeof document !== "undefined") {
      document.cookie = `${SIGNED_OUT_COOKIE}=1; Path=/`;
    }
    return new HttpResponse(null, { status: 204 });
  }),

  http.post("*/api/v1/auth/login", () => {
    if (typeof document !== "undefined") {
      document.cookie = `${SIGNED_OUT_COOKIE}=; Path=/; Max-Age=0`;
    }
    return new HttpResponse(null, { status: 204 });
  }),
];
