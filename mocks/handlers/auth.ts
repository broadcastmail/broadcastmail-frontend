import { http, HttpResponse } from "msw";
import {
  SESSION_COOKIE,
  ONBOARDING_PROJECT_COOKIE,
  PLAN_COOKIE,
  hasCookie,
  getCookie,
  clearCookie,
} from "../session";

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
    // ?plan=pro is a dev-only test hook (same idea as oauth.ts's
    // ?projects=multi) — there's no real upgrade flow yet to drive the Pro
    // variant of Settings/Billing, so this is how you preview it locally.
    // PLAN_COOKIE is the same hook, just settable without hand-editing a
    // URL — what mocks/scenarios.ts uses. The query param wins when both
    // are present, since it's the more deliberate, one-off override.
    const url = new URL(request.url);
    const plan =
      url.searchParams.get("plan") === "pro" ||
      (!url.searchParams.has("plan") && getCookie(request, PLAN_COOKIE) === "pro")
        ? "pro"
        : "free";
    // The real project connection, not a hardcoded stand-in — reflects
    // whatever Settings' "Reconfigure connection" flow (or onboarding
    // itself) last set, so a genuinely disconnected account shows that
    // instead of a fake default (see mocks/handlers/onboarding.ts's
    // currentSchema for the same "null, not a fallback" treatment).
    const connectionName = getCookie(request, ONBOARDING_PROJECT_COOKIE);
    return HttpResponse.json({
      email: "laki@raisepine.com",
      plan,
      connectionName,
    });
  }),

  http.post("*/api/v1/auth/logout", () => {
    clearCookie(SESSION_COOKIE);
    return new HttpResponse(null, { status: 204 });
  }),
];
