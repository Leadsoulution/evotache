export type ReminderKind = "overdue_escalation" | "meeting";

export interface ReminderRule {
  id: string;
  name: string;
  kind: ReminderKind;
  enabled: boolean;

  timesOfDay: string[];
  notifyAssignee: boolean;
  notifyManager: boolean;

  meetingAt: string | null;
  minutesBefore: number | null;
  wholeTeam: boolean;
  audienceUserIds: string[];
  audienceTeamIds: string[];

  viaPush: boolean;
  viaAgentChat: boolean;
  agentId: string | null;

  lastRunAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReminderRuleInput {
  name: string;
  kind: ReminderKind;
  enabled?: boolean;
  timesOfDay?: string[];
  notifyAssignee?: boolean;
  notifyManager?: boolean;
  meetingAt?: string | null;
  minutesBefore?: number | null;
  wholeTeam?: boolean;
  audienceUserIds?: string[];
  audienceTeamIds?: string[];
  viaPush?: boolean;
  viaAgentChat?: boolean;
  agentId?: string | null;
}
