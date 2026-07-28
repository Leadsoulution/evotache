export type CustomFieldType = "text" | "number" | "date" | "select" | "image" | "video" | "link";

export interface CustomFieldOption {
  id: string;
  label: string;
  color: string;
}

export interface CustomFieldDef {
  id: string;
  name: string;
  type: CustomFieldType;
  /** "select" only. */
  options: CustomFieldOption[];
  order: number;
  createdAt: string;
}
