import type { ColumnMapping, RankedProduct } from "@/types/googleSheet";

function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysSince(date: Date | null): number | null {
  if (!date) return null;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)));
}

/**
 * Ranks sheet rows by "dead stock" priority: longest since the last sale
 * comes first; a product that's never sold falls back to time since
 * purchase; a product with neither date sinks to the bottom (unknown, not
 * urgent) rather than being dropped, so it's still visible in the list.
 */
export function rankProducts(rows: Record<string, string>[], mapping: ColumnMapping): RankedProduct[] {
  if (!mapping.name) return [];

  const ranked = rows
    .map((row, index): RankedProduct => {
      const name = (row[mapping.name as string] ?? "").trim();
      const reference = mapping.reference ? (row[mapping.reference] ?? "").trim() || null : null;
      const lastSaleDate = parseDate(mapping.lastSaleDate ? row[mapping.lastSaleDate] : undefined);
      const purchaseDate = parseDate(mapping.purchaseDate ? row[mapping.purchaseDate] : undefined);
      const daysSinceLastSale = daysSince(lastSaleDate);
      const daysSincePurchase = daysSince(purchaseDate);
      return {
        id: reference ?? `${name || "row"}-${index}`,
        name,
        reference,
        lastSaleDate: lastSaleDate ? lastSaleDate.toISOString() : null,
        purchaseDate: purchaseDate ? purchaseDate.toISOString() : null,
        daysSinceLastSale,
        daysSincePurchase,
        stalenessDays: daysSinceLastSale ?? daysSincePurchase ?? null,
      };
    })
    .filter((product) => product.name);

  return ranked.sort((a, b) => (b.stalenessDays ?? -1) - (a.stalenessDays ?? -1));
}
