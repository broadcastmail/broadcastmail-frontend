import { setupWorker } from "msw/browser";
import { dashboardHandlers } from "./handlers/dashboard";
import { campaignHandlers } from "./handlers/campaigns";
import { authHandlers } from "./handlers/auth";

export const worker = setupWorker(
  ...authHandlers,
  ...dashboardHandlers,
  ...campaignHandlers,
);
