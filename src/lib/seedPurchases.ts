import type { PurchaseColumnDef, PurchaseDropdownOption, PurchaseItem } from "@/types/purchase";

interface SeedColumn {
  id: string;
  name: string;
  type: PurchaseColumnDef["type"];
  options?: PurchaseDropdownOption[];
}

const SEED_COLUMNS: SeedColumn[] = [
  { id: "col-article", name: "Article", type: "text" },
  { id: "col-fournisseur", name: "Fournisseur", type: "text" },
  { id: "col-quantite", name: "Quantité", type: "number" },
  {
    id: "col-statut",
    name: "Statut",
    type: "dropdown",
    options: [
      { id: "opt-a-commander", label: "À commander", color: "#f59e0b" },
      { id: "opt-commande", label: "Commandé", color: "#6366f1" },
      { id: "opt-recu", label: "Reçu", color: "#22c55e" },
      { id: "opt-annule", label: "Annulé", color: "#ef4444" },
    ],
  },
  { id: "col-photo", name: "Photo", type: "image" },
  { id: "col-fiche", name: "Fiche produit", type: "link" },
];

interface SeedItem {
  id: string;
  values: Record<string, string>;
  assigneeIds: string[];
}

const SEED_ITEMS: SeedItem[] = [
  {
    id: "purchase-1",
    values: {
      "col-article": "Casque intégral taille M",
      "col-fournisseur": "MotoParts Maroc",
      "col-quantite": "25",
      "col-statut": "Commandé",
      "col-fiche": "https://example.com/casque-integral-m",
    },
    assigneeIds: ["u2"],
  },
  {
    id: "purchase-2",
    values: {
      "col-article": "Kit chaîne 428",
      "col-fournisseur": "Atlas Distribution",
      "col-quantite": "40",
      "col-statut": "Reçu",
    },
    assigneeIds: ["u4"],
  },
  {
    id: "purchase-3",
    values: {
      "col-article": "Batterie 12V 9Ah",
      "col-fournisseur": "Electro Quad",
      "col-quantite": "15",
      "col-statut": "À commander",
    },
    assigneeIds: [],
  },
  {
    id: "purchase-4",
    values: {
      "col-article": "Housse de protection Quad",
      "col-fournisseur": "Textile Pro",
      "col-quantite": "60",
      "col-statut": "À commander",
      "col-fiche": "https://example.com/housse-quad",
    },
    assigneeIds: ["u3", "u5"],
  },
  {
    id: "purchase-5",
    values: {
      "col-article": "Filtre à huile",
      "col-fournisseur": "MotoParts Maroc",
      "col-quantite": "100",
      "col-statut": "Annulé",
    },
    assigneeIds: ["u2"],
  },
];

export function createSeedPurchaseColumns(): PurchaseColumnDef[] {
  const now = new Date().toISOString();
  return SEED_COLUMNS.map((col, index) => ({
    id: col.id,
    name: col.name,
    type: col.type,
    options: col.options ?? [],
    order: index,
    createdAt: now,
  }));
}

export function createSeedPurchaseItems(): PurchaseItem[] {
  const now = new Date().toISOString();
  return SEED_ITEMS.map((item, index) => ({
    id: item.id,
    order: index,
    values: item.values,
    assigneeIds: item.assigneeIds,
    excludedUserIds: [],
    createdAt: now,
    updatedAt: now,
  }));
}
