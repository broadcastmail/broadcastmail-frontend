import { cookies } from "next/headers";

/**
 * Server Components run in Node and don't automatically send the browser's
 * cookies on outgoing requests the way `apiClient`'s `withCredentials: true`
 * does client-side. Forward them explicitly for SSR calls to the backend
 * (mocked or real) that need the session cookie.
 */
export async function forwardedCookieHeader(): Promise<string> {
  const store = await cookies();
  return store
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
}
