import {
  AlertTriangleIcon,
  ChartBarIcon,
  ChatBubbleIcon,
  FolderIcon,
  HomeIcon,
  ListChecksIcon,
  MegaphoneIcon,
  ScaleIcon,
  ShieldIcon,
  ShoppingBagIcon,
  SparklesIcon,
  UsersIcon,
} from "@/components/ui/icons";
import { canManageUsers, canManageWorkflow } from "@/config/roleMeta";
import type { AppUser } from "@/types/user";

export interface NavItem {
  href: string;
  label: string;
  icon: typeof HomeIcon;
}

export const BASE_NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: HomeIcon },
  { href: "/chat", label: "Chat", icon: ChatBubbleIcon },
  { href: "/tasks", label: "Tasks", icon: ListChecksIcon },
  { href: "/projects", label: "Projects", icon: FolderIcon },
  { href: "/social", label: "Social Media", icon: MegaphoneIcon },
  { href: "/teams", label: "Departments", icon: UsersIcon },
  { href: "/disputes", label: "Litiges", icon: ScaleIcon },
  { href: "/achats", label: "Achats", icon: ShoppingBagIcon },
  { href: "/overdue", label: "Overdue", icon: AlertTriangleIcon },
  { href: "/assistant", label: "AI Assistant", icon: SparklesIcon },
  { href: "/statistics", label: "Statistics", icon: ChartBarIcon },
];

export function getNavItems(user: AppUser): NavItem[] {
  const items = [...BASE_NAV_ITEMS];
  if (canManageUsers(user.role) || canManageWorkflow(user.role)) {
    items.push({ href: "/admin", label: "Admin", icon: ShieldIcon });
  }
  if (!user.visibleSectionHrefs) return items;
  const allowed = new Set(user.visibleSectionHrefs);
  // The admin-imposed allow-list only ever narrows the role-appropriate set —
  // it never grants a section the role gate above wouldn't already include.
  return items.filter((item) => allowed.has(item.href));
}
