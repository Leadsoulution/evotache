import { ALL_ROLE_ORDER, CAPABILITIES, ROLE_CONFIG, hasCapability } from "@/config/roleMeta";
import { CheckIcon, XIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

export function RolePermissionsCard() {
  return (
    <div className="min-w-0 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <table className="w-full min-w-[520px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <th scope="col" className="px-4 py-2.5">
              Capability
            </th>
            {ALL_ROLE_ORDER.map((role) => (
              <th key={role} scope="col" className="px-4 py-2.5 text-center">
                <span className={cn("inline-flex items-center gap-1.5", ROLE_CONFIG[role].textColor)}>
                  <span className={cn("h-1.5 w-1.5 rounded-full", ROLE_CONFIG[role].dotColor)} />
                  {ROLE_CONFIG[role].label}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {CAPABILITIES.map((capability) => (
            <tr key={capability.key} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
              <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">{capability.label}</td>
              {ALL_ROLE_ORDER.map((role) => (
                <td key={role} className="px-4 py-2.5 text-center">
                  {hasCapability(role, capability.key) ? (
                    <CheckIcon className="mx-auto h-4 w-4 text-emerald-500" />
                  ) : (
                    <XIcon className="mx-auto h-4 w-4 text-slate-300 dark:text-slate-700" />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
