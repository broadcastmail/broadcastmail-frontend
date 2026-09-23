import { http, HttpResponse } from "msw";
import {
  SESSION_COOKIE,
  ONBOARDING_COOKIE,
  HAS_ACCOUNT_COOKIE,
  ONBOARDING_PROJECT_COOKIE,
  ONBOARDING_SCHEMA_COOKIE,
  ONBOARDING_COLUMNS_COOKIE,
  hasCookie,
  setCookie,
} from "../session";
import { CONNECTABLE_PROJECTS } from "./connections";

// Short-circuits to the callback outcome — no real Supabase screen locally.
const RECONFIGURE_PARTIAL_TOKEN = "mock_partial_token_reconfigure";
const ONBOARDING_PARTIAL_TOKEN = "mock_partial_token";

function resolveOutcome(request: Request) {
  const url = new URL(request.url);
  const reconfigure = url.searchParams.get("intent") === "reconfigure";
  if (reconfigure) {
    return "reconfigure" as const;
  }
  if (hasCookie(request, HAS_ACCOUNT_COOKIE)) {
    return "returning" as const;
  }
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
      // No cookie yet — only a partial token, until a project is picked.
      return new HttpResponse(null, {
        status: 302,
        headers: {
          Location: `/onboarding/select-project?partialToken=${ONBOARDING_PARTIAL_TOKEN}`,
        },
      });
    }
    case "reconfigure": {
      // Same two-vs-many-projects split, landing on Settings' own routes.
      if (CONNECTABLE_PROJECTS.length > 1) {
        return new HttpResponse(null, {
          status: 302,
          headers: {
            Location: `/settings/reconfigure/select-project?partialToken=${RECONFIGURE_PARTIAL_TOKEN}`,
          },
        });
      }
      setCookie(ONBOARDING_COOKIE, "mock_onboarding_token", 60 * 30);
      setCookie(ONBOARDING_PROJECT_COOKIE, CONNECTABLE_PROJECTS[0].ref, 60 * 30);
      setCookie(ONBOARDING_SCHEMA_COOKIE, "", 0);
      setCookie(ONBOARDING_COLUMNS_COOKIE, "", 0);
      return new HttpResponse(null, {
        status: 302,
        headers: { Location: "/settings/reconfigure/schema" },
      });
    }
    case "single": {
      setCookie(ONBOARDING_COOKIE, "mock_onboarding_token", 60 * 30);
      setCookie(ONBOARDING_PROJECT_COOKIE, CONNECTABLE_PROJECTS[0].ref, 60 * 30);
      // Fresh session — clear leftover progress so /status starts at CONFIRM_SCHEMA.
      setCookie(ONBOARDING_SCHEMA_COOKIE, "", 0);
      setCookie(ONBOARDING_COLUMNS_COOKIE, "", 0);
      return new HttpResponse(null, {
        status: 302,
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

  // Kept for shape parity; the mocked flow never actually redirects here.
  http.get("*/api/v1/oauth/supabase/callback", ({ request }) =>
    handleOAuthEntry(request),
  ),

  // No cookie needed — the partial token itself is the credential.
  http.get("*/api/v1/oauth/supabase/projects", () => {
    return HttpResponse.json(CONNECTABLE_PROJECTS);
  }),

  http.post("*/api/v1/oauth/supabase/select-project", async ({ request }) => {
    const body = (await request.json()) as {
      projectRef?: string;
      partialSessionToken?: string;
    };
    const reconfigure = body.partialSessionToken === RECONFIGURE_PARTIAL_TOKEN;
    setCookie(ONBOARDING_COOKIE, "mock_onboarding_token", 60 * 30);
    setCookie(
      ONBOARDING_PROJECT_COOKIE,
      body.projectRef ?? CONNECTABLE_PROJECTS[0].ref,
      60 * 30,
    );
    setCookie(ONBOARDING_SCHEMA_COOKIE, "", 0);
    setCookie(ONBOARDING_COLUMNS_COOKIE, "", 0);
    return new HttpResponse(null, {
      status: 302,
      headers: {
        Location: reconfigure
          ? "/settings/reconfigure/schema"
          : "/onboarding/email-provider",
      },
    });
  }),
];
