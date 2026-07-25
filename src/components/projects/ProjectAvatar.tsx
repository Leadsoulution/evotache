import { cn } from "@/lib/cn";

interface ProjectAvatarProps {
  project: { name: string; color: string; logoDataUrl?: string | null };
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<ProjectAvatarProps["size"]>, string> = {
  xs: "h-2 w-2",
  sm: "h-2.5 w-2.5",
  md: "h-5 w-5",
  lg: "h-12 w-12",
};

export function ProjectAvatar({ project, size = "sm", className }: ProjectAvatarProps) {
  if (project.logoDataUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={project.logoDataUrl}
        alt={project.name}
        className={cn("shrink-0 rounded-md object-cover ring-1 ring-black/5 dark:ring-white/10", SIZE_CLASSES[size], className)}
      />
    );
  }
  return <span className={cn("inline-block shrink-0 rounded-full", SIZE_CLASSES[size], className)} style={{ backgroundColor: project.color }} />;
}
