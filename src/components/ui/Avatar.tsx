import { cn } from "@/lib/cn";

interface AvatarProps {
  name: string;
  color: string;
  size?: "xs" | "sm" | "md";
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<AvatarProps["size"]>, string> = {
  xs: "h-5 w-5 text-[10px]",
  sm: "h-6 w-6 text-[11px]",
  md: "h-8 w-8 text-sm",
};

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const initials = parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return initials || "?";
}

export function Avatar({ name, color, size = "sm", className }: AvatarProps) {
  return (
    <span
      title={name}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-2 ring-white dark:ring-slate-900",
        SIZE_CLASSES[size],
        className
      )}
      style={{ backgroundColor: color }}
    >
      {getInitials(name)}
    </span>
  );
}
