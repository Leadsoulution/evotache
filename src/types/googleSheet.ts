export interface ColumnMapping {
  name: string | null;
  reference: string | null;
  lastSaleDate: string | null;
  purchaseDate: string | null;
}

export interface GoogleSheetStatus {
  configured: boolean;
  webAppUrl: string | null;
  maskedToken: string | null;
  columnMapping: ColumnMapping;
  productsPerDay: number;
}

/** A product row from the sheet, normalized and scored for "dead stock" priority — the longer since its last sale (or, failing that, its purchase), the higher it ranks. */
export interface RankedProduct {
  id: string;
  name: string;
  reference: string | null;
  lastSaleDate: string | null;
  purchaseDate: string | null;
  daysSinceLastSale: number | null;
  daysSincePurchase: number | null;
  stalenessDays: number | null;
}
