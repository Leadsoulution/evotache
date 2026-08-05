export interface PhoneCall {
  id: number;
  externalId: string;
  startTime: string;
  sourceNumber: string;
  sourceName: string | null;
  sourceDn: string;
  destNumber: string;
  destName: string | null;
  destDn: string;
  direction: string;
  status: string;
  answered: boolean;
  ringSeconds: number;
  talkSeconds: number;
  cost: number;
  reason: string | null;
  createdAt: string;
}
