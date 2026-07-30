import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { toPublicTask } from "@/lib/publicTask";
import { getDescendantIds } from "@/lib/taskTree";
import { canDeleteTasks } from "@/config/roleMeta";
import { deleteFile } from "@/lib/storage";

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

  // Cascade covers the task delete itself (schema.prisma: Task.parent
  // onDelete: Cascade), but Attachment has no FK relation (matches this
  // schema's convention for id-reference fields), so its rows — and their
  // Storage files — are cleaned up here explicitly.
  const allTasks = (await db.task.findMany()).map(toPublicTask);
  const descendantIds = ids.flatMap((id) => getDescendantIds(allTasks, id));
  const allIdsToDelete = Array.from(new Set([...ids, ...descendantIds]));

  const attachments = await db.attachment.findMany({ where: { taskId: { in: allIdsToDelete } } });
  await db.task.deleteMany({ where: { id: { in: ids } } });
  await db.attachment.deleteMany({ where: { taskId: { in: allIdsToDelete } } });
  for (const attachment of attachments) {
    if (attachment.url) void deleteFile(attachment.url);
  }

  return NextResponse.json({ deletedIds: allIdsToDelete });
}
