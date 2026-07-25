export const COLOR_PALETTE: string[] = [
  "#64748b",
  "#6366f1",
  "#ec4899",
  "#22c55e",
  "#f59e0b",
  "#06b6d4",
  "#a855f7",
  "#ef4444",
  "#0ea5e9",
  "#84cc16",
];

export function randomPaletteColor(): string {
  return COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
}
