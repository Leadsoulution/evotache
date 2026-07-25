import { ChartBarIcon, FolderIcon, HomeIcon, ListChecksIcon, ScaleIcon, ShieldIcon, SparklesIcon, UsersIcon } from "@/components/ui/icons";
import { canManageUsers, canManageWorkflow } from "@/config/roleMeta";
import type { Role } from "@/types/user";

export interface NavItem {
  href: string;
  label: string;
  icon: typeof HomeIcon;
}

const BASE_NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: HomeIcon },
  { href: "/tasks", label: "Tasks", icon: ListChecksIcon },
  { href: "/projects", label: "Projects", icon: FolderIcon },
  { href: "/teams", label: "Teams", icon: UsersIcon },
  { href: "/disputes", label: "Litiges", icon: ScaleIcon },
  { href: "/assistant", label: "AI Assistant", icon: SparklesIcon },
  { href: "/statistics", label: "Statistics", icon: ChartBarIcon },
];

export function getNavItems(role: Role): NavItem[] {
  const items = [...BASE_NAV_ITEMS];
  if (canManageUsers(role) || canManageWorkflow(role)) {
    items.push({ href: "/admin", label: "Admin", icon: ShieldIcon });
  }
  return items;
}
