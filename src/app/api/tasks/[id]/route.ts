import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { toPublicTask } from "@/lib/publicTask";
import { notifyTaskAssignment } from "@/lib/taskNotify";
import { canEditTaskStatus } from "@/config/roleMeta";
import { Prisma } from "@/generated/prisma/client";
import type { Task } from "@/types/task";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  let patch: Partial<Task>;
  try {
    patch = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const existing = await db.task.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Task not found." }, { status: 404 });

  // Status/order-only changes (drag reorder, status dropdown) need the
  // lighter "edit status" capability, available regardless of who created
  // the task; anything touching other fields needs full edit rights, which
  // for non-admins only exist on tasks they created themselves — mirrors
  // src/lib/taskPermissions.ts's client-side gate. Completing a recurring
  // task bundles `recurrence: null` into the same patch as the status
  // change (it's clearing the rule, not editing it), so that combination
  // stays under the lighter capability too.
  const patchKeys = Object.keys(patch);
  const isStatusOnly = patchKeys.every((k) => k === "status" || k === "order" || (k === "recurrence" && patch.recurrence === null));
  const allowed = isStatusOnly ? canEditTaskStatus(sessionUser.role) : sessionUser.role === "admin" || existing.createdBy === sessionUser.id;
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to exclude these server-owned fields from the update payload
  const { id: _ignoredId, createdBy: _ignoredCreatedBy, createdAt: _ignoredCreatedAt, updatedAt: _ignoredUpdatedAt, startDate, dueDate, recurrence, customValues, ...rest } = patch;
  await db.task.update({
    where: { id },
    data: {
      ...rest,
      ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
      ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      ...(customValues !== undefined && { customValues }),
    } as Prisma.TaskUncheckedUpdateInput,
  });

  // Clearing recurrence marks "the next occurrence has been spawned" — done
  // as its own conditional update (only applies if recurrence is still set)
  // so two concurrent sessions racing to complete/advance the same
  // recurring task can't both win and each spawn their own duplicate next
  // occurrence. `recurrenceCleared` tells the caller whether *this* request
  // was the one that actually cleared it (false means someone else already
  // did, so the caller must not spawn a successor).
  let recurrenceCleared: boolean | undefined;
  if (recurrence !== undefined) {
    if (recurrence === null) {
      const result = await db.task.updateMany({ where: { id, recurrence: { not: Prisma.JsonNull } }, data: { recurrence: Prisma.JsonNull } });
      recurrenceCleared = result.count > 0;
    } else {
      await db.task.update({ where: { id }, data: { recurrence: recurrence as unknown as Prisma.InputJsonValue } });
      recurrenceCleared = true;
    }
  }

  const task = await db.task.findUnique({ where: { id } });
  if (!task) return NextResponse.json({ error: "Task not found." }, { status: 404 });

  const newlyAssigned = task.assigneeIds.filter((assigneeId) => !existing.assigneeIds.includes(assigneeId));
  void notifyTaskAssignment(newlyAssigned, task);

  return NextResponse.json({ ...toPublicTask(task), ...(recurrenceCleared !== undefined && { recurrenceCleared }) });
}
