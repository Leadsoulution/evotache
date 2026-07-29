// Recreates today's localStorage demo data in Postgres, so the demo
// experience (same users/departments/projects/tasks/achats) is unchanged
// after the migration. Run via `npx prisma db seed`.
import { config } from "dotenv";
config({ path: ".env.local" });

import bcrypt from "bcryptjs";
import { PrismaClient, Prisma } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL });
const prisma = new PrismaClient({ adapter });

function daysFromToday(offset: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return d;
}

async function seedUsers() {
  const rows = [
    { id: "u1", name: "Elmahdi Bouzida", email: "elmahdi@evotasks.com", password: "admin123", role: "admin" as const, color: "#a855f7", managerIds: [] as string[] },
    { id: "u2", name: "Amine Bahazzaz", email: "amine@evotasks.com", password: "admin123", role: "admin" as const, color: "#6366f1", managerIds: [] },
    { id: "u3", name: "Mouad", email: "mouad@evotasks.com", password: "member123", role: "member" as const, color: "#ec4899", managerIds: ["u2"] },
    { id: "u4", name: "Yassine", email: "yassine@evotasks.com", password: "member123", role: "member" as const, color: "#22c55e", managerIds: ["u1"] },
    { id: "u5", name: "Rabie", email: "rabie@evotasks.com", password: "limited123", role: "member_limited" as const, color: "#f59e0b", managerIds: ["u3", "u4"] },
    { id: "u6", name: "Moha", email: "moha@evotasks.com", password: "limited123", role: "member_limited" as const, color: "#ef4444", managerIds: ["u3", "u4"] },
    { id: "u7", name: "Reda", email: "reda@evotasks.com", password: "viewer123", role: "viewer" as const, color: "#06b6d4", managerIds: ["u4"] },
  ];
  for (const row of rows) {
    const passwordHash = await bcrypt.hash(row.password, 10);
    await prisma.user.upsert({
      where: { id: row.id },
      create: {
        id: row.id,
        name: row.name,
        email: row.email,
        passwordHash,
        role: row.role,
        color: row.color,
        managerIds: row.managerIds,
        visibleSectionHrefs: Prisma.JsonNull,
        hiddenColumnIds: [],
      },
      update: {},
    });
  }
  console.log(`Seeded ${rows.length} users.`);
}

async function seedTeams() {
  const rows = [
    { id: "team-web", name: "MARKETING DIGITAL", color: "#6366f1", memberIds: ["u2", "u4", "u7"] },
    { id: "team-design", name: "COMMERCIAL", color: "#ec4899", memberIds: ["u3", "u6"] },
    { id: "team-ops", name: "ADMINISTRATIF", color: "#22c55e", memberIds: ["u1", "u2", "u5"] },
    { id: "team-atelier", name: "ATELIER", color: "#f97316", memberIds: [] as string[] },
  ];
  for (const row of rows) {
    await prisma.team.upsert({
      where: { id: row.id },
      create: { id: row.id, name: row.name, color: row.color, memberIds: row.memberIds, excludedUserIds: [] },
      update: {},
    });
  }
  console.log(`Seeded ${rows.length} departments.`);
}

async function seedProjects() {
  const rows = [
    { id: "proj-evobike", name: "EVOBIKE", description: "Boutique et opérations EVOBIKE.", color: "#ef4444", teamIds: [] as string[] },
    { id: "proj-lpr-maroc", name: "LPR MAROC", description: "Refonte du site vitrine et catalogue produits LPR Maroc.", color: "#6366f1", teamIds: ["team-web"] },
    { id: "proj-internal-tools", name: "EVOTRACEUR", description: "Outils et tableaux de bord internes EVOTRACEUR.", color: "#22c55e", teamIds: ["team-ops"] },
    { id: "proj-marketing-q3", name: "BAYSONE", description: "Projet BAYSONE.", color: "#f59e0b", teamIds: [] as string[] },
  ];
  for (const row of rows) {
    await prisma.project.upsert({
      where: { id: row.id },
      create: { id: row.id, name: row.name, description: row.description, color: row.color, teamIds: row.teamIds, excludedUserIds: [] },
      update: {},
    });
  }
  console.log(`Seeded ${rows.length} projects.`);
}

async function seedStatusesAndPriorities() {
  const statuses = [
    { id: "todo", label: "To Do", color: "#94a3b8", order: 0 },
    { id: "in_progress", label: "In Progress", color: "#3b82f6", order: 1 },
    { id: "in_review", label: "In Review", color: "#f59e0b", order: 2 },
    { id: "done", label: "Done", color: "#10b981", order: 3 },
  ];
  for (const s of statuses) {
    await prisma.statusDef.upsert({ where: { id: s.id }, create: s, update: {} });
  }
  const priorities = [
    { id: "urgent", label: "Urgent", color: "#ef4444", order: 0 },
    { id: "high", label: "High", color: "#f97316", order: 1 },
    { id: "normal", label: "Normal", color: "#3b82f6", order: 2 },
    { id: "low", label: "Low", color: "#94a3b8", order: 3 },
    { id: "none", label: "No priority", color: "#cbd5e1", order: 4 },
  ];
  for (const p of priorities) {
    await prisma.priorityDef.upsert({ where: { id: p.id }, create: p, update: {} });
  }
  console.log(`Seeded ${statuses.length} statuses and ${priorities.length} priorities.`);
}

interface TaskRow {
  id: string;
  parentId: string | null;
  title: string;
  status: string;
  priority: string;
  assigneeIds: string[];
  dueDate: Date | null;
  projectId?: string | null;
  teamIds?: string[];
  recurrence?: object | null;
}

const TEAM_WEB = "team-web";
const TEAM_DESIGN = "team-design";
const TEAM_OPS = "team-ops";
const TEAM_ATELIER = "team-atelier";
const PROJECT_LPR = "proj-lpr-maroc";
const PROJECT_INTERNAL_TOOLS = "proj-internal-tools";
const PROJECT_MARKETING_Q3 = "proj-marketing-q3";

const LPR_ROWS: TaskRow[] = [
  { id: "lpr-design", parentId: null, title: "Design & UX", status: "in_progress", priority: "high", assigneeIds: ["u3"], dueDate: daysFromToday(6), projectId: PROJECT_LPR, teamIds: [TEAM_WEB] },
  { id: "lpr-design-1", parentId: "lpr-design", title: "Wireframes desktop & mobile", status: "done", priority: "normal", assigneeIds: ["u3"], dueDate: daysFromToday(-3) },
  { id: "lpr-design-2", parentId: "lpr-design", title: "Charte graphique / design system", status: "in_progress", priority: "normal", assigneeIds: ["u3"], dueDate: daysFromToday(2) },
  { id: "lpr-design-3", parentId: "lpr-design", title: "Maquettes des pages catalogue", status: "todo", priority: "normal", assigneeIds: ["u3"], dueDate: daysFromToday(5) },
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
  { id: "lpr-dev", parentId: null, title: "Développement", status: "todo", priority: "high", assigneeIds: ["u7"], dueDate: daysFromToday(15), projectId: PROJECT_LPR, teamIds: [TEAM_ATELIER] },
  { id: "lpr-dev-1", parentId: "lpr-dev", title: "Intégration Next.js du template", status: "todo", priority: "normal", assigneeIds: ["u7"], dueDate: daysFromToday(12) },
  { id: "lpr-dev-2", parentId: "lpr-dev", title: "Page catalogue filtrable (modèle, gamme, prix)", status: "todo", priority: "normal", assigneeIds: ["u7"], dueDate: daysFromToday(14) },
  { id: "lpr-dev-3", parentId: "lpr-dev", title: "Formulaire de contact / demande de devis", status: "todo", priority: "low", assigneeIds: ["u7"], dueDate: daysFromToday(15) },
  { id: "lpr-content", parentId: null, title: "Contenu & SEO", status: "todo", priority: "normal", assigneeIds: ["u5"], dueDate: daysFromToday(18), projectId: PROJECT_LPR, teamIds: [TEAM_WEB] },
  { id: "lpr-content-1", parentId: "lpr-content", title: "Rédaction des fiches produits", status: "todo", priority: "normal", assigneeIds: ["u5"], dueDate: daysFromToday(16) },
  { id: "lpr-content-2", parentId: "lpr-content", title: "Optimisation SEO on-page", status: "todo", priority: "low", assigneeIds: ["u5"], dueDate: daysFromToday(17) },
  { id: "lpr-content-3", parentId: "lpr-content", title: "Traduction FR / AR", status: "todo", priority: "low", assigneeIds: ["u5"], dueDate: daysFromToday(18) },
  { id: "lpr-qa", parentId: null, title: "Tests & recette", status: "todo", priority: "normal", assigneeIds: ["u4"], dueDate: daysFromToday(21), projectId: PROJECT_LPR, teamIds: [TEAM_ATELIER] },
  { id: "lpr-qa-1", parentId: "lpr-qa", title: "Tests cross-browser", status: "todo", priority: "normal", assigneeIds: ["u4"], dueDate: daysFromToday(19) },
  { id: "lpr-qa-2", parentId: "lpr-qa", title: "Tests responsive mobile / tablette", status: "todo", priority: "normal", assigneeIds: ["u4"], dueDate: daysFromToday(20) },
  { id: "lpr-qa-3", parentId: "lpr-qa", title: "Recette client", status: "todo", priority: "high", assigneeIds: ["u2"], dueDate: daysFromToday(21) },
  { id: "lpr-launch", parentId: null, title: "Mise en ligne", status: "todo", priority: "high", assigneeIds: ["u2"], dueDate: daysFromToday(25), projectId: PROJECT_LPR, teamIds: [TEAM_ATELIER] },
  { id: "lpr-launch-1", parentId: "lpr-launch", title: "Configuration nom de domaine & hébergement", status: "todo", priority: "high", assigneeIds: ["u7"], dueDate: daysFromToday(23) },
  { id: "lpr-launch-2", parentId: "lpr-launch", title: "Déploiement en production", status: "todo", priority: "urgent", assigneeIds: ["u7"], dueDate: daysFromToday(24) },
  { id: "lpr-launch-3", parentId: "lpr-launch", title: "Formation client à l'administration du site", status: "todo", priority: "normal", assigneeIds: ["u2"], dueDate: daysFromToday(25) },
  { id: "seed-19", parentId: null, title: "Set up CI/CD pipeline", status: "in_progress", priority: "high", assigneeIds: ["u7"], dueDate: daysFromToday(3), projectId: PROJECT_INTERNAL_TOOLS, teamIds: [TEAM_ATELIER] },
  { id: "seed-20", parentId: null, title: "Configure error monitoring (Sentry)", status: "todo", priority: "normal", assigneeIds: ["u7"], dueDate: daysFromToday(6), projectId: PROJECT_INTERNAL_TOOLS, teamIds: [TEAM_ATELIER] },
  { id: "seed-21", parentId: null, title: "Write internal API documentation", status: "todo", priority: "low", assigneeIds: ["u4"], dueDate: daysFromToday(9), projectId: PROJECT_INTERNAL_TOOLS, teamIds: [TEAM_ATELIER] },
  { id: "seed-22", parentId: null, title: "Design social media creatives", status: "in_progress", priority: "normal", assigneeIds: ["u3"], dueDate: daysFromToday(4), projectId: PROJECT_MARKETING_Q3, teamIds: [TEAM_WEB] },
  { id: "seed-23", parentId: null, title: "Write email campaign copy", status: "todo", priority: "normal", assigneeIds: ["u5"], dueDate: daysFromToday(6), projectId: PROJECT_MARKETING_Q3, teamIds: [TEAM_WEB] },
  { id: "seed-24", parentId: null, title: "Set up campaign analytics dashboard", status: "todo", priority: "low", assigneeIds: ["u7"], dueDate: daysFromToday(8), projectId: PROJECT_MARKETING_Q3, teamIds: [TEAM_WEB] },
];

const ROWS: TaskRow[] = [
  { id: "seed-1", parentId: null, title: "Design the new onboarding flow", status: "in_progress", priority: "high", assigneeIds: ["u3"], dueDate: daysFromToday(2), teamIds: [TEAM_WEB] },
  { id: "seed-1a", parentId: "seed-1", title: "Wireframe the welcome screens", status: "done", priority: "normal", assigneeIds: ["u3"], dueDate: daysFromToday(-2) },
  { id: "seed-1b", parentId: "seed-1", title: "Write onboarding copy", status: "in_progress", priority: "normal", assigneeIds: ["u3"], dueDate: daysFromToday(1) },
  { id: "seed-1c", parentId: "seed-1", title: "User-test the flow with 5 people", status: "todo", priority: "low", assigneeIds: [], dueDate: null },
  { id: "seed-2", parentId: null, title: "Fix pagination bug on invoices table", status: "todo", priority: "urgent", assigneeIds: ["u1"], dueDate: daysFromToday(-1), teamIds: [TEAM_ATELIER] },
  { id: "seed-3", parentId: null, title: "Write Q3 product roadmap doc", status: "todo", priority: "normal", assigneeIds: ["u6"], dueDate: daysFromToday(7), teamIds: [TEAM_OPS] },
  { id: "seed-4", parentId: null, title: "Review pull request #482", status: "in_review", priority: "high", assigneeIds: ["u4", "u1"], dueDate: daysFromToday(0), teamIds: [TEAM_ATELIER] },
  { id: "seed-5", parentId: null, title: "Set up staging environment for API v2", status: "in_progress", priority: "urgent", assigneeIds: ["u7"], dueDate: daysFromToday(1), projectId: PROJECT_INTERNAL_TOOLS, teamIds: [TEAM_ATELIER] },
  { id: "seed-5a", parentId: "seed-5", title: "Provision database instance", status: "done", priority: "normal", assigneeIds: ["u7"], dueDate: daysFromToday(-1), projectId: PROJECT_INTERNAL_TOOLS },
  { id: "seed-5b", parentId: "seed-5", title: "Configure secrets & env vars", status: "todo", priority: "high", assigneeIds: ["u7"], dueDate: daysFromToday(1), projectId: PROJECT_INTERNAL_TOOLS },
  { id: "seed-6", parentId: null, title: "Migrate legacy auth tokens", status: "todo", priority: "low", assigneeIds: [], dueDate: null, projectId: PROJECT_INTERNAL_TOOLS, teamIds: [TEAM_ATELIER] },
  { id: "seed-7", parentId: null, title: "Update Tailwind design tokens", status: "done", priority: "normal", assigneeIds: ["u3"], dueDate: daysFromToday(-5), teamIds: [TEAM_WEB] },
  { id: "seed-8", parentId: null, title: "Prepare investor update slides", status: "todo", priority: "high", assigneeIds: ["u5"], dueDate: daysFromToday(3), projectId: PROJECT_MARKETING_Q3, teamIds: [TEAM_OPS] },
  { id: "seed-9", parentId: null, title: "Audit accessibility on marketing site", status: "in_review", priority: "normal", assigneeIds: ["u4"], dueDate: daysFromToday(4), teamIds: [TEAM_WEB] },
  { id: "seed-10", parentId: null, title: "Refactor task list virtualization", status: "todo", priority: "none", assigneeIds: [], dueDate: null, teamIds: [TEAM_ATELIER] },
  { id: "seed-11", parentId: null, title: "Investigate flaky checkout E2E test", status: "in_progress", priority: "urgent", assigneeIds: ["u2", "u7"], dueDate: daysFromToday(0), teamIds: [TEAM_ATELIER] },
  { id: "seed-12", parentId: null, title: "Draft customer changelog for release 4.2", status: "done", priority: "low", assigneeIds: ["u5"], dueDate: daysFromToday(-3), teamIds: [TEAM_DESIGN] },
  { id: "seed-13", parentId: null, title: "Benchmark Postgres read replicas", status: "todo", priority: "normal", assigneeIds: ["u7"], dueDate: daysFromToday(10), teamIds: [TEAM_ATELIER] },
  { id: "seed-14", parentId: null, title: "Redesign empty states across app", status: "todo", priority: "low", assigneeIds: ["u3"], dueDate: daysFromToday(14), teamIds: [TEAM_WEB] },
  { id: "seed-15", parentId: null, title: "Ship dark mode to production", status: "in_review", priority: "high", assigneeIds: ["u2"], dueDate: daysFromToday(1), teamIds: [TEAM_ATELIER] },
  { id: "seed-16", parentId: null, title: "Sync with legal on new ToS copy", status: "todo", priority: "normal", assigneeIds: ["u6"], dueDate: daysFromToday(5), projectId: PROJECT_MARKETING_Q3, teamIds: [TEAM_OPS] },
  { id: "seed-17", parentId: null, title: "Clean up unused Storybook stories", status: "done", priority: "none", assigneeIds: ["u4"], dueDate: daysFromToday(-8), teamIds: [TEAM_ATELIER] },
  { id: "seed-18", parentId: null, title: "Load-test websocket notifications", status: "in_progress", priority: "high", assigneeIds: ["u7"], dueDate: daysFromToday(2), teamIds: [TEAM_ATELIER] },
  { id: "seed-25", parentId: null, title: "Daily database backup check", status: "todo", priority: "normal", assigneeIds: ["u7"], dueDate: daysFromToday(1), projectId: PROJECT_INTERNAL_TOOLS, teamIds: [TEAM_ATELIER], recurrence: { frequency: "daily", interval: 1, daysOfWeek: [], dayOfMonth: null } },
  { id: "seed-26", parentId: null, title: "Weekly team sync notes", status: "todo", priority: "normal", assigneeIds: ["u1"], dueDate: daysFromToday(3), teamIds: [TEAM_OPS], recurrence: { frequency: "weekly", interval: 1, daysOfWeek: [1], dayOfMonth: null } },
  { id: "seed-27", parentId: null, title: "Monthly invoicing reconciliation", status: "todo", priority: "high", assigneeIds: ["u6"], dueDate: daysFromToday(9), teamIds: [TEAM_OPS], recurrence: { frequency: "monthly", interval: 1, daysOfWeek: [], dayOfMonth: 1 } },
];

const DISPUTE_ROWS: TaskRow[] = [
  { id: "dispute-1", parentId: null, title: "Litige facturation — client MXSHOP", status: "in_progress", priority: "urgent", assigneeIds: ["u2", "u1"], dueDate: daysFromToday(3), teamIds: [TEAM_OPS] },
  { id: "dispute-2", parentId: null, title: "Réclamation qualité — livraison HAWK 200R", status: "todo", priority: "high", assigneeIds: ["u4"], dueDate: daysFromToday(5), teamIds: [TEAM_DESIGN] },
  { id: "dispute-3", parentId: null, title: "Retard de paiement — fournisseur pièces moteur", status: "in_review", priority: "normal", assigneeIds: ["u6"], dueDate: daysFromToday(10), teamIds: [TEAM_OPS] },
  { id: "dispute-4", parentId: null, title: "Litige contractuel — prestataire logistique", status: "done", priority: "low", assigneeIds: ["u2"], dueDate: daysFromToday(-4), teamIds: [TEAM_OPS] },
  { id: "dispute-5", parentId: null, title: "Suivi hebdomadaire des retours produits", status: "todo", priority: "normal", assigneeIds: ["u4"], dueDate: daysFromToday(2), teamIds: [TEAM_DESIGN], recurrence: { frequency: "weekly", interval: 1, daysOfWeek: [5], dayOfMonth: null } },
];

async function seedTasksAndDisputes() {
  const allTaskRows = [...ROWS, ...LPR_ROWS];
  for (let i = 0; i < allTaskRows.length; i++) {
    const row = allTaskRows[i];
    await prisma.task.upsert({
      where: { id: row.id },
      create: {
        id: row.id,
        module: "task",
        parentId: row.parentId,
        title: row.title,
        status: row.status,
        priority: row.priority,
        assigneeIds: row.assigneeIds,
        teamIds: row.teamIds ?? [],
        excludedUserIds: [],
        dueDate: row.dueDate,
        recurrence: row.recurrence ?? undefined,
        projectId: row.projectId ?? null,
        order: i,
        customValues: {},
      },
      update: {},
    });
  }
  for (let i = 0; i < DISPUTE_ROWS.length; i++) {
    const row = DISPUTE_ROWS[i];
    await prisma.task.upsert({
      where: { id: row.id },
      create: {
        id: row.id,
        module: "dispute",
        parentId: row.parentId,
        title: row.title,
        status: row.status,
        priority: row.priority,
        assigneeIds: row.assigneeIds,
        teamIds: row.teamIds ?? [],
        excludedUserIds: [],
        dueDate: row.dueDate,
        recurrence: row.recurrence ?? undefined,
        projectId: row.projectId ?? null,
        order: i,
        customValues: {},
      },
      update: {},
    });
  }
  console.log(`Seeded ${allTaskRows.length} tasks and ${DISPUTE_ROWS.length} disputes.`);
}

async function seedPurchases() {
  interface SeedColumn {
    id: string;
    name: string;
    type: "text" | "number" | "dropdown" | "image" | "video" | "link" | "date";
    options: { id: string; label: string; color: string }[];
  }
  const columns: SeedColumn[] = [
    { id: "col-article", name: "Article", type: "text", options: [] },
    { id: "col-fournisseur", name: "Fournisseur", type: "text", options: [] },
    { id: "col-quantite", name: "Quantité", type: "number", options: [] },
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
    { id: "col-photo", name: "Photo", type: "image", options: [] },
    { id: "col-fiche", name: "Fiche produit", type: "link", options: [] },
  ];
  for (let i = 0; i < columns.length; i++) {
    const col = columns[i];
    await prisma.purchaseColumnDef.upsert({
      where: { id: col.id },
      create: { id: col.id, name: col.name, type: col.type, options: col.options, order: i },
      update: {},
    });
  }

  const items = [
    { id: "purchase-1", values: { "col-article": "Casque intégral taille M", "col-fournisseur": "MotoParts Maroc", "col-quantite": "25", "col-statut": "Commandé", "col-fiche": "https://example.com/casque-integral-m" }, assigneeIds: ["u2"] },
    { id: "purchase-2", values: { "col-article": "Kit chaîne 428", "col-fournisseur": "Atlas Distribution", "col-quantite": "40", "col-statut": "Reçu" }, assigneeIds: ["u4"] },
    { id: "purchase-3", values: { "col-article": "Batterie 12V 9Ah", "col-fournisseur": "Electro Quad", "col-quantite": "15", "col-statut": "À commander" }, assigneeIds: [] as string[] },
    { id: "purchase-4", values: { "col-article": "Housse de protection Quad", "col-fournisseur": "Textile Pro", "col-quantite": "60", "col-statut": "À commander", "col-fiche": "https://example.com/housse-quad" }, assigneeIds: ["u3", "u5"] },
    { id: "purchase-5", values: { "col-article": "Filtre à huile", "col-fournisseur": "MotoParts Maroc", "col-quantite": "100", "col-statut": "Annulé" }, assigneeIds: ["u2"] },
  ];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    await prisma.purchaseItem.upsert({
      where: { id: item.id },
      create: { id: item.id, order: i, values: item.values, assigneeIds: item.assigneeIds, excludedUserIds: [] },
      update: {},
    });
  }
  console.log(`Seeded ${columns.length} purchase columns and ${items.length} purchase items.`);
}

function daysFromNow(offset: number): Date {
  return new Date(Date.now() + offset * 24 * 60 * 60 * 1000);
}

async function seedChat() {
  const conversations = [
    {
      id: "conv-1",
      type: "direct" as const,
      name: null,
      participantIds: ["u1", "u4"],
      avatarDataUrl: null,
      createdBy: "u1",
      createdAt: daysFromNow(-3),
      lastMessageAt: daysFromNow(-0.02),
      lastMessagePreview: "Yassine: Ça avance bien, je t'envoie ça demain matin.",
      lastReadAt: { u1: daysFromNow(-0.02).toISOString(), u4: daysFromNow(-0.02).toISOString() },
    },
    {
      id: "conv-2",
      type: "group" as const,
      name: "Équipe Web",
      participantIds: ["u1", "u2", "u3", "u4"],
      avatarDataUrl: null,
      createdBy: "u1",
      createdAt: daysFromNow(-10),
      lastMessageAt: daysFromNow(-0.3),
      lastMessagePreview: "Mouad: Le design system est à jour sur Figma.",
      lastReadAt: { u1: daysFromNow(-0.3).toISOString(), u2: daysFromNow(-1).toISOString(), u3: daysFromNow(-0.3).toISOString(), u4: daysFromNow(-2).toISOString() },
    },
  ];
  for (const c of conversations) {
    await prisma.conversation.upsert({ where: { id: c.id }, create: c, update: {} });
  }

  const messages = [
    { id: "msg-1", conversationId: "conv-1", senderId: "u1", text: "Salut Yassine, où en est le catalogue LPR ?", attachments: [] as unknown as Prisma.InputJsonValue, createdAt: daysFromNow(-3) },
    { id: "msg-2", conversationId: "conv-1", senderId: "u4", text: "Ça avance bien, je t'envoie ça demain matin.", attachments: [] as unknown as Prisma.InputJsonValue, createdAt: daysFromNow(-0.02) },
    { id: "msg-3", conversationId: "conv-2", senderId: "u2", text: "Bienvenue dans le groupe Équipe Web 👋", attachments: [] as unknown as Prisma.InputJsonValue, createdAt: daysFromNow(-10) },
    { id: "msg-4", conversationId: "conv-2", senderId: "u3", text: "Le design system est à jour sur Figma.", attachments: [] as unknown as Prisma.InputJsonValue, createdAt: daysFromNow(-0.3) },
  ];
  for (const m of messages) {
    await prisma.message.upsert({ where: { id: m.id }, create: m, update: {} });
  }
  console.log(`Seeded ${conversations.length} conversations and ${messages.length} messages.`);
}

async function main() {
  await seedUsers();
  await seedTeams();
  await seedProjects();
  await seedStatusesAndPriorities();
  await seedTasksAndDisputes();
  await seedPurchases();
  await seedChat();
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
