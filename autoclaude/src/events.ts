import { neon } from '@neondatabase/serverless';
import { CONFIG } from './config.js';

const sql = neon(CONFIG.DATABASE_URL);

export type EventType =
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

/**
 * Emit an event to the autoclaude_events table for UI tracking
 */
export async function emitEvent(
  projectId: string,
  eventType: EventType,
  message: string,
  taskId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await sql`
      INSERT INTO autoclaude_events (
        project_id, task_id, event_type, message, metadata, daemon_instance
      ) VALUES (
        ${projectId},
        ${taskId ?? null},
        ${eventType},
        ${message},
        ${JSON.stringify(metadata ?? {})},
        ${CONFIG.INSTANCE_ID}
      )
    `;
  } catch (error) {
    // Log but don't throw - event emission should not break task processing
    console.error('Failed to emit event:', error);
  }
}

/**
 * Cleanup old events (optional housekeeping, can be called during idle polls)
 */
export async function cleanupOldEvents(maxAgeHours: number = 24): Promise<void> {
  try {
    await sql`
      DELETE FROM autoclaude_events 
      WHERE created_at < NOW() - INTERVAL '1 hour' * ${maxAgeHours}
    `;
  } catch (error) {
    console.error('Failed to cleanup old events:', error);
  }
}
