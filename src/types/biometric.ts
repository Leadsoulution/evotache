export interface BiometricEvent {
  id: number;
  externalId: string;
  empCode: string;
  employeeName: string;
  department: string | null;
  position: string | null;
  punchTime: string;
  punchState: string;
  punchStateLabel: string;
  verifyType: string | null;
  terminalAlias: string | null;
  createdAt: string;
}
