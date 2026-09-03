import type { ReactNode } from "react";

interface BiometricSectionTitleProps {
  children: ReactNode;
  icon?: ReactNode;
  /** Small muted suffix rendered after the title, not part of the 3D
   * animated text itself (e.g. "- aujourd'hui") — matches the existing
   * pattern of a bold heading plus a lighter contextual bit next to it. */
  suffix?: ReactNode;
}

/** Attention-grabbing section heading for the Biométrie dashboard — a
 * gradient-filled, subtly wobbling-in-3D title (section-title-3d in
 * globals.css), the same visual language as the Atelier TV's title but
 * toned down for something read up close on a screen full of other data
 * rather than across a room. Purely decorative: no state, safe to drop
 * above any section without touching its data/logic. */
export function BiometricSectionTitle({ children, icon, suffix }: BiometricSectionTitleProps) {
  return (
    <div className="flex items-center gap-2" style={{ perspective: "500px" }}>
      {icon}
      <h2
        className="section-title-3d bg-gradient-to-br from-indigo-600 via-fuchsia-500 to-slate-700 bg-clip-text text-lg font-extrabold tracking-tight text-transparent dark:from-indigo-400 dark:via-fuchsia-400 dark:to-slate-300"
        style={{ textShadow: "0 4px 14px rgba(129,60,236,0.22)" }}
      >
        {children}
      </h2>
      {suffix && <span className="text-sm font-normal text-slate-400">{suffix}</span>}
    </div>
  );
}
