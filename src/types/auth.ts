export type UserRole = "ADMIN" | "OPERATOR";

export interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
  active: boolean;
}

export interface LoginResult {
  token: string;
  user: User;
}
