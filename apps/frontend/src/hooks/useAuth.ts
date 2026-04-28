import { useCallback } from "react";

import { authService } from "../services/authService";
import { useAuthStore } from "../store/authStore";
import type { Language, UserProfile } from "../types";

let loadUserRequest: Promise<UserProfile | null> | null = null;

export const useAuth = () => {
  const user = useAuthStore((state) => state.user);
  const status = useAuthStore((state) => state.status);
  const setUser = useAuthStore((state) => state.setUser);
  const setStatus = useAuthStore((state) => state.setStatus);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const loadUser = useCallback(async (): Promise<UserProfile | null> => {
    if (status === "authenticated") {
      return user;
    }

    if (status === "guest") {
      return null;
    }

    if (loadUserRequest) {
      return loadUserRequest;
    }

    setStatus("loading");

    loadUserRequest = authService.me()
      .then((currentUser) => {
        setUser(currentUser);
        return currentUser;
      })
      .catch(() => {
        clearAuth();
        return null;
      })
      .finally(() => {
        loadUserRequest = null;
      });

    return loadUserRequest;
  }, [clearAuth, setStatus, setUser, status, user]);

  const login = useCallback(
    async (payload: { email: string; password: string }) => {
      setStatus("loading");
      const currentUser = await authService.login(payload);
      setUser(currentUser);
      return currentUser;
    },
    [setStatus, setUser]
  );

  const register = useCallback(
    async (payload: {
      email: string;
      password: string;
      name?: string;
      language: Language;
    }) => {
      setStatus("loading");
      const currentUser = await authService.register(payload);
      setUser(currentUser);
      return currentUser;
    },
    [setStatus, setUser]
  );

  const logout = useCallback(async () => {
    await authService.logout();
    clearAuth();
  }, [clearAuth]);

  const updateProfile = useCallback(
    async (payload: { name?: string; language: Language }) => {
      const updatedUser = await authService.updateProfile(payload);
      setUser(updatedUser);
      return updatedUser;
    },
    [setUser]
  );

  const changePassword = useCallback(
    async (payload: {
      currentPassword: string;
      newPassword: string;
      confirmPassword: string;
    }) => {
      await authService.changePassword(payload);
    },
    []
  );

  return {
    user,
    status,
    login,
    register,
    logout,
    loadUser,
    updateProfile,
    changePassword
  };
};
