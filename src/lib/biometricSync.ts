import { db } from "@/lib/db";
import { listTransactions } from "@/lib/biometricApi";

const SYNC_DAYS_BACK = 30;

export async function syncBiometricEvents(): Promise<{ synced: number; checkIns: number; checkOuts: number }> {
  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - SYNC_DAYS_BACK * 24 * 60 * 60 * 1000);
  const entries = await listTransactions(startTime, endTime);

  for (const entry of entries) {
    const data = {
      empCode: entry.empCode,
      employeeName: entry.employeeName,
      department: entry.department,
      position: entry.position,
      punchTime: entry.punchTime,
      punchState: entry.punchState,
      punchStateLabel: entry.punchStateLabel,
      verifyType: entry.verifyType,
      terminalAlias: entry.terminalAlias,
    };
    await db.biometricEvent.upsert({
      where: { externalId: entry.externalId },
      create: { externalId: entry.externalId, ...data },
      update: data,
    });
  }

  const checkIns = entries.filter((e) => e.punchStateLabel === "Check In").length;
  const checkOuts = entries.filter((e) => e.punchStateLabel === "Check Out").length;
  return { synced: entries.length, checkIns, checkOuts };
}
