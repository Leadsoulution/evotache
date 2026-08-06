import type { BiometricEvent as DbBiometricEvent } from "@/generated/prisma/client";
import type { BiometricEvent } from "@/types/biometric";

export function toPublicBiometricEvent(event: DbBiometricEvent): BiometricEvent {
  return {
    id: event.id,
    externalId: event.externalId,
    empCode: event.empCode,
    employeeName: event.employeeName,
    department: event.department,
    position: event.position,
    punchTime: event.punchTime.toISOString(),
    punchState: event.punchState,
    punchStateLabel: event.punchStateLabel,
    verifyType: event.verifyType,
    terminalAlias: event.terminalAlias,
    createdAt: event.createdAt.toISOString(),
  };
}
