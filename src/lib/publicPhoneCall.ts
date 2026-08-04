import type { PhoneCall as DbPhoneCall } from "@/generated/prisma/client";
import type { PhoneCall } from "@/types/call";

export function toPublicPhoneCall(call: DbPhoneCall): PhoneCall {
  return {
    id: call.id,
    contactNumber: call.contactNumber,
    agentExtension: call.agentExtension,
    callType: call.callType,
    startTime: call.startTime.toISOString(),
    duration: call.duration,
    createdAt: call.createdAt.toISOString(),
  };
}
