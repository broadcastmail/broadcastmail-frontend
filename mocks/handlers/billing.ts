import {http, HttpResponse} from "msw";
import {getCookie, PLAN_COOKIE, setCookie} from "@/mocks/session";

const MOCK_SESSION_ID = "mock_session_dev";

export const billingHandlers = [
  http.post("*/api/v1/billing/checkout", () => {
    setCookie(PLAN_COOKIE, "pro");
    return HttpResponse.json({ url: `/billing/success?session_id=${MOCK_SESSION_ID}` });
  }),

  http.post("*/api/v1/billing/portal", () => {
    return HttpResponse.json({ url: "/billing?from=portal" });
  }),

  http.get("*/api/v1/billing/subscription", ({ request }) => {
    const planCookie = getCookie(request, PLAN_COOKIE);
    const isPro = planCookie === "pro" || planCookie === "canceling";
    if (!isPro) {
      return HttpResponse.json({ currentPeriodEnd: null, cancelAtPeriodEnd: false });
    }
    return HttpResponse.json({
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      cancelAtPeriodEnd: planCookie === "canceling",
    });
  }),
];
