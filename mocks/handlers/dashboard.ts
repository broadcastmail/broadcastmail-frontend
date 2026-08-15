import { http, HttpResponse } from "msw";
import { fakeDashboard } from "../fixtures";

export const dashboardHandlers = [
  http.get("*/api/v1/account/metrics", () => {
    return HttpResponse.json(fakeDashboard());
  }),
];
