import { db } from "@/lib/db";
import { listCallLog } from "@/lib/threeCxApi";

const SYNC_DAYS_BACK = 30;

export async function syncCalls(): Promise<{ synced: number; missed: number }> {
  const periodTo = new Date();
  const periodFrom = new Date(periodTo.getTime() - SYNC_DAYS_BACK * 24 * 60 * 60 * 1000);
  const entries = await listCallLog(periodFrom, periodTo);

  for (const entry of entries) {
    const data = {
      startTime: entry.startTime,
      sourceNumber: entry.sourceNumber,
      sourceName: entry.sourceName,
      destNumber: entry.destNumber,
      destName: entry.destName,
      direction: entry.direction,
      status: entry.status,
      answered: entry.answered,
      ringSeconds: entry.ringSeconds,
      talkSeconds: entry.talkSeconds,
      cost: entry.cost,
      reason: entry.reason,
    };
    await db.phoneCall.upsert({
      where: { externalId: entry.externalId },
      create: { externalId: entry.externalId, ...data },
      update: data,
    });
  }

  const missed = entries.filter((e) => e.status === "Unanswered").length;
  return { synced: entries.length, missed };
}
