import { http, HttpResponse } from "msw";

export const billingHandlers = [
  http.post("*/api/v1/billing/checkout", () => {
    return HttpResponse.json({ url: "/billing?upgraded=true" });
  }),

  http.post("*/api/v1/billing/portal", () => {
    return HttpResponse.json({ url: "/billing" });
  }),
];
