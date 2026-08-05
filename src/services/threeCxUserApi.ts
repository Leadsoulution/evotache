import type { ThreeCxUserOverride } from "@/lib/callStats";

export async function fetchThreeCxUserOverrides(): Promise<ThreeCxUserOverride[]> {
  const response = await fetch("/api/calls/users");
  if (!response.ok) return [];
  return response.json();
}

export async function saveThreeCxUserOverride(
  dn: string,
  patch: { name?: string | null; color?: string | null; hidden?: boolean }
): Promise<ThreeCxUserOverride> {
  const response = await fetch(`/api/calls/users/${encodeURIComponent(dn)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!response.ok) throw new Error("Échec de la mise à jour de l'utilisateur.");
  return response.json();
}
