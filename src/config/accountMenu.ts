import type { MenuOption } from "@/components/ui/Menu";

export function getAccountMenuOptions(pushSupported: boolean, pushSubscribed: boolean): MenuOption[] {
  const options: MenuOption[] = [];
  if (pushSupported) {
    options.push({ value: "push", label: pushSubscribed ? "Disable notifications" : "Enable notifications" });
  }
  options.push({ value: "signout", label: "Sign out" });
  return options;
}

interface AccountMenuHandlers {
  logout: () => void;
  togglePush: () => void;
}

export function handleAccountMenuChange(value: string, handlers: AccountMenuHandlers): void {
  if (value === "signout") {
    handlers.logout();
    return;
  }
  if (value === "push") {
    handlers.togglePush();
    return;
  }
}
