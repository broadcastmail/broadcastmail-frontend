import axios from "axios";

// Server Components run in Node, where axios can't send requests to a
// relative URL — it needs an absolute one. The browser is fine with "" since
// relative requests resolve against the current origin there.
const isServer = typeof window === "undefined";

export const apiClient = axios.create({
  baseURL:
    typeof window === "undefined"
      ? process.env.NEXT_PUBLIC_API_URL // server-side: use real URL
      : "", // client-side: relative URLs for MSW
  withCredentials: true,
});
