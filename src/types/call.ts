export interface PhoneCall {
  id: number;
  externalId: string;
  startTime: string;
  sourceNumber: string;
  sourceName: string | null;
  destNumber: string;
  destName: string | null;
  direction: string;
  status: string;
  answered: boolean;
  ringSeconds: number;
  talkSeconds: number;
  cost: number;
  reason: string | null;
  createdAt: string;
}
