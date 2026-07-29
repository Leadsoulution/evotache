import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { toPublicTask } from "@/lib/publicTask";
import { notifyTaskAssignment } from "@/lib/taskNotify";
import { canEditTasksFull, canEditTaskStatus } from "@/config/roleMeta";
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

  // Status/order-only changes (drag reorder, status dropdown) need the
  // lighter "edit status" capability; anything touching other fields needs
  // full edit rights — mirrors src/lib/taskPermissions.ts's client-side gate.
  const patchKeys = Object.keys(patch);
  const isStatusOnly = patchKeys.every((k) => k === "status" || k === "order");
  const allowed = isStatusOnly ? canEditTaskStatus(sessionUser.role) : canEditTasksFull(sessionUser.role);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const existing = await db.task.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Task not found." }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to exclude these server-owned fields from the update payload
  const { id: _ignoredId, createdAt: _ignoredCreatedAt, updatedAt: _ignoredUpdatedAt, dueDate, recurrence, customValues, ...rest } = patch;
  const task = await db.task.update({
    where: { id },
    data: {
      ...rest,
      ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      ...(recurrence !== undefined && { recurrence: recurrence === null ? Prisma.JsonNull : recurrence }),
      ...(customValues !== undefined && { customValues }),
    } as Prisma.TaskUncheckedUpdateInput,
  });

  const newlyAssigned = task.assigneeIds.filter((assigneeId) => !existing.assigneeIds.includes(assigneeId));
  void notifyTaskAssignment(newlyAssigned, task);

  return NextResponse.json(toPublicTask(task));
}
