export type CallType = "Inbound" | "Outbound" | "Missed" | "Unanswered";

export interface PhoneCall {
  id: number;
  contactNumber: string;
  agentExtension: string;
  callType: string;
  startTime: string;
  duration: number;
  createdAt: string;
}
