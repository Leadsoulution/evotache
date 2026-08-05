import type { PhoneCall as DbPhoneCall } from "@/generated/prisma/client";
import type { PhoneCall } from "@/types/call";

export function toPublicPhoneCall(call: DbPhoneCall): PhoneCall {
  return {
    id: call.id,
    externalId: call.externalId,
    startTime: call.startTime.toISOString(),
    sourceNumber: call.sourceNumber,
    sourceName: call.sourceName,
    sourceDn: call.sourceDn,
    destNumber: call.destNumber,
    destName: call.destName,
    destDn: call.destDn,
    direction: call.direction,
    status: call.status,
    answered: call.answered,
    ringSeconds: call.ringSeconds,
    talkSeconds: call.talkSeconds,
    cost: call.cost,
    reason: call.reason,
    createdAt: call.createdAt.toISOString(),
  };
}
