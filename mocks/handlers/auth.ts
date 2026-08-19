import { http, HttpResponse } from "msw";
import { SESSION_COOKIE, hasCookie, clearCookie } from "../session";

// Cookie presence = authenticated, same as the real httpOnly session cookie
// (apiClient uses withCredentials: true). No auto-login here anymore — now
// that /api/v1/oauth/supabase/authorize actually sets SESSION_COOKIE, "am I
// logged in" is a real question you answer by going through that flow (see
// the "Connect Supabase" button), not a dev-convenience default.
export const authHandlers = [
  http.get("*/api/v1/me", ({ request }) => {
    if (!hasCookie(request, SESSION_COOKIE)) {
      return new HttpResponse(null, { status: 401 });
    }
    return HttpResponse.json({
      email: "laki@raisepine.com",
      plan: "free",
      connectionName: "my-saas-app",
    });
  }),

  http.post("*/api/v1/auth/logout", () => {
    clearCookie(SESSION_COOKIE);
    return new HttpResponse(null, { status: 204 });
  }),
];
