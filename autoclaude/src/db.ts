import { neon } from '@neondatabase/serverless';
import { CONFIG } from './config.js';
import { Task, Project, TaskWithRepo } from './types.js';

const sql = neon(CONFIG.DATABASE_URL);

// Get claimable tasks (in backlog, autoclaude enabled, not claimed or claim expired)
export async function getClaimableTasks(): Promise<TaskWithRepo[]> {
  const claimTimeout = new Date(Date.now() - CONFIG.CLAIM_TIMEOUT_MS).toISOString();

  const rows = await sql`
    SELECT t.*, p.repo_url
    FROM tasks t
    JOIN projects p ON t.project_id = p.id
    WHERE t.kanban_column_id = ${CONFIG.BACKLOG_COLUMN_ID}
      AND t.autoclaude_enabled = true
      AND p.repo_url IS NOT NULL
      AND (t.claimed_at IS NULL OR t.claimed_at < ${claimTimeout})
    ORDER BY t.created_at ASC
    LIMIT ${CONFIG.MAX_CONCURRENT}
  `;

  return rows as TaskWithRepo[];
}

// Get tasks that were kicked back to in-progress with new feedback
// Any daemon can pick up feedback tasks - we use claim mechanism to prevent races
export async function getFeedbackTasks(): Promise<TaskWithRepo[]> {
  const claimTimeout = new Date(Date.now() - CONFIG.CLAIM_TIMEOUT_MS).toISOString();

  const rows = await sql`
    SELECT t.*, p.repo_url
    FROM tasks t
    JOIN projects p ON t.project_id = p.id
    WHERE t.kanban_column_id = ${CONFIG.IN_PROGRESS_COLUMN_ID}
      AND t.autoclaude_enabled = true
      AND t.pr_url IS NOT NULL
      AND t.feedback IS NOT NULL
      AND t.feedback != ''
      AND p.repo_url IS NOT NULL
      AND (t.claimed_at IS NULL OR t.claimed_at < ${claimTimeout})
    ORDER BY t.created_at ASC
  `;

  return rows as TaskWithRepo[];
}

// Claim a task (works for both new tasks and feedback tasks)
export async function claimTask(taskId: string): Promise<boolean> {
  const claimTimeout = new Date(Date.now() - CONFIG.CLAIM_TIMEOUT_MS).toISOString();

  const result = await sql`
    UPDATE tasks
    SET claimed_at = NOW(),
        claimed_by = ${CONFIG.INSTANCE_ID},
        kanban_column_id = ${CONFIG.IN_PROGRESS_COLUMN_ID}
    WHERE id = ${taskId}
      AND (claimed_at IS NULL OR claimed_at < ${claimTimeout})
    RETURNING id
  `;

  return result.length > 0;
}

// Mark task as resolved with PR
// Clears claimed_by so any daemon can handle future feedback
export async function resolveTask(taskId: string, prUrl: string): Promise<void> {
  await sql`
    UPDATE tasks
    SET kanban_column_id = ${CONFIG.RESOLVED_COLUMN_ID},
        pr_url = ${prUrl},
        feedback = NULL,
        last_error = NULL,
        claimed_at = NULL,
        claimed_by = NULL
    WHERE id = ${taskId}
  `;
}

// Record error and move task back to backlog for retry
// Any daemon can pick it up on the next poll cycle
export async function recordError(taskId: string, error: string): Promise<void> {
  await sql`
    UPDATE tasks
    SET last_error = ${error},
        attempt_count = attempt_count + 1,
        claimed_at = NULL,
        claimed_by = NULL,
        kanban_column_id = ${CONFIG.BACKLOG_COLUMN_ID}
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
