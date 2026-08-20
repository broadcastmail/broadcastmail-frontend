import { http, HttpResponse } from "msw";
import {
  SESSION_COOKIE,
  ONBOARDING_COOKIE,
  HAS_ACCOUNT_COOKIE,
  ONBOARDING_PROJECT_COOKIE,
  ONBOARDING_SCHEMA_COOKIE,
  ONBOARDING_RESEND_COOKIE,
  hasCookie,
  setCookie,
} from "../session";

// Mirrors OAuthSupabaseController's three-way callback result. The real
// flow is: authorize -> redirect to Supabase -> user approves -> Supabase
// redirects to our callback with ?code&state. We can't hit a real Supabase
// consent screen locally, so /authorize here short-circuits straight to
// the outcome the real /callback would produce, skipping the external hop.
//
// Which of the three outcomes you get is driven by mock state, same as it
// would be by your account data in the real DB:
//   - HAS_ACCOUNT_COOKIE present  -> ReturningUser
//   - "?projects=multi" query param on the authorize URL (dev-only test
//     hook, no real equivalent) -> NewUserMultipleProjects
//   - otherwise                   -> NewUserSingleProject

const MOCK_PROJECTS = [
  { ref: "my-saas-app", name: "my-saas-app" },
  { ref: "internal-tools", name: "internal-tools" },
];

function resolveOutcome(request: Request) {
  if (hasCookie(request, HAS_ACCOUNT_COOKIE)) {
    return "returning" as const;
  }
  const url = new URL(request.url);
  if (url.searchParams.get("projects") === "multi") {
    return "multiple" as const;
  }
  return "single" as const;
}

function handleOAuthEntry(request: Request) {
  switch (resolveOutcome(request)) {
    case "returning": {
      setCookie(SESSION_COOKIE, "mock_api_key_for_dev", 60 * 60 * 24 * 30);
      return new HttpResponse(null, {
        status: 302,
        headers: { Location: "/dashboard" },
      });
    }
    case "multiple": {
      // No cookie yet — matches the backend, which only hands out the
      // partial session token as a URL param until a project is picked.
      return new HttpResponse(null, {
        status: 302,
        headers: {
          Location:
            "/onboarding/select-project?partialToken=mock_partial_token",
        },
      });
    }
    case "single": {
      setCookie(ONBOARDING_COOKIE, "mock_onboarding_token", 60 * 30);
      setCookie(ONBOARDING_PROJECT_COOKIE, MOCK_PROJECTS[0].ref, 60 * 30);
      // Fresh onboarding session — clear any leftover progress from a
      // previous run so /status starts back at CONFIRM_SCHEMA.
      setCookie(ONBOARDING_SCHEMA_COOKIE, "", 0);
      setCookie(ONBOARDING_RESEND_COOKIE, "", 0);
      return new HttpResponse(null, {
        status: 302,
        // Real backend always lands here regardless of actual step —
        // /onboarding/email-provider's page.tsx checks /status and
        // redirects to /onboarding/schema itself.
        headers: { Location: "/onboarding/email-provider" },
      });
    }
  }
}

export const oauthHandlers = [
  // Real backend: redirects to Supabase's OAuth consent screen. Mocked:
  // skip straight to the callback outcome (see handleOAuthEntry above).
  http.get("*/api/v1/oauth/supabase/authorize", ({ request }) =>
    handleOAuthEntry(request),
  ),

  // Kept for shape parity with the real controller / for hitting directly
  // during dev — in the mocked flow /authorize never actually redirects
  // here, since there's no real Supabase hop to bounce back from.
  http.get("*/api/v1/oauth/supabase/callback", ({ request }) =>
    handleOAuthEntry(request),
  ),

  http.post("*/api/v1/oauth/supabase/select-project", async ({ request }) => {
    const body = (await request.json()) as { projectRef?: string };
    setCookie(ONBOARDING_COOKIE, "mock_onboarding_token", 60 * 30);
    setCookie(
      ONBOARDING_PROJECT_COOKIE,
      body.projectRef ?? MOCK_PROJECTS[0].ref,
      60 * 30,
    );
    setCookie(ONBOARDING_SCHEMA_COOKIE, "", 0);
    setCookie(ONBOARDING_RESEND_COOKIE, "", 0);
    return new HttpResponse(null, {
      status: 302,
      headers: { Location: "/onboarding/email-provider" },
    });
  }),

  // Not on the real controller — dev-only helper so the select-project
  // page has something to list without a real backend.
  http.get("*/api/v1/oauth/supabase/mock-projects", () => {
    return HttpResponse.json(MOCK_PROJECTS);
  }),
];
