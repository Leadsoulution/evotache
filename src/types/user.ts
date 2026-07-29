export type Role = "admin" | "member" | "member_limited" | "viewer";

export type UserStatus = "active" | "disabled";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  color: string;
  photoDataUrl: string | null;
  status: UserStatus;
  managerIds: string[];
  createdAt: string;
  /** Nav hrefs this user is allowed to see; null means no admin-imposed restriction (all role-appropriate sections). */
  visibleSectionHrefs: string[] | null;
  /** Column ids hidden for this user by an admin, across Tasks/Litiges/Achats — on top of their own self-service hidden columns. */
  hiddenColumnIds: string[];
  /** AI agent "employee" account — never logs in, excluded from assignee pickers. */
  isAgent: boolean;
}
