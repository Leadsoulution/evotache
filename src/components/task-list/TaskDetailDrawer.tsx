"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { StatusMenu } from "./StatusMenu";
import { PriorityMenu } from "./PriorityMenu";
import { AssigneeMenu } from "./AssigneeMenu";
import { TeamMenu } from "./TeamMenu";
import { DueDateField } from "./DueDateField";
import { RecurrenceMenu } from "./RecurrenceMenu";
import { CustomFieldCell } from "./CustomFieldCell";
import { AttachmentList } from "./AttachmentList";
import { AttachmentUploader } from "./AttachmentUploader";
import { useAttachments } from "@/hooks/useAttachments";
import { Menu } from "@/components/ui/Menu";
import { UserExcludeMenu } from "@/components/ui/UserExcludeMenu";
import { ProjectAvatar } from "@/components/projects/ProjectAvatar";
import { ChevronDownIcon, XIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { Assignee, Task } from "@/types/task";
import type { StatusDef, PriorityDef } from "@/types/taskMeta";
import type { CustomFieldDef } from "@/types/customField";
import type { Project } from "@/types/project";
import type { Team } from "@/types/team";
import type { TaskPermissions } from "@/lib/taskPermissions";

interface TaskDetailDrawerProps {
  task: Task | null;
  assignees: Assignee[];
  statuses: StatusDef[];
  priorities: PriorityDef[];
  customFields: CustomFieldDef[];
  projects: Project[];
  teams: Team[];
  subtaskCount: number;
  currentUserId: string;
  permissions: TaskPermissions;
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<Task>) => void;
}

export function TaskDetailDrawer({ task, assignees, statuses, priorities, customFields, projects, teams, subtaskCount, currentUserId, permissions, onClose, onUpdate }: TaskDetailDrawerProps) {
  useEffect(() => {
    if (!task) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [task, onClose]);

  if (!task) return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex justify-end">
      <div className="absolute inset-0 animate-fade-in bg-black/30" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-full animate-slide-up flex-col overflow-y-auto border-l border-slate-200 bg-white shadow-2xl sm:max-w-md dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400">Task details</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:bg-slate-800"
            aria-label="Close task details"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <TaskDetailContent
          key={task.id}
          task={task}
          assignees={assignees}
          statuses={statuses}
          priorities={priorities}
          customFields={customFields}
          projects={projects}
          teams={teams}
          subtaskCount={subtaskCount}
          currentUserId={currentUserId}
          permissions={permissions}
          onUpdate={onUpdate}
        />
      </aside>
    </div>,
    document.body
  );
}

interface TaskDetailContentProps {
  task: Task;
  assignees: Assignee[];
  statuses: StatusDef[];
  priorities: PriorityDef[];
  customFields: CustomFieldDef[];
  projects: Project[];
  teams: Team[];
  subtaskCount: number;
  currentUserId: string;
  permissions: TaskPermissions;
  onUpdate: (id: string, patch: Partial<Task>) => void;
}

function TaskDetailContent({ task, assignees, statuses, priorities, customFields, projects, teams, subtaskCount, currentUserId, permissions, onUpdate }: TaskDetailContentProps) {
  const { attachments, uploadFile, addLink, removeAttachment } = useAttachments(task.id);
  const [description, setDescription] = useState(task.description);

  function commitDescription() {
    if (description !== task.description) onUpdate(task.id, { description });
  }

  return (
    <div className="flex flex-1 flex-col gap-5 px-4 py-4">
      <textarea
        value={task.title}
        onChange={(event) => onUpdate(task.id, { title: event.target.value })}
        disabled={!permissions.canEditFull}
        rows={2}
        aria-label="Task title"
        className="resize-none rounded-lg border border-transparent bg-transparent px-1 text-lg font-semibold text-slate-900 outline-none hover:border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:opacity-70 dark:text-slate-50 dark:hover:border-slate-700 dark:focus:ring-indigo-950"
      />

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="mb-1 text-xs font-medium text-slate-400">Status</p>
          <StatusMenu value={task.status} statuses={statuses} onChange={(status) => onUpdate(task.id, { status })} readOnly={!permissions.canEditStatus} />
        </div>
        <div>
          <p className="mb-1 text-xs font-medium text-slate-400">Priority</p>
          <PriorityMenu value={task.priority} priorities={priorities} onChange={(priority) => onUpdate(task.id, { priority })} readOnly={!permissions.canEditFull} />
        </div>
        <div>
          <p className="mb-1 text-xs font-medium text-slate-400">Assignees</p>
          <AssigneeMenu
            assignees={assignees}
            value={task.assigneeIds}
            onChange={(assigneeIds) => onUpdate(task.id, { assigneeIds })}
            readOnly={!permissions.canEditFull}
          />
        </div>
        <div>
          <p className="mb-1 text-xs font-medium text-slate-400">Due date</p>
          <DueDateField value={task.dueDate} onChange={(dueDate) => onUpdate(task.id, { dueDate })} readOnly={!permissions.canEditFull} />
        </div>
        <div>
          <p className="mb-1 text-xs font-medium text-slate-400">Repeat</p>
          <RecurrenceMenu value={task.recurrence} dueDate={task.dueDate} onChange={(recurrence) => onUpdate(task.id, { recurrence })} readOnly={!permissions.canEditFull} />
        </div>
      </div>

      {projects.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium text-slate-400">Project</p>
          <ProjectMenu projects={projects} value={task.projectId} onChange={(projectId) => onUpdate(task.id, { projectId })} readOnly={!permissions.canEditFull} />
        </div>
      )}

      {teams.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium text-slate-400">Departments</p>
          <TeamMenu teams={teams} value={task.teamIds ?? []} onChange={(teamIds) => onUpdate(task.id, { teamIds })} readOnly={!permissions.canEditFull} />
        </div>
      )}

      <div>
        <p className="mb-1 text-xs font-medium text-slate-400">Exclude a user</p>
        <UserExcludeMenu
          users={assignees}
          value={task.excludedUserIds ?? []}
          onChange={(excludedUserIds) => onUpdate(task.id, { excludedUserIds })}
          readOnly={!permissions.canEditFull}
        />
        <p className="mt-1 text-xs text-slate-400">Hides this task from that person even if they&apos;d normally see it as a manager.</p>
      </div>

      {subtaskCount > 0 && (
        <p className="text-xs text-slate-400">
          {subtaskCount} subtask{subtaskCount > 1 ? "s" : ""} — manage them from the list.
        </p>
      )}

      <div>
        <p className="mb-1.5 text-xs font-medium text-slate-400">Description</p>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          onBlur={commitDescription}
          disabled={!permissions.canEditFull}
          rows={5}
          placeholder="Add more detail..."
          aria-label="Task description"
          className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:opacity-70 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:ring-indigo-950"
        />
      </div>

      {customFields.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-slate-400">Custom fields</p>
          <div className="flex flex-col gap-2 rounded-lg border border-slate-200 p-2 dark:border-slate-700">
            {customFields.map((field) => (
              <div key={field.id} className="flex items-center justify-between gap-3">
                <span className="text-sm text-slate-600 dark:text-slate-300">{field.name}</span>
                <div className="max-w-[60%]">
                  <CustomFieldCell
                    field={field}
                    value={task.customValues[field.id] ?? ""}
                    onChange={(value) => onUpdate(task.id, { customValues: { ...task.customValues, [field.id]: value } })}
                    readOnly={!permissions.canEditFull}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="mb-1.5 text-xs font-medium text-slate-400">Attachments</p>
        {permissions.canEditFull && (
          <div className="mb-2">
            <AttachmentUploader onUploadFile={(file) => uploadFile(file, currentUserId)} onAddLink={(name, url) => addLink(name, url, currentUserId)} />
          </div>
        )}
        <AttachmentList attachments={attachments} onDelete={removeAttachment} readOnly={!permissions.canEditFull} />
      </div>
    </div>
  );
}

interface ProjectMenuProps {
  projects: Project[];
  value: string | null;
  onChange: (next: string | null) => void;
  readOnly?: boolean;
}

function ProjectMenu({ projects, value, onChange, readOnly }: ProjectMenuProps) {
  const current = projects.find((p) => p.id === value);
  const options = [
    { value: "", label: "No project" },
    ...projects.map((project) => ({
      value: project.id,
      label: project.name,
      icon: <ProjectAvatar project={project} size="xs" />,
    })),
  ];

  const badge = current ? (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
      <ProjectAvatar project={current} size="xs" />
      {current.name}
    </span>
  ) : (
    <span className="text-xs text-slate-400">No project</span>
  );

  if (readOnly) return badge;

  return (
    <Menu
      options={options}
      value={[value ?? ""]}
      onChange={(next) => onChange(next[0] || null)}
      ariaLabel="Change project"
      renderTrigger={({ open }) => (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 transition-colors dark:bg-slate-800 dark:text-slate-200",
            open && "ring-2 ring-indigo-400"
          )}
        >
          {current && <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: current.color }} />}
          {current?.name ?? "No project"}
          <ChevronDownIcon className="h-3 w-3 opacity-60" />
        </span>
      )}
    />
  );
}
