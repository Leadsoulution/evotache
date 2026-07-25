export type CustomFieldType = "text" | "number" | "date" | "select";

export interface CustomFieldDef {
  id: string;
  name: string;
  type: CustomFieldType;
  options: string[];
  order: number;
  createdAt: string;
}
