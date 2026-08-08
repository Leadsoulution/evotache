import {
  AlertTriangleIcon,
  BellIcon,
  BookOpenIcon,
  ChartBarIcon,
  ChatBubbleIcon,
  FingerprintIcon,
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
import { canAccessBiometrics, canAccessCalls, canManageUsers, canManageWorkflow } from "@/config/roleMeta";
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

// Sections gated to admin/member by default but grantable to any user via
// User.extraSectionHrefs (see UserFormDialog's "Extra access" fieldset).
export const EXTRA_ACCESS_NAV_ITEMS: NavItem[] = [
  { href: "/calls", label: "nav.calls", icon: PhoneIcon },
  { href: "/biometrie", label: "nav.biometrics", icon: FingerprintIcon },
];

// The role/grant-gated items below (calls/biometrie/admin) are intentionally
// kept separate from the visibleSectionHrefs narrowing applied to
// BASE_NAV_ITEMS: that allow-list is only ever populated from the "Visible
// sections" checklist in UserFormDialog, which only lists BASE_NAV_ITEMS —
// so folding these into the same filter would silently strip a user's
// calls/biometrie/admin access the moment an admin unchecked even one
// unrelated base section for them.
export function getNavItems(user: AppUser): NavItem[] {
  const baseItems = user.visibleSectionHrefs
    ? BASE_NAV_ITEMS.filter((item) => user.visibleSectionHrefs!.includes(item.href))
    : BASE_NAV_ITEMS;

  const items = [...baseItems];
  for (const item of EXTRA_ACCESS_NAV_ITEMS) {
    const canAccess = item.href === "/calls" ? canAccessCalls(user) : canAccessBiometrics(user);
    if (canAccess) items.push(item);
  }
  if (canManageUsers(user.role) || canManageWorkflow(user.role)) items.push({ href: "/admin", label: "nav.admin", icon: ShieldIcon });
  return items;
}
