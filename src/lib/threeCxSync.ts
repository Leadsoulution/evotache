import { db } from "@/lib/db";
import { listCallLog, listThreeCxUsers } from "@/lib/threeCxApi";

const SYNC_DAYS_BACK = 30;

/** Refreshes each extension's realName from 3CX's own Users list —
 * upserting only that field, so it never clobbers an admin's own name
 * override, color, or hidden choice on the same row. A failure here
 * (e.g. the Users endpoint being briefly unreachable) shouldn't block
 * the call sync it's bundled with, so it's swallowed rather than thrown. */
async function syncThreeCxUserNames(): Promise<void> {
  try {
    const realUsers = await listThreeCxUsers();
    for (const u of realUsers) {
      await db.threeCxUser.upsert({
        where: { dn: u.dn },
        create: { dn: u.dn, realName: u.name },
        update: { realName: u.name },
      });
    }
  } catch (err) {
    console.error("3CX user name sync failed:", err);
  }
}

export async function syncCalls(): Promise<{ synced: number; missed: number }> {
  const periodTo = new Date();
  const periodFrom = new Date(periodTo.getTime() - SYNC_DAYS_BACK * 24 * 60 * 60 * 1000);
  const [entries] = await Promise.all([listCallLog(periodFrom, periodTo), syncThreeCxUserNames()]);

  for (const entry of entries) {
    const data = {
      startTime: entry.startTime,
      sourceNumber: entry.sourceNumber,
      sourceName: entry.sourceName,
      sourceDn: entry.sourceDn,
      destNumber: entry.destNumber,
      destName: entry.destName,
      destDn: entry.destDn,
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
