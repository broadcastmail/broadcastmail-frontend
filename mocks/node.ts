import { setupServer } from "msw/node";
import { dashboardHandlers } from "./handlers/dashboard";
import { campaignHandlers } from "./handlers/campaigns";
import { authHandlers } from "./handlers/auth";

export const server = setupServer(
  ...authHandlers,
  ...dashboardHandlers,
  ...campaignHandlers,
);
