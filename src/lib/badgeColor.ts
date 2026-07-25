function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace("#", "");
  const expanded = normalized.length === 3 ? normalized.split("").map((c) => c + c).join("") : normalized;
  const bigint = parseInt(expanded, 16);
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
}

/** Tinted background (from the entity's own color) + the color itself as text, so a status/priority badge reads as a fully colored chip instead of a gray pill with a dot. */
export function getBadgeStyle(hex: string | undefined | null): { backgroundColor: string; color: string } {
  const color = hex ?? "#94a3b8";
  const { r, g, b } = hexToRgb(color);
  return {
    backgroundColor: `rgba(${r}, ${g}, ${b}, 0.16)`,
    color,
  };
}
