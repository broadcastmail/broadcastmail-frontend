import { setupWorker } from "msw/browser";
import { dashboardHandlers } from "./handlers/dashboard";
import { campaignHandlers } from "./handlers/campaigns";
import { authHandlers } from "./handlers/auth";
import { onboardingHandlers } from "./handlers/onboarding";
import { oauthHandlers } from "./handlers/oauth";
import { connectionHandlers } from "./handlers/connections";
import { billingHandlers } from "./handlers/billing";

export const worker = setupWorker(
  ...authHandlers,
  ...dashboardHandlers,
  ...campaignHandlers,
  ...onboardingHandlers,
  ...oauthHandlers,
  ...connectionHandlers,
  ...billingHandlers,
);
