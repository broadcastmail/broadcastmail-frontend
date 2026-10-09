import axios from "axios";
import {forwardedCookieHeader} from "../server-cookies";

export async function createServerApiClient() {
  const cookie = await forwardedCookieHeader();

  return axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL,
    withCredentials: true,
    headers: cookie ? { Cookie: cookie } : undefined,
  });
}
