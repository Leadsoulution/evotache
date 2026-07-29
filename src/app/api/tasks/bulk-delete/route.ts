import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { toPublicTask } from "@/lib/publicTask";
import { getDescendantIds } from "@/lib/taskTree";
import { canDeleteTasks } from "@/config/roleMeta";

export async function POST(request: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canDeleteTasks(sessionUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let ids: string[];
  try {
    const body = await request.json();
    ids = Array.isArray(body.ids) ? body.ids : [];
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (ids.length === 0) return NextResponse.json({ deletedIds: [] });

  // Cascade covers the actual delete (schema.prisma: Task.parent onDelete:
  // Cascade), but the client still needs the full id set (including
  // descendants) to clean up localStorage-backed attachments per id.
  const allTasks = (await db.task.findMany()).map(toPublicTask);
  const descendantIds = ids.flatMap((id) => getDescendantIds(allTasks, id));
  const allIdsToDelete = Array.from(new Set([...ids, ...descendantIds]));

  await db.task.deleteMany({ where: { id: { in: ids } } });

  return NextResponse.json({ deletedIds: allIdsToDelete });
}
