import axios from "axios";

export const apiClient = axios.create({
  baseURL:
    typeof window === "undefined"
      ? process.env.NEXT_PUBLIC_API_URL // server-side: use real URL
      : "", // client-side: relative URLs for MSW
  withCredentials: true,
});
