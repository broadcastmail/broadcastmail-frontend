// mocks/handlers/connections.ts
import { http, HttpResponse } from "msw";
import {
  ONBOARDING_COOKIE,
  ONBOARDING_PROJECT_COOKIE,
  ONBOARDING_SCHEMA_COOKIE,
  ONBOARDING_COLUMNS_COOKIE,
  ONBOARDING_TABLE_COOKIE,
  setCookie,
  clearCookie,
} from "../session";
import { currentSchema } from "./onboarding";

export const CONNECTABLE_PROJECTS = [
  { ref: "my-saas-app", name: "my-saas-app", status: "ACTIVE_HEALTHY", userCount: 1204 },
  { ref: "internal-tools", name: "internal-tools", status: "ACTIVE_HEALTHY", userCount: 58 },
];

export const connectionHandlers = [

  http.get("*/api/v1/connections/schema", ({ request }) => {
    return HttpResponse.json(currentSchema(request));
  }),

  http.post("*/api/v1/connections/schema/confirm", async ({ request }) => {
    const body = (await request.json().catch(() => null)) as {
      columnNames?: string[];
    } | null;
    if (body?.columnNames) {
      setCookie(ONBOARDING_COLUMNS_COOKIE, body.columnNames.join(","), 60 * 30);
    }
    setCookie(ONBOARDING_SCHEMA_COOKIE, "1", 60 * 30);
    return new HttpResponse(null, { status: 200 });
  }),

  // Finalizes the reconfigure; the frontend navigates to /settings itself.
  http.post("*/api/v1/connections/reconfigure", () => {
    clearCookie(ONBOARDING_COOKIE);
    return new HttpResponse(null, { status: 200 });
  }),

  //  Reconnect

  http.get("*/api/v1/connections/supabase/projects", () => {
    return HttpResponse.json(CONNECTABLE_PROJECTS);
  }),

  http.get("*/api/v1/connections/schema/reconnect", ({ request }) => {
    return HttpResponse.json(currentSchema(request));
  }),

  http.patch("*/api/v1/connections/project", async ({ request }) => {
    const body = (await request.json().catch(() => null)) as {
      projectRef?: string;
    } | null;
    if (!body?.projectRef) {
      return new HttpResponse(null, { status: 400 });
    }
    setCookie(ONBOARDING_PROJECT_COOKIE, body.projectRef, 60 * 60 * 24 * 365);
    // A different project means a different database — reset table/columns.
    setCookie(ONBOARDING_SCHEMA_COOKIE, "", 0);
    setCookie(ONBOARDING_COLUMNS_COOKIE, "", 0);
    setCookie(ONBOARDING_TABLE_COOKIE, "", 0);
    return new HttpResponse(null, { status: 200 });
  }),

  http.patch("*/api/v1/connections/table", async ({ request }) => {
    const body = (await request.json().catch(() => null)) as {
      userTableSchema?: string;
      userTableName?: string;
      userIdColumn?: string;
    } | null;
    if (!body?.userTableSchema || !body.userTableName) {
      return new HttpResponse(null, { status: 400 });
    }
    setCookie(ONBOARDING_TABLE_COOKIE, body.userTableName, 60 * 30);
    setCookie(ONBOARDING_SCHEMA_COOKIE, "1", 60 * 30);
    setCookie(ONBOARDING_COLUMNS_COOKIE, "", 0);
    return new HttpResponse(null, { status: 200 });
  }),

  http.patch("*/api/v1/connections/columns", async ({ request }) => {
    const body = (await request.json().catch(() => null)) as {
      columnNames?: string[];
    } | null;
    if (!body?.columnNames) {
      return new HttpResponse(null, { status: 400 });
    }
    setCookie(ONBOARDING_COLUMNS_COOKIE, body.columnNames.join(","), 60 * 30);
    return new HttpResponse(null, { status: 200 });
  }),
];
