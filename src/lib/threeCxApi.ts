import { getValidAccessToken } from "@/lib/threeCxAuth";

const PAGE_SIZE = 500;

interface RawCallLogRow {
  CdrId: string;
  StartTime: string;
  SourceCallerId: string;
  SourceDisplayName: string | null;
  DestinationCallerId: string;
  DestinationDisplayName: string | null;
  Direction: string;
  Status: string;
  Answered: boolean;
  RingingDuration: string;
  TalkingDuration: string;
  CallCost: number;
  Reason: string | null;
}

export interface CallLogEntry {
  externalId: string;
  startTime: Date;
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
}

/** Parses an ISO 8601 duration like "PT7.800879S" into whole seconds.
 * 3CX's call log only ever uses seconds-level durations for ring/talk
 * time, so minutes/hours components aren't expected, but are handled
 * anyway rather than assuming. */
function parseIsoDurationSeconds(value: string): number {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:([\d.]+)S)?$/.exec(value);
  if (!match) return 0;
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);
  return Math.round(hours * 3600 + minutes * 60 + seconds);
}

function toCallLogEntry(row: RawCallLogRow): CallLogEntry {
  return {
    externalId: row.CdrId,
    startTime: new Date(row.StartTime),
    sourceNumber: row.SourceCallerId,
    sourceName: row.SourceDisplayName,
    destNumber: row.DestinationCallerId,
    destName: row.DestinationDisplayName,
    direction: row.Direction,
    status: row.Status,
    answered: row.Answered,
    ringSeconds: parseIsoDurationSeconds(row.RingingDuration),
    talkSeconds: parseIsoDurationSeconds(row.TalkingDuration),
    cost: row.CallCost ?? 0,
    reason: row.Reason,
  };
}

function isoNoMillis(date: Date): string {
  return date.toISOString().replace(/\.\d+Z$/, ".000Z");
}

export async function listCallLog(periodFrom: Date, periodTo: Date): Promise<CallLogEntry[]> {
  const { pbxUrl, accessToken } = await getValidAccessToken();
  const entries: CallLogEntry[] = [];
  let skip = 0;

  for (;;) {
    const params = [
      `periodFrom=${isoNoMillis(periodFrom)}`,
      `periodTo=${isoNoMillis(periodTo)}`,
      "sourceType=0",
      "sourceFilter=''",
      "destinationType=0",
      "destinationFilter=''",
      "callsType=0",
      "callTimeFilterType=0",
      "callTimeFilterFrom='0:00:00'",
      "callTimeFilterTo='0:00:00'",
      "hidePcalls=true",
    ].join(",");
    const url = `${pbxUrl}/xapi/v1/ReportCallLogData/Pbx.GetCallLogData(${params})?$top=${PAGE_SIZE}&$skip=${skip}`;
    const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" } });
    if (!response.ok) throw new Error(`3CX call log request failed (${response.status}): ${await response.text()}`);
    const data = (await response.json()) as { value: RawCallLogRow[] };
    const page = data.value ?? [];
    entries.push(...page.map(toCallLogEntry));
    if (page.length < PAGE_SIZE) break;
    skip += PAGE_SIZE;
  }

  return entries;
}
