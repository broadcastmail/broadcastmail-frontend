import { http, HttpResponse } from "msw";
import { fakeDashboard } from "../fixtures";
import { ONBOARDING_RESEND_COOKIE, getCookie } from "../session";

export const dashboardHandlers = [
  http.get("*/api/v1/account/metrics", () => {
    return HttpResponse.json(fakeDashboard());
  }),

  // Backs the Settings page's "Email provider" section. Reads the same
  // ONBOARDING_RESEND_COOKIE the onboarding wizard's own step sets — and
  // that Settings' reconfigure dialog re-sets via the same
  // POST /api/v1/onboarding/email-provider — so both paths agree on one
  // value. Genuinely null (not a demo-data fallback) for an account that
  // never touched either, so Settings can show "Not configured" honestly
  // instead of a fake connected-looking address.
  http.get("*/api/v1/account/email-provider", ({ request }) => {
    const fromAddress = getCookie(request, ONBOARDING_RESEND_COOKIE);
    return HttpResponse.json({ fromAddress });
  }),
];
