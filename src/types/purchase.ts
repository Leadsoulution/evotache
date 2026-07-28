export type PurchaseColumnType = "text" | "number" | "dropdown" | "image" | "video" | "link" | "date";

export interface PurchaseDropdownOption {
  id: string;
  label: string;
  color: string;
}

export interface PurchaseColumnDef {
  id: string;
  name: string;
  type: PurchaseColumnType;
  /** Dropdown only. */
  options: PurchaseDropdownOption[];
  order: number;
  createdAt: string;
}

export interface PurchaseItem {
  id: string;
  order: number;
  /** Keyed by column id. Text/number/dropdown/link store the raw string; image/video store a data URL. */
  values: Record<string, string>;
  /** Fixed field, always present — who the purchase is assigned to. */
  assigneeIds: string[];
  /** Users this row is explicitly hidden from — same convention as Task.excludedUserIds; admins always see every row regardless. */
  excludedUserIds: string[];
  createdAt: string;
  updatedAt: string;
}
