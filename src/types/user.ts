export type Role = "admin" | "member" | "member_limited" | "viewer";

export type UserStatus = "active" | "disabled";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  color: string;
  status: UserStatus;
  managerIds: string[];
  createdAt: string;
}
