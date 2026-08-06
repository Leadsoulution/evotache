import { db } from "@/lib/db";
import { toBiometricEventEntry } from "@/lib/biometricApi";
import type { RawTransaction } from "@/lib/biometricApi";

/** Upserts a batch of raw ZKBio Time transaction rows pushed by the local
 * ingest script — same upsert-by-externalId shape as every other synced
 * integration (PhoneCall/3CX), just triggered by an incoming POST instead
 * of this server calling out to the device itself. */
export async function ingestBiometricEvents(rawRows: RawTransaction[]): Promise<{ synced: number; checkIns: number; checkOuts: number }> {
  const entries = rawRows.map(toBiometricEventEntry);

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
