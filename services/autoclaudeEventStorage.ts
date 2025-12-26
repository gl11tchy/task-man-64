import { sql, isDatabaseAvailable } from '../neon';
import { AutoclaudeEvent } from '../types';

export class AutoclaudeEventStorage {
  private userId: string | null;

  constructor(userId: string | null = null) {
    this.userId = userId;
  }

  setUserId(userId: string | null) {
    this.userId = userId;
  }

  async loadEvents(projectId: string, limit: number = 50): Promise<AutoclaudeEvent[]> {
    if (!isDatabaseAvailable()) return [];

    try {
      const rows = await sql`
        SELECT ae.*, t.text as task_text
        FROM autoclaude_events ae
        LEFT JOIN tasks t ON ae.task_id = t.id
        WHERE ae.project_id = ${projectId}
        ORDER BY ae.created_at DESC
        LIMIT ${limit}
      `;

      return rows.map(row => ({
        id: row.id as string,
        taskId: row.task_id as string | null,
        projectId: row.project_id as string,
        eventType: row.event_type as AutoclaudeEvent['eventType'],
        message: row.message as string,
        metadata: (row.metadata as Record<string, unknown>) ?? {},
        createdAt: new Date(row.created_at as string).getTime(),
        daemonInstance: row.daemon_instance as string | null,
        taskText: row.task_text as string | undefined,
      }));
    } catch (error) {
      console.error('Failed to load autoclaude events:', error);
      return [];
    }
  }

  async getLatestEvent(projectId: string): Promise<AutoclaudeEvent | null> {
    const events = await this.loadEvents(projectId, 1);
    return events[0] ?? null;
  }

  async clearEvents(projectId: string): Promise<void> {
    if (!isDatabaseAvailable()) return;

    try {
      await sql`
        DELETE FROM autoclaude_events
        WHERE project_id = ${projectId}
      `;
    } catch (error) {
      console.error('Failed to clear autoclaude events:', error);
    }
  }
}
