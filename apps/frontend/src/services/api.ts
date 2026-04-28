import axios from "axios";

import type { ApiFailure } from "../types";

let refreshRequest: Promise<void> | null = null;

const getCookie = (name: string): string | null => {
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match?.[2] ? decodeURIComponent(match[2]) : null;
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "/api",
  withCredentials: true
});

api.interceptors.request.use((config) => {
  const method = config.method?.toUpperCase();

  if (method && !["GET", "HEAD", "OPTIONS"].includes(method)) {
    const csrfToken = getCookie("promptforge_csrf");

    if (csrfToken) {
      config.headers.set("x-csrf-token", csrfToken);
    }
  }

  return config;
});

const runRefresh = async (): Promise<void> => {
  if (!refreshRequest) {
    refreshRequest = api.post("/auth/refresh").then(() => undefined).finally(() => {
      refreshRequest = null;
    });
  }

  await refreshRequest;
};

api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error) || !error.config) {
      return Promise.reject(error);
    }

    const originalRequest = error.config as typeof error.config & { _retry?: boolean };
    const status = error.response?.status;
    const url = error.config.url ?? "";

    if (
      status === 401 &&
      !originalRequest._retry &&
      !url.includes("/auth/login") &&
      !url.includes("/auth/register") &&
      !url.includes("/auth/refresh")
    ) {
      originalRequest._retry = true;
      await runRefresh();
      return api(originalRequest);
    }

    const payload = error.response?.data as ApiFailure | undefined;
    return Promise.reject(
      payload?.error ?? {
        code: "REQUEST_FAILED",
        message: error.message
      }
    );
  }
);

export default api;
