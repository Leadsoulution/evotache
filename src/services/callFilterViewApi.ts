import type { CallFilterView, CallFilterViewInput } from "@/types/callFilterView";

export async function fetchCallFilterViews(): Promise<CallFilterView[]> {
  const response = await fetch("/api/calls/filter-views");
  if (!response.ok) return [];
  return response.json();
}

export async function createCallFilterView(input: CallFilterViewInput): Promise<CallFilterView> {
  const response = await fetch("/api/calls/filter-views", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error("Échec de l'enregistrement du filtre.");
  return response.json();
}

export async function deleteCallFilterView(id: string): Promise<void> {
  const response = await fetch(`/api/calls/filter-views/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!response.ok) throw new Error("Échec de la suppression du filtre.");
}
