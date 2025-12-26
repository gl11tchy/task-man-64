export type TaskStatus = 'todo' | 'completed';

// Default Kanban column IDs
export const DEFAULT_COLUMN_IDS = {
  TODO: 'col-todo',
  IN_PROGRESS: 'col-in-progress',
  REVIEW: 'col-review',
  DONE: 'col-done',
} as const;

export interface Project {
  id: string;
  name: string;
  color: string;
  description?: string;
  createdAt: number;
  isArchived: boolean;
  user_id?: string | null;
  // AUTOCLAUDE: Repository URL for this project
  repoUrl?: string | null;
  // AUTOCLAUDE: Whether processing is paused
  autoclaudePaused?: boolean;
}

export interface KanbanColumn {
  id: string;
  projectId: string;
  name: string;
  color: string;
  position: number;
  isDoneColumn: boolean;
}

export interface Task {
  id: string;
  text: string;
  status: TaskStatus;
  createdAt: number;
  completedAt?: number | null;
  user_id?: string | null;
  // New fields for multi-project and kanban support
  projectId: string;
  kanbanColumnId?: string | null;
  kanbanPosition?: number | null;
  backlogPosition?: number | null;
  isInBacklog: boolean;
  dueDate?: number | null;
  priority?: 'low' | 'medium' | 'high' | null;
  tags?: string[];
  // AUTOCLAUDE fields
  prUrl?: string | null;
  feedback?: string | null;
  claimedAt?: string | null;
  claimedBy?: string | null;
  autoclaudeEnabled?: boolean;
  attemptCount?: number;
  lastError?: string | null;
}

export const AppMode = {
  AUTO: 'AUTO',
  MANUAL: 'MANUAL',
} as const;

export type AppMode = typeof AppMode[keyof typeof AppMode];

export type ViewType = 'workstation' | 'kanban' | 'backlog' | 'whiteboard';

export type SoundType = 'click' | 'success' | 'delete' | 'switch' | 'tab';

// Default columns for new projects
export const DEFAULT_KANBAN_COLUMNS: Omit<KanbanColumn, 'id' | 'projectId'>[] = [
  { name: 'To Do', color: '#718096', position: 0, isDoneColumn: false },
  { name: 'In Progress', color: '#3182ce', position: 1, isDoneColumn: false },
  { name: 'Review', color: '#d69e2e', position: 2, isDoneColumn: false },
  { name: 'Done', color: '#38a169', position: 3, isDoneColumn: true },
];

// Default project color palette
export const PROJECT_COLORS = [
  '#ff00ff', // Pink
  '#00ffff', // Cyan
  '#9d00ff', // Purple
  '#38a169', // Green
  '#3182ce', // Blue
  '#d69e2e', // Yellow/Orange
  '#e53e3e', // Red
  '#dd6b20', // Orange
];

// AUTOCLAUDE event types for activity feed
export type AutoclaudeEventType =
  | 'task_started'
  | 'cloning_repo'
  | 'creating_branch'
  | 'running_claude'
  | 'committing'
  | 'creating_pr'
  | 'task_completed'
  | 'task_failed'
  | 'feedback_started'
  | 'feedback_completed';

export interface AutoclaudeEvent {
  id: string;
  taskId: string | null;
  projectId: string;
  eventType: AutoclaudeEventType;
  message: string;
  metadata: Record<string, unknown>;
  createdAt: number;
  daemonInstance: string | null;
  // Optional enrichment from JOIN
  taskText?: string;
}

/**
 * Helper to check if autoclaude is paused for a project.
 * Default is true (paused) for safety - must explicitly enable.
 */
export function isAutoclaudePaused(project: Project | null | undefined): boolean {
  return project?.autoclaudePaused ?? true;
}