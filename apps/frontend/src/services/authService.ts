import api from "./api";

import type { ApiResponse, AuthPayload, UserProfile } from "../types";

export const authService = {
  register: async (payload: {
    email: string;
    password: string;
    name?: string;
    language: "en" | "ar";
  }): Promise<UserProfile> => {
    const response = await api.post<ApiResponse<AuthPayload>>("/auth/register", payload);
    return response.data.data.user;
  },
  login: async (payload: { email: string; password: string }): Promise<UserProfile> => {
    const response = await api.post<ApiResponse<AuthPayload>>("/auth/login", payload);
    return response.data.data.user;
  },
  me: async (): Promise<UserProfile> => {
    const response = await api.get<ApiResponse<AuthPayload>>("/auth/me");
    return response.data.data.user;
  },
  logout: async (): Promise<void> => {
    await api.post("/auth/logout");
  },
  updateProfile: async (payload: {
    name?: string;
    language: "en" | "ar";
  }): Promise<UserProfile> => {
    const response = await api.put<ApiResponse<{ user: UserProfile }>>("/user/profile", payload);
    return response.data.data.user;
  },
  changePassword: async (payload: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<void> => {
    await api.put("/user/password", payload);
  }
};

