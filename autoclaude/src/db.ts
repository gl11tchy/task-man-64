import { neon } from '@neondatabase/serverless';
import { CONFIG } from './config.js';
import { Task, Project, TaskWithRepo } from './types.js';

const sql = neon(CONFIG.DATABASE_URL);

// Column name patterns to match (case-insensitive)
const BACKLOG_PATTERNS = ['backlog', 'todo', 'to do', 'to-do'];
const IN_PROGRESS_PATTERNS = ['in progress', 'in-progress', 'doing', 'wip', 'working'];
const RESOLVED_PATTERNS = ['done', 'resolved', 'complete', 'completed', 'finished'];

function matchesPattern(name: string, patterns: string[]): boolean {
  const lower = name.toLowerCase();
  return patterns.some(p => lower.includes(p));
}

export interface ProjectColumns {
  backlog: string;
  inProgress: string;
  resolved: string;
}

// Cache for project columns with TTL to avoid stale data
interface CachedColumns {
  columns: ProjectColumns;
  cachedAt: number;
}
const columnCache = new Map<string, CachedColumns>();
const CACHE_TTL_MS = 60000; // 1 minute TTL

// Get column IDs for a project by matching column names
export async function getProjectColumns(projectId: string): Promise<ProjectColumns | null> {
  // Check cache first (with TTL)
  const cached = columnCache.get(projectId);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.columns;
  }

  const rows = await sql`
    SELECT id, name FROM kanban_columns 
    WHERE project_id = ${projectId}
    ORDER BY "order" ASC
  `;
  
  let backlog: string | null = null;
  let inProgress: string | null = null;
  let resolved: string | null = null;
  
  for (const row of rows) {
    const name = row.name as string;
    const id = row.id as string;
    
    if (!backlog && matchesPattern(name, BACKLOG_PATTERNS)) {
      backlog = id;
    } else if (!inProgress && matchesPattern(name, IN_PROGRESS_PATTERNS)) {
      inProgress = id;
    } else if (!resolved && matchesPattern(name, RESOLVED_PATTERNS)) {
      resolved = id;
    }
  }
  
  // Fallback: use first/middle/last columns if pattern matching fails
  if (!backlog && rows.length > 0) backlog = rows[0].id as string;
  if (!resolved && rows.length > 0) resolved = rows[rows.length - 1].id as string;
  if (!inProgress && rows.length > 1) inProgress = rows[Math.floor(rows.length / 2)].id as string;
  
  if (!backlog || !inProgress || !resolved) return null;
  
  const columns = { backlog, inProgress, resolved };
  columnCache.set(projectId, { columns, cachedAt: Date.now() });
  return columns;
}

// Invalidate column cache for a project (call on error or when columns might have changed)
export function invalidateColumnCache(projectId?: string): void {
  if (projectId) {
    columnCache.delete(projectId);
  } else {
    columnCache.clear();
  }
}

// Extended task type with column info
export interface TaskWithColumns extends TaskWithRepo {
  columns: ProjectColumns;
}

// Get claimable tasks (in backlog, autoclaude enabled, not claimed or claim expired, under retry limit)
// Queries across ALL projects and matches backlog columns by name pattern
export async function getClaimableTasks(): Promise<TaskWithColumns[]> {
  const claimTimeout = new Date(Date.now() - CONFIG.CLAIM_TIMEOUT_MS).toISOString();

  // Get all autoclaude-enabled tasks that aren't claimed
  const rows = await sql`
    SELECT t.*, p.repo_url, c.name as column_name
    FROM tasks t
    JOIN projects p ON t.project_id = p.id
    JOIN kanban_columns c ON t.kanban_column_id = c.id
    WHERE t.autoclaude_enabled = true
      AND p.repo_url IS NOT NULL
      AND p.autoclaude_paused = false
      AND (t.claimed_at IS NULL OR t.claimed_at < ${claimTimeout})
      AND (t.attempt_count IS NULL OR t.attempt_count < ${CONFIG.MAX_RETRY_ATTEMPTS})
    ORDER BY t.created_at ASC
  `;

  // Filter to only tasks in backlog columns and add column info
  const tasks: TaskWithColumns[] = [];
  for (const row of rows) {
    const columnName = row.column_name as string;
    if (!matchesPattern(columnName, BACKLOG_PATTERNS)) continue;
    
    const columns = await getProjectColumns(row.project_id as string);
    if (!columns) continue;
    
    tasks.push({ ...row, columns } as TaskWithColumns);
    if (tasks.length >= CONFIG.MAX_CONCURRENT) break;
  }

  return tasks;
}

// Get tasks that were kicked back to in-progress with new feedback
export async function getFeedbackTasks(): Promise<TaskWithColumns[]> {
  const claimTimeout = new Date(Date.now() - CONFIG.CLAIM_TIMEOUT_MS).toISOString();

  const rows = await sql`
    SELECT t.*, p.repo_url, c.name as column_name
    FROM tasks t
    JOIN projects p ON t.project_id = p.id
    JOIN kanban_columns c ON t.kanban_column_id = c.id
    WHERE t.autoclaude_enabled = true
      AND t.pr_url IS NOT NULL
      AND t.feedback IS NOT NULL
      AND t.feedback != ''
      AND p.repo_url IS NOT NULL
      AND p.autoclaude_paused = false
      AND (t.claimed_at IS NULL OR t.claimed_at < ${claimTimeout})
      AND (t.attempt_count IS NULL OR t.attempt_count < ${CONFIG.MAX_RETRY_ATTEMPTS})
    ORDER BY t.created_at ASC
  `;

  // Filter to only tasks in in-progress columns
  const tasks: TaskWithColumns[] = [];
  for (const row of rows) {
    const columnName = row.column_name as string;
    if (!matchesPattern(columnName, IN_PROGRESS_PATTERNS)) continue;
    
    const columns = await getProjectColumns(row.project_id as string);
    if (!columns) continue;
    
    tasks.push({ ...row, columns } as TaskWithColumns);
  }

  return tasks;
}

// Claim a task - move to in-progress column
export async function claimTask(taskId: string, inProgressColumnId: string): Promise<boolean> {
  const claimTimeout = new Date(Date.now() - CONFIG.CLAIM_TIMEOUT_MS).toISOString();

  const result = await sql`
    UPDATE tasks
    SET claimed_at = NOW(),
        claimed_by = ${CONFIG.INSTANCE_ID},
        kanban_column_id = ${inProgressColumnId}
    WHERE id = ${taskId}
      AND (claimed_at IS NULL OR claimed_at < ${claimTimeout})
    RETURNING id
  `;

  return result.length > 0;
}

// Mark task as resolved with PR
export async function resolveTask(taskId: string, prUrl: string, resolvedColumnId: string): Promise<void> {
  await sql`
    UPDATE tasks
    SET kanban_column_id = ${resolvedColumnId},
        pr_url = ${prUrl},
        feedback = NULL,
        last_error = NULL,
        claimed_at = NULL,
        claimed_by = NULL
    WHERE id = ${taskId}
  `;
}

// Record error for a new task - move back to backlog for retry
export async function recordError(taskId: string, error: string, backlogColumnId: string): Promise<void> {
  await sql`
    UPDATE tasks
    SET last_error = ${error},
        attempt_count = COALESCE(attempt_count, 0) + 1,
        claimed_at = NULL,
        claimed_by = NULL,
        kanban_column_id = ${backlogColumnId}
    WHERE id = ${taskId}
  `;
}

// Record error for a feedback task - keep in IN_PROGRESS so it's retried as feedback
export async function recordFeedbackError(taskId: string, error: string): Promise<void> {
  await sql`
    UPDATE tasks
    SET last_error = ${error},
        attempt_count = COALESCE(attempt_count, 0) + 1,
        claimed_at = NULL,
        claimed_by = NULL
    WHERE id = ${taskId}
  `;
}

// Clear feedback after addressing it
export async function clearFeedback(taskId: string): Promise<void> {
  await sql`
    UPDATE tasks
    SET feedback = NULL
    WHERE id = ${taskId}
  `;
}

// Get project by ID
export async function getProject(projectId: string): Promise<Project | null> {
  const rows = await sql`SELECT * FROM projects WHERE id = ${projectId}`;
  return (rows[0] as Project) || null;
}
