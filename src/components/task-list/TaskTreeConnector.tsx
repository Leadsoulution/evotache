import { cn } from "@/lib/cn";

interface TaskTreeConnectorProps {
  ancestorContinues: boolean[];
}

const GUTTER_WIDTH = 20;
const LINE = "border-slate-300 dark:border-slate-600";

/** Renders the file-tree-style connector lines in a subtask row's indent —
 * a rounded L-bend from the ancestor's vertical line into this row's
 * checkbox, plus a straight pass-through line for any ancestor level that
 * still has more siblings coming after this row's whole subtree. */
export function TaskTreeConnector({ ancestorContinues }: TaskTreeConnectorProps) {
  if (ancestorContinues.length === 0) return null;

  return (
    <div className="flex h-full shrink-0" aria-hidden="true">
      {ancestorContinues.map((continues, index) => {
        const isOwnLevel = index === ancestorContinues.length - 1;
        return (
          <div key={index} className="relative h-full" style={{ width: GUTTER_WIDTH }}>
            {isOwnLevel ? (
              <>
                <span className={cn("absolute left-1/2 top-0 h-1/2 w-1/2 rounded-bl-lg border-b-2 border-l-2", LINE)} />
                {continues && <span className={cn("absolute bottom-0 left-1/2 top-1/2 border-l-2", LINE)} />}
              </>
            ) : (
              continues && <span className={cn("absolute inset-y-0 left-1/2 border-l-2", LINE)} />
            )}
          </div>
        );
      })}
    </div>
  );
}
