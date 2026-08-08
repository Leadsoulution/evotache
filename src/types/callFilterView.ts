export interface CallFilterView {
  id: string;
  name: string;
  search: string;
  statusFilter: string[];
  directionFilter: string[];
  dateFrom: string;
  dateTo: string;
  dateRangeLabel: string;
  timeFrom: string;
  timeTo: string;
  businessHoursOnly: boolean;
  timeRangeLabel: string;
  selectedUserDn: string | null;
  unhandledOnly: boolean;
}

export interface CallFilterViewInput {
  name: string;
  search: string;
  statusFilter: string[];
  directionFilter: string[];
  dateFrom: string;
  dateTo: string;
  dateRangeLabel: string;
  timeFrom: string;
  timeTo: string;
  businessHoursOnly: boolean;
  timeRangeLabel: string;
  selectedUserDn: string | null;
  unhandledOnly: boolean;
}
