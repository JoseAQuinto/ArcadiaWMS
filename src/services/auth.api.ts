import { apiRequest } from "./api";
import type { LoginResult, User } from "@/types/auth";

export function login(identifier: string, password: string): Promise<LoginResult> {
  return apiRequest<LoginResult>("/api/auth/login", { method: "POST", body: { identifier, password } });
}

export function fetchCurrentUser(): Promise<User> {
  return apiRequest<User>("/api/auth/me");
}

/** Any authenticated role can change their own password; the current one is required. */
export function changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>("/api/auth/password", {
    method: "PUT",
    body: { currentPassword, newPassword },
  });
}
