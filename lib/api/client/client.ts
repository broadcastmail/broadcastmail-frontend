import axios, {type AxiosRequestConfig} from "axios";

const instance = axios.create({
  baseURL:
    typeof window === "undefined"
      ? process.env.NEXT_PUBLIC_API_URL
      : "",
  withCredentials: true,
});

export const apiClient = instance;

export const orvalClient = <T>(config: AxiosRequestConfig): Promise<T> =>
  instance(config).then((res) => res.data);
