import {
  AlertTriangleIcon,
  BellIcon,
  BookOpenIcon,
  ChartBarIcon,
  ChatBubbleIcon,
  FolderIcon,
  HomeIcon,
  ListChecksIcon,
  MegaphoneIcon,
  PhoneIcon,
  ScaleIcon,
  ShieldIcon,
  ShoppingBagIcon,
  SparklesIcon,
  UsersIcon,
} from "@/components/ui/icons";
import { canManageUsers, canManageWorkflow } from "@/config/roleMeta";
import type { TranslationKey } from "@/i18n/en";
import type { AppUser } from "@/types/user";

export interface NavItem {
  href: string;
  label: TranslationKey;
  icon: typeof HomeIcon;
}

export const BASE_NAV_ITEMS: NavItem[] = [
  { href: "/", label: "nav.dashboard", icon: HomeIcon },
  { href: "/chat", label: "nav.chat", icon: ChatBubbleIcon },
  { href: "/tasks", label: "nav.tasks", icon: ListChecksIcon },
  { href: "/projects", label: "nav.projects", icon: FolderIcon },
  { href: "/social", label: "nav.socialMedia", icon: MegaphoneIcon },
  { href: "/teams", label: "nav.departments", icon: UsersIcon },
  { href: "/disputes", label: "nav.litiges", icon: ScaleIcon },
  { href: "/achats", label: "nav.achats", icon: ShoppingBagIcon },
  { href: "/overdue", label: "nav.overdue", icon: AlertTriangleIcon },
  { href: "/reminders", label: "nav.reminders", icon: BellIcon },
  { href: "/library", label: "nav.library", icon: BookOpenIcon },
  { href: "/assistant", label: "nav.aiAssistant", icon: SparklesIcon },
  { href: "/statistics", label: "nav.statistics", icon: ChartBarIcon },
];

export function getNavItems(user: AppUser): NavItem[] {
  const items = [...BASE_NAV_ITEMS];
  if (canManageUsers(user.role) || canManageWorkflow(user.role)) {
    items.push({ href: "/calls", label: "nav.calls", icon: PhoneIcon });
    items.push({ href: "/admin", label: "nav.admin", icon: ShieldIcon });
  }
  if (!user.visibleSectionHrefs) return items;
  const allowed = new Set(user.visibleSectionHrefs);
  // The admin-imposed allow-list only ever narrows the role-appropriate set —
  // it never grants a section the role gate above wouldn't already include.
  return items.filter((item) => allowed.has(item.href));
}
