import { resetDemoData } from "@/lib/resetDemoData";

export const ACCOUNT_MENU_OPTIONS = [
  { value: "reset", label: "Reset demo data" },
  { value: "signout", label: "Sign out" },
];

export function handleAccountMenuChange(value: string, logout: () => void): void {
  if (value === "signout") {
    logout();
    return;
  }
  if (value === "reset") {
    if (window.confirm("Reset all demo data (tasks, projects, litiges, users, custom fields) back to the sample content? You'll stay signed in.")) {
      resetDemoData();
      window.location.reload();
    }
  }
}
