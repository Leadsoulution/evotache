import type { TranslationKey } from "./en";

// Typed against TranslationKey (not just Record<string, string>) so
// TypeScript enforces every English key has a French counterpart here.
export const fr: Record<TranslationKey, string> = {
  // Navigation
  "nav.dashboard": "Tableau de bord",
  "nav.chat": "Discussion",
  "nav.tasks": "Tâches",
  "nav.projects": "Projets",
  "nav.socialMedia": "Réseaux sociaux",
  "nav.departments": "Départements",
  "nav.litiges": "Litiges",
  "nav.achats": "Achats",
  "nav.overdue": "En retard",
  "nav.reminders": "Relances",
  "nav.library": "Bibliothèque",
  "nav.aiAssistant": "Assistant IA",
  "nav.statistics": "Statistiques",
  "nav.workshop": "Atelier",
  "nav.calls": "Appels",
  "nav.biometrics": "Biométrie",
  "nav.admin": "Paramètres",

  // Common
  "common.save": "Enregistrer",
  "common.cancel": "Annuler",
  "common.confirm": "Confirmer",
  "common.delete": "Supprimer",
  "common.add": "Ajouter",
  "common.edit": "Modifier",

  // Task list toolbar
  "tasks.searchPlaceholder": "Rechercher des tâches…",
  "tasks.status": "Statut",
  "tasks.priority": "Priorité",
  "tasks.assignee": "Assigné",
  "tasks.project": "Projet",
  "tasks.department": "Département",
  "tasks.type": "Type",
  "tasks.myTasks": "Mes tâches",
  "tasks.showDone": "Afficher terminées",
  "tasks.clearFilters": "Effacer les filtres",
  "tasks.group": "Grouper",
  "tasks.sort": "Trier",
  "tasks.columns": "Colonnes",

  // Task table columns
  "tasks.col.task": "Tâche",
  "tasks.col.assignees": "Assignés",
  "tasks.col.department": "Département",
  "tasks.col.dueDate": "Échéance",
  "tasks.col.priority": "Priorité",
  "tasks.col.status": "Statut",

  // Task row/card
  "tasks.noPriority": "Sans priorité",
  "tasks.noDueDate": "Pas d'échéance",
  "tasks.addTask": "Ajouter une tâche",
  "tasks.dueDatePlaceholder": "Échéance",

  // Due date menu shortcuts
  "dueDate.today": "Aujourd'hui",
  "dueDate.tomorrow": "Demain",
  "dueDate.thisWeekend": "Ce week-end",
  "dueDate.nextWeek": "Semaine prochaine",
  "dueDate.nextWeekend": "Week-end prochain",
  "dueDate.twoWeeks": "2 semaines",
  "dueDate.fourWeeks": "4 semaines",
  "dueDate.clear": "Effacer",
  "dueDate.startDate": "Date de début",
  "dueDate.dueDate": "Échéance",
};
