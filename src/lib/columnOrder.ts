/**
 * Applies a saved column order preference on top of a table's natural/default
 * column ids. Ids from `savedOrder` that still exist are placed first (in
 * their saved sequence); anything new (not yet in `savedOrder`, e.g. a
 * freshly added custom field) or since-removed is reconciled by falling back
 * to `naturalIds`' own order, appended at the end.
 */
export function applyColumnOrder(naturalIds: string[], savedOrder: string[]): string[] {
  const naturalSet = new Set(naturalIds);
  const ordered = savedOrder.filter((id) => naturalSet.has(id));
  const orderedSet = new Set(ordered);
  const remaining = naturalIds.filter((id) => !orderedSet.has(id));
  return [...ordered, ...remaining];
}
