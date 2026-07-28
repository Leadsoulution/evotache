import type { RecurrenceRule, Task, TaskPriority, TaskStatus } from "@/types/task";

// Assignee ids below (u1-u5) match the seed users in services/userApi.ts,
// so tasks come pre-assigned to real, manageable accounts.
function daysFromToday(offset: number): string {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return date.toISOString();
}

interface SeedRow {
  id: string;
  parentId: string | null;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeIds: string[];
  dueDate: string | null;
  projectId?: string | null;
  teamIds?: string[];
  description?: string;
  recurrence?: RecurrenceRule | null;
}

const PROJECT_INTERNAL_TOOLS = "proj-internal-tools";
const PROJECT_MARKETING_Q3 = "proj-marketing-q3";
const PROJECT_LPR = "proj-lpr-maroc";
// Department ids — see services/teamApi.ts for the current display names
// (MARKETING DIGITAL / COMMERCIAL / ADMINISTRATIF / ATELIER).
const TEAM_WEB = "team-web";
const TEAM_DESIGN = "team-design";
const TEAM_OPS = "team-ops";
const TEAM_ATELIER = "team-atelier";

// Website-creation example project: "Site Web LPR Maroc". The Quads category
// below uses the 4 real models provided so far (Trooper 110, Hawk 200R,
// Hawk 200 RT, Hawk 250R) with their real 2-file structure; everything else
// (other phases, other future catalog categories) is illustrative demo
// content, not real LPR data, until the full list is provided.
const LPR_ROWS: SeedRow[] = [
  // Phase 1 — Design & UX
  { id: "lpr-design", parentId: null, title: "Design & UX", status: "in_progress", priority: "high", assigneeIds: ["u3"], dueDate: daysFromToday(6), projectId: PROJECT_LPR, teamIds: [TEAM_WEB] },
  { id: "lpr-design-1", parentId: "lpr-design", title: "Wireframes desktop & mobile", status: "done", priority: "normal", assigneeIds: ["u3"], dueDate: daysFromToday(-3) },
  { id: "lpr-design-2", parentId: "lpr-design", title: "Charte graphique / design system", status: "in_progress", priority: "normal", assigneeIds: ["u3"], dueDate: daysFromToday(2) },
  { id: "lpr-design-3", parentId: "lpr-design", title: "Maquettes des pages catalogue", status: "todo", priority: "normal", assigneeIds: ["u3"], dueDate: daysFromToday(5) },

  // Phase 2 — Création du catalogue LPR Maroc
  { id: "lpr-catalog", parentId: null, title: "Création du catalogue LPR Maroc", status: "in_progress", priority: "high", assigneeIds: ["u2"], dueDate: daysFromToday(10), projectId: PROJECT_LPR, teamIds: [TEAM_WEB] },
  { id: "lpr-catalog-quads", parentId: "lpr-catalog", title: "Quads", status: "in_progress", priority: "high", assigneeIds: ["u2"], dueDate: daysFromToday(8) },
  { id: "lpr-quad-trooper110", parentId: "lpr-catalog-quads", title: "Trooper 110", status: "in_progress", priority: "normal", assigneeIds: ["u2"], dueDate: daysFromToday(4) },
  { id: "lpr-quad-trooper110-1", parentId: "lpr-quad-trooper110", title: "Fichier Excel des composants de véhicule", status: "done", priority: "normal", assigneeIds: ["u2"], dueDate: daysFromToday(-2) },
  { id: "lpr-quad-trooper110-2", parentId: "lpr-quad-trooper110", title: "Fichier Excel des pièces moteur", status: "todo", priority: "normal", assigneeIds: ["u2"], dueDate: daysFromToday(4) },
  { id: "lpr-quad-hawk200r", parentId: "lpr-catalog-quads", title: "Hawk 200R", status: "in_progress", priority: "normal", assigneeIds: ["u4"], dueDate: daysFromToday(5) },
  { id: "lpr-quad-hawk200r-1", parentId: "lpr-quad-hawk200r", title: "Fichier Excel des composants de véhicule", status: "done", priority: "normal", assigneeIds: ["u4"], dueDate: daysFromToday(-1) },
  { id: "lpr-quad-hawk200r-2", parentId: "lpr-quad-hawk200r", title: "Fichier Excel des pièces moteur", status: "todo", priority: "normal", assigneeIds: ["u4"], dueDate: daysFromToday(5) },
  { id: "lpr-quad-hawk200rt", parentId: "lpr-catalog-quads", title: "Hawk 200 RT", status: "todo", priority: "normal", assigneeIds: ["u4"], dueDate: daysFromToday(6) },
  { id: "lpr-quad-hawk200rt-1", parentId: "lpr-quad-hawk200rt", title: "Fichier Excel des composants de véhicule", status: "todo", priority: "normal", assigneeIds: ["u4"], dueDate: daysFromToday(6) },
  { id: "lpr-quad-hawk200rt-2", parentId: "lpr-quad-hawk200rt", title: "Fichier Excel des pièces moteur", status: "todo", priority: "normal", assigneeIds: ["u4"], dueDate: daysFromToday(6) },
  { id: "lpr-quad-hawk250r", parentId: "lpr-catalog-quads", title: "Hawk 250R", status: "todo", priority: "normal", assigneeIds: ["u2"], dueDate: daysFromToday(7) },
  { id: "lpr-quad-hawk250r-1", parentId: "lpr-quad-hawk250r", title: "Fichier Excel des composants de véhicule", status: "todo", priority: "normal", assigneeIds: ["u2"], dueDate: daysFromToday(7) },
  { id: "lpr-quad-hawk250r-2", parentId: "lpr-quad-hawk250r", title: "Fichier Excel des pièces moteur", status: "todo", priority: "normal", assigneeIds: ["u2"], dueDate: daysFromToday(7) },
  { id: "lpr-quad-xtank200r", parentId: "lpr-catalog-quads", title: "XTANK 200R", status: "todo", priority: "normal", assigneeIds: ["u4"], dueDate: daysFromToday(8) },
  { id: "lpr-quad-xtank200r-1", parentId: "lpr-quad-xtank200r", title: "Fichier Excel des composants de véhicule", status: "todo", priority: "normal", assigneeIds: ["u4"], dueDate: daysFromToday(8) },
  { id: "lpr-quad-xtank200r-2", parentId: "lpr-quad-xtank200r", title: "Fichier Excel des pièces moteur", status: "todo", priority: "normal", assigneeIds: ["u4"], dueDate: daysFromToday(8) },

  // Phase 3 — Développement
  { id: "lpr-dev", parentId: null, title: "Développement", status: "todo", priority: "high", assigneeIds: ["u7"], dueDate: daysFromToday(15), projectId: PROJECT_LPR, teamIds: [TEAM_ATELIER] },
  { id: "lpr-dev-1", parentId: "lpr-dev", title: "Intégration Next.js du template", status: "todo", priority: "normal", assigneeIds: ["u7"], dueDate: daysFromToday(12) },
  { id: "lpr-dev-2", parentId: "lpr-dev", title: "Page catalogue filtrable (modèle, gamme, prix)", status: "todo", priority: "normal", assigneeIds: ["u7"], dueDate: daysFromToday(14) },
  { id: "lpr-dev-3", parentId: "lpr-dev", title: "Formulaire de contact / demande de devis", status: "todo", priority: "low", assigneeIds: ["u7"], dueDate: daysFromToday(15) },

  // Phase 4 — Contenu & SEO
  { id: "lpr-content", parentId: null, title: "Contenu & SEO", status: "todo", priority: "normal", assigneeIds: ["u5"], dueDate: daysFromToday(18), projectId: PROJECT_LPR, teamIds: [TEAM_WEB] },
  { id: "lpr-content-1", parentId: "lpr-content", title: "Rédaction des fiches produits", status: "todo", priority: "normal", assigneeIds: ["u5"], dueDate: daysFromToday(16) },
  { id: "lpr-content-2", parentId: "lpr-content", title: "Optimisation SEO on-page", status: "todo", priority: "low", assigneeIds: ["u5"], dueDate: daysFromToday(17) },
  { id: "lpr-content-3", parentId: "lpr-content", title: "Traduction FR / AR", status: "todo", priority: "low", assigneeIds: ["u5"], dueDate: daysFromToday(18) },

  // Phase 5 — Tests & recette
  { id: "lpr-qa", parentId: null, title: "Tests & recette", status: "todo", priority: "normal", assigneeIds: ["u4"], dueDate: daysFromToday(21), projectId: PROJECT_LPR, teamIds: [TEAM_ATELIER] },
  { id: "lpr-qa-1", parentId: "lpr-qa", title: "Tests cross-browser", status: "todo", priority: "normal", assigneeIds: ["u4"], dueDate: daysFromToday(19) },
  { id: "lpr-qa-2", parentId: "lpr-qa", title: "Tests responsive mobile / tablette", status: "todo", priority: "normal", assigneeIds: ["u4"], dueDate: daysFromToday(20) },
  { id: "lpr-qa-3", parentId: "lpr-qa", title: "Recette client", status: "todo", priority: "high", assigneeIds: ["u2"], dueDate: daysFromToday(21) },

  // Phase 6 — Mise en ligne
  { id: "lpr-launch", parentId: null, title: "Mise en ligne", status: "todo", priority: "high", assigneeIds: ["u2"], dueDate: daysFromToday(25), projectId: PROJECT_LPR, teamIds: [TEAM_ATELIER] },
  { id: "lpr-launch-1", parentId: "lpr-launch", title: "Configuration nom de domaine & hébergement", status: "todo", priority: "high", assigneeIds: ["u7"], dueDate: daysFromToday(23) },
  { id: "lpr-launch-2", parentId: "lpr-launch", title: "Déploiement en production", status: "todo", priority: "urgent", assigneeIds: ["u7"], dueDate: daysFromToday(24) },
  { id: "lpr-launch-3", parentId: "lpr-launch", title: "Formation client à l'administration du site", status: "todo", priority: "normal", assigneeIds: ["u2"], dueDate: daysFromToday(25) },

  // A few more Internal Tools / Marketing Q3 tasks so both projects feel populated too.
  { id: "seed-19", parentId: null, title: "Set up CI/CD pipeline", status: "in_progress", priority: "high", assigneeIds: ["u7"], dueDate: daysFromToday(3), projectId: PROJECT_INTERNAL_TOOLS, teamIds: [TEAM_ATELIER] },
  { id: "seed-20", parentId: null, title: "Configure error monitoring (Sentry)", status: "todo", priority: "normal", assigneeIds: ["u7"], dueDate: daysFromToday(6), projectId: PROJECT_INTERNAL_TOOLS, teamIds: [TEAM_ATELIER] },
  { id: "seed-21", parentId: null, title: "Write internal API documentation", status: "todo", priority: "low", assigneeIds: ["u4"], dueDate: daysFromToday(9), projectId: PROJECT_INTERNAL_TOOLS, teamIds: [TEAM_ATELIER] },
  { id: "seed-22", parentId: null, title: "Design social media creatives", status: "in_progress", priority: "normal", assigneeIds: ["u3"], dueDate: daysFromToday(4), projectId: PROJECT_MARKETING_Q3, teamIds: [TEAM_WEB] },
  { id: "seed-23", parentId: null, title: "Write email campaign copy", status: "todo", priority: "normal", assigneeIds: ["u5"], dueDate: daysFromToday(6), projectId: PROJECT_MARKETING_Q3, teamIds: [TEAM_WEB] },
  { id: "seed-24", parentId: null, title: "Set up campaign analytics dashboard", status: "todo", priority: "low", assigneeIds: ["u7"], dueDate: daysFromToday(8), projectId: PROJECT_MARKETING_Q3, teamIds: [TEAM_WEB] },
];

const ROWS: SeedRow[] = [
  { id: "seed-1", parentId: null, title: "Design the new onboarding flow", status: "in_progress", priority: "high", assigneeIds: ["u3"], dueDate: daysFromToday(2), teamIds: [TEAM_WEB] },
  { id: "seed-1a", parentId: "seed-1", title: "Wireframe the welcome screens", status: "done", priority: "normal", assigneeIds: ["u3"], dueDate: daysFromToday(-2) },
  { id: "seed-1b", parentId: "seed-1", title: "Write onboarding copy", status: "in_progress", priority: "normal", assigneeIds: ["u3"], dueDate: daysFromToday(1) },
  { id: "seed-1c", parentId: "seed-1", title: "User-test the flow with 5 people", status: "todo", priority: "low", assigneeIds: [], dueDate: null },
  { id: "seed-2", parentId: null, title: "Fix pagination bug on invoices table", status: "todo", priority: "urgent", assigneeIds: ["u1"], dueDate: daysFromToday(-1), teamIds: [TEAM_ATELIER] },
  { id: "seed-3", parentId: null, title: "Write Q3 product roadmap doc", status: "todo", priority: "normal", assigneeIds: ["u6"], dueDate: daysFromToday(7), teamIds: [TEAM_OPS] },
  { id: "seed-4", parentId: null, title: "Review pull request #482", status: "in_review", priority: "high", assigneeIds: ["u4", "u1"], dueDate: daysFromToday(0), teamIds: [TEAM_ATELIER] },
  {
    id: "seed-5",
    parentId: null,
    title: "Set up staging environment for API v2",
    status: "in_progress",
    priority: "urgent",
    assigneeIds: ["u7"],
    dueDate: daysFromToday(1),
    projectId: PROJECT_INTERNAL_TOOLS,
    teamIds: [TEAM_ATELIER],
  },
  {
    id: "seed-5a",
    parentId: "seed-5",
    title: "Provision database instance",
    status: "done",
    priority: "normal",
    assigneeIds: ["u7"],
    dueDate: daysFromToday(-1),
    projectId: PROJECT_INTERNAL_TOOLS,
  },
  {
    id: "seed-5b",
    parentId: "seed-5",
    title: "Configure secrets & env vars",
    status: "todo",
    priority: "high",
    assigneeIds: ["u7"],
    dueDate: daysFromToday(1),
    projectId: PROJECT_INTERNAL_TOOLS,
  },
  { id: "seed-6", parentId: null, title: "Migrate legacy auth tokens", status: "todo", priority: "low", assigneeIds: [], dueDate: null, projectId: PROJECT_INTERNAL_TOOLS, teamIds: [TEAM_ATELIER] },
  { id: "seed-7", parentId: null, title: "Update Tailwind design tokens", status: "done", priority: "normal", assigneeIds: ["u3"], dueDate: daysFromToday(-5), teamIds: [TEAM_WEB] },
  {
    id: "seed-8",
    parentId: null,
    title: "Prepare investor update slides",
    status: "todo",
    priority: "high",
    assigneeIds: ["u5"],
    dueDate: daysFromToday(3),
    projectId: PROJECT_MARKETING_Q3,
    teamIds: [TEAM_OPS],
  },
  { id: "seed-9", parentId: null, title: "Audit accessibility on marketing site", status: "in_review", priority: "normal", assigneeIds: ["u4"], dueDate: daysFromToday(4), teamIds: [TEAM_WEB] },
  { id: "seed-10", parentId: null, title: "Refactor task list virtualization", status: "todo", priority: "none", assigneeIds: [], dueDate: null, teamIds: [TEAM_ATELIER] },
  { id: "seed-11", parentId: null, title: "Investigate flaky checkout E2E test", status: "in_progress", priority: "urgent", assigneeIds: ["u2", "u7"], dueDate: daysFromToday(0), teamIds: [TEAM_ATELIER] },
  { id: "seed-12", parentId: null, title: "Draft customer changelog for release 4.2", status: "done", priority: "low", assigneeIds: ["u5"], dueDate: daysFromToday(-3), teamIds: [TEAM_DESIGN] },
  { id: "seed-13", parentId: null, title: "Benchmark Postgres read replicas", status: "todo", priority: "normal", assigneeIds: ["u7"], dueDate: daysFromToday(10), teamIds: [TEAM_ATELIER] },
  { id: "seed-14", parentId: null, title: "Redesign empty states across app", status: "todo", priority: "low", assigneeIds: ["u3"], dueDate: daysFromToday(14), teamIds: [TEAM_WEB] },
  { id: "seed-15", parentId: null, title: "Ship dark mode to production", status: "in_review", priority: "high", assigneeIds: ["u2"], dueDate: daysFromToday(1), teamIds: [TEAM_ATELIER] },
  {
    id: "seed-16",
    parentId: null,
    title: "Sync with legal on new ToS copy",
    status: "todo",
    priority: "normal",
    assigneeIds: ["u6"],
    dueDate: daysFromToday(5),
    projectId: PROJECT_MARKETING_Q3,
    teamIds: [TEAM_OPS],
  },
  { id: "seed-17", parentId: null, title: "Clean up unused Storybook stories", status: "done", priority: "none", assigneeIds: ["u4"], dueDate: daysFromToday(-8), teamIds: [TEAM_ATELIER] },
  { id: "seed-18", parentId: null, title: "Load-test websocket notifications", status: "in_progress", priority: "high", assigneeIds: ["u7"], dueDate: daysFromToday(2), teamIds: [TEAM_ATELIER] },
  {
    id: "seed-25",
    parentId: null,
    title: "Daily database backup check",
    status: "todo",
    priority: "normal",
    assigneeIds: ["u7"],
    dueDate: daysFromToday(1),
    projectId: PROJECT_INTERNAL_TOOLS,
    teamIds: [TEAM_ATELIER],
    recurrence: { frequency: "daily", interval: 1, daysOfWeek: [], dayOfMonth: null },
  },
  {
    id: "seed-26",
    parentId: null,
    title: "Weekly team sync notes",
    status: "todo",
    priority: "normal",
    assigneeIds: ["u1"],
    dueDate: daysFromToday(3),
    teamIds: [TEAM_OPS],
    recurrence: { frequency: "weekly", interval: 1, daysOfWeek: [1], dayOfMonth: null },
  },
  {
    id: "seed-27",
    parentId: null,
    title: "Monthly invoicing reconciliation",
    status: "todo",
    priority: "high",
    assigneeIds: ["u6"],
    dueDate: daysFromToday(9),
    teamIds: [TEAM_OPS],
    recurrence: { frequency: "monthly", interval: 1, daysOfWeek: [], dayOfMonth: 1 },
  },
];

const ALL_TASK_ROWS: SeedRow[] = [...ROWS, ...LPR_ROWS];

export function createSeedTasks(): Task[] {
  const now = new Date().toISOString();
  return ALL_TASK_ROWS.map((row, index) => ({
    id: row.id,
    module: "task",
    parentId: row.parentId,
    title: row.title,
    description: row.description ?? "",
    status: row.status,
    priority: row.priority,
    assigneeIds: row.assigneeIds,
    teamIds: row.teamIds ?? [],
    excludedUserIds: [],
    dueDate: row.dueDate,
    recurrence: row.recurrence ?? null,
    projectId: row.projectId ?? null,
    order: index,
    customValues: {},
    createdAt: now,
    updatedAt: now,
  }));
}

// Litiges (disputes) reuse the exact same task engine/statuses/priorities as Tasks
// (see module discriminator on Task), just filtered into their own section.
const DISPUTE_ROWS: SeedRow[] = [
  { id: "dispute-1", parentId: null, title: "Litige facturation — client MXSHOP", status: "in_progress", priority: "urgent", assigneeIds: ["u2", "u1"], dueDate: daysFromToday(3), teamIds: [TEAM_OPS] },
  { id: "dispute-2", parentId: null, title: "Réclamation qualité — livraison HAWK 200R", status: "todo", priority: "high", assigneeIds: ["u4"], dueDate: daysFromToday(5), teamIds: [TEAM_DESIGN] },
  { id: "dispute-3", parentId: null, title: "Retard de paiement — fournisseur pièces moteur", status: "in_review", priority: "normal", assigneeIds: ["u6"], dueDate: daysFromToday(10), teamIds: [TEAM_OPS] },
  { id: "dispute-4", parentId: null, title: "Litige contractuel — prestataire logistique", status: "done", priority: "low", assigneeIds: ["u2"], dueDate: daysFromToday(-4), teamIds: [TEAM_OPS] },
  {
    id: "dispute-5",
    parentId: null,
    title: "Suivi hebdomadaire des retours produits",
    status: "todo",
    priority: "normal",
    assigneeIds: ["u4"],
    dueDate: daysFromToday(2),
    teamIds: [TEAM_DESIGN],
    recurrence: { frequency: "weekly", interval: 1, daysOfWeek: [5], dayOfMonth: null },
  },
];

export function createSeedDisputes(): Task[] {
  const now = new Date().toISOString();
  return DISPUTE_ROWS.map((row, index) => ({
    id: row.id,
    module: "dispute",
    parentId: row.parentId,
    title: row.title,
    description: row.description ?? "",
    status: row.status,
    priority: row.priority,
    assigneeIds: row.assigneeIds,
    teamIds: row.teamIds ?? [],
    excludedUserIds: [],
    dueDate: row.dueDate,
    recurrence: row.recurrence ?? null,
    projectId: row.projectId ?? null,
    order: index,
    customValues: {},
    createdAt: now,
    updatedAt: now,
  }));
}
