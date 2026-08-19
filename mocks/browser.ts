import { setupWorker } from "msw/browser";
import { dashboardHandlers } from "./handlers/dashboard";
import { campaignHandlers } from "./handlers/campaigns";
import { authHandlers } from "./handlers/auth";
import { onboardingHandlers } from "./handlers/onboarding";
import { oauthHandlers } from "./handlers/oauth";

export const worker = setupWorker(
  ...authHandlers,
  ...dashboardHandlers,
  ...campaignHandlers,
  ...onboardingHandlers,
  ...oauthHandlers,
);
