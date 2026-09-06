import type { UserRole } from "./auth";

export interface ManagedUser {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
}
