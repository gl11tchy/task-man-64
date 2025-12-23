import { sql, isDatabaseAvailable } from '../neon';
import { Task } from '../types';

const TASKS_STORAGE_KEY = 'workstation_tasks';

export class TaskStorage {
  private userId: string | null;

  constructor(userId: string | null = null) {
    this.userId = userId;
  }

  setUserId(userId: string | null) {
    this.userId = userId;
  }

  async loadTasks(): Promise<Task[]> {
    if (this.userId && isDatabaseAvailable()) {
      return this.loadFromNeon();
    } else {
      return this.loadFromLocalStorage();
    }
  }

  async loadTasksByProject(projectId: string): Promise<Task[]> {
    const allTasks = await this.loadTasks();
    return allTasks.filter(t => t.projectId === projectId);
  }

  async loadBacklogTasks(projectId: string): Promise<Task[]> {
    const tasks = await this.loadTasksByProject(projectId);
    return tasks
      .filter(t => t.isInBacklog)
      .sort((a, b) => (a.backlogPosition ?? 0) - (b.backlogPosition ?? 0));
  }

  async loadKanbanTasks(projectId: string): Promise<Task[]> {
    const tasks = await this.loadTasksByProject(projectId);
    return tasks.filter(t => !t.isInBacklog && t.kanbanColumnId);
  }

  async addTask(task: Task): Promise<{ success: boolean; error?: Error }> {
    if (this.userId && isDatabaseAvailable()) {
      return this.addToNeon(task);
    } else {
      return this.addToLocalStorage(task);
    }
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<{ success: boolean; error?: Error }> {
    if (this.userId && isDatabaseAvailable()) {
      return this.updateInNeon(id, updates);
    } else {
      return this.updateInLocalStorage(id, updates);
    }
  }

  async updateTaskPositions(tasks: { id: string; kanbanPosition?: number; backlogPosition?: number | null }[]): Promise<{ success: boolean; error?: Error }> {
    for (const task of tasks) {
      const updates: Partial<Task> = {};
      if (task.kanbanPosition !== undefined) updates.kanbanPosition = task.kanbanPosition;
      if (task.backlogPosition !== undefined) updates.backlogPosition = task.backlogPosition;

      const result = await this.updateTask(task.id, updates);
      if (!result.success) {
        return result;
      }
    }
    return { success: true };
  }

  async promoteToBoard(taskId: string, columnId: string, position: number): Promise<{ success: boolean; error?: Error }> {
    return this.updateTask(taskId, {
      isInBacklog: false,
      kanbanColumnId: columnId,
      kanbanPosition: position,
      backlogPosition: null,
      status: 'todo',
    });
  }

  async moveToBacklog(taskId: string, position: number): Promise<{ success: boolean; error?: Error }> {
    return this.updateTask(taskId, {
      isInBacklog: true,
      kanbanColumnId: null,
      kanbanPosition: null,
      backlogPosition: position,
    });
  }

  async deleteTask(id: string): Promise<{ success: boolean; error?: Error }> {
    if (this.userId && isDatabaseAvailable()) {
      return this.deleteFromNeon(id);
    } else {
      return this.deleteFromLocalStorage(id);
    }
  }

  async migrateLocalToCloud(): Promise<{ success: boolean; count: number; error?: Error }> {
    if (!this.userId || !isDatabaseAvailable()) {
      return { success: false, count: 0, error: new Error('No user logged in or database not available') };
    }

    const localTasks = this.loadFromLocalStorage();
    if (localTasks.length === 0) {
      return { success: true, count: 0 };
    }

    try {
      for (const task of localTasks) {
        await this.addToNeon(task);
      }

      localStorage.removeItem(TASKS_STORAGE_KEY);
      return { success: true, count: localTasks.length };
    } catch (error) {
      return { success: false, count: 0, error: error as Error };
    }
  }

  private loadFromLocalStorage(): Task[] {
    try {
      const stored = localStorage.getItem(TASKS_STORAGE_KEY);
      const tasks: Task[] = stored ? JSON.parse(stored) : [];
      // Ensure backward compatibility - add default values for new fields
      return tasks.map(task => ({
        ...task,
        projectId: task.projectId || 'default',
        isInBacklog: task.isInBacklog ?? false,
        kanbanColumnId: task.kanbanColumnId ?? null,
        kanbanPosition: task.kanbanPosition ?? 0,
        backlogPosition: task.backlogPosition ?? null,
        priority: task.priority ?? null,
        tags: task.tags ?? [],
      }));
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
      return [];
    }
  }

  private addToLocalStorage(task: Task): { success: boolean; error?: Error } {
    try {
      const tasks = this.loadFromLocalStorage();
      tasks.unshift(task);
      localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
      return { success: true };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  private updateInLocalStorage(id: string, updates: Partial<Task>): { success: boolean; error?: Error } {
    try {
      const tasks = this.loadFromLocalStorage();
      const updatedTasks = tasks.map(task =>
        task.id === id ? { ...task, ...updates } : task
      );
      localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(updatedTasks));
      return { success: true };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  private deleteFromLocalStorage(id: string): { success: boolean; error?: Error } {
    try {
      const tasks = this.loadFromLocalStorage();
      const filteredTasks = tasks.filter(task => task.id !== id);
      localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(filteredTasks));
      return { success: true };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  private async loadFromNeon(): Promise<Task[]> {
    if (!sql) return [];

    try {
      const rows = await sql`
        SELECT * FROM tasks
        WHERE user_id = ${this.userId}
        ORDER BY created_at DESC
      `;

      return rows.map(row => ({
        id: row.id,
        text: row.text,
        status: row.status,
        createdAt: new Date(row.created_at).getTime(),
        completedAt: row.completed_at ? new Date(row.completed_at).getTime() : undefined,
        user_id: row.user_id,
        projectId: row.project_id || 'default',
        kanbanColumnId: row.kanban_column_id,
        kanbanPosition: row.kanban_position ?? 0,
        backlogPosition: row.backlog_position,
        isInBacklog: row.is_in_backlog ?? false,
        dueDate: row.due_date ? new Date(row.due_date).getTime() : null,
        priority: row.priority,
        tags: row.tags ?? [],
      }));
    } catch (error) {
      console.error('Failed to load from Neon:', error);
      return [];
    }
  }

  private async addToNeon(task: Task): Promise<{ success: boolean; error?: Error }> {
    if (!sql) return { success: false, error: new Error('Database not available') };

    try {
      await sql`
        INSERT INTO tasks (
          id, text, status, created_at, completed_at, user_id,
          project_id, kanban_column_id, kanban_position, backlog_position,
          is_in_backlog, due_date, priority, tags
        ) VALUES (
          ${task.id},
          ${task.text},
          ${task.status},
          ${new Date(task.createdAt).toISOString()},
          ${task.completedAt ? new Date(task.completedAt).toISOString() : null},
          ${this.userId},
          ${task.projectId},
          ${task.kanbanColumnId ?? null},
          ${task.kanbanPosition ?? null},
          ${task.backlogPosition ?? null},
          ${task.isInBacklog},
          ${task.dueDate ? new Date(task.dueDate).toISOString() : null},
          ${task.priority ?? null},
          ${task.tags ?? []}
        )
      `;

      return { success: true };
    } catch (error) {
      console.error('Failed to add to Neon:', error);
      return { success: false, error: error as Error };
    }
  }

  private async updateInNeon(id: string, updates: Partial<Task>): Promise<{ success: boolean; error?: Error }> {
    if (!sql) return { success: false, error: new Error('Database not available') };

    try {
      // Build dynamic update - Neon's tagged template doesn't support dynamic column names easily
      // So we update all fields that might change
      await sql`
        UPDATE tasks SET
          text = COALESCE(${updates.text ?? null}, text),
          status = COALESCE(${updates.status ?? null}, status),
          completed_at = ${updates.completedAt !== undefined ? (updates.completedAt ? new Date(updates.completedAt).toISOString() : null) : sql`completed_at`},
          project_id = COALESCE(${updates.projectId ?? null}, project_id),
          kanban_column_id = ${updates.kanbanColumnId !== undefined ? updates.kanbanColumnId : sql`kanban_column_id`},
          kanban_position = ${updates.kanbanPosition !== undefined ? updates.kanbanPosition : sql`kanban_position`},
          backlog_position = ${updates.backlogPosition !== undefined ? updates.backlogPosition : sql`backlog_position`},
          is_in_backlog = ${updates.isInBacklog !== undefined ? updates.isInBacklog : sql`is_in_backlog`},
          due_date = ${updates.dueDate !== undefined ? (updates.dueDate ? new Date(updates.dueDate).toISOString() : null) : sql`due_date`},
          priority = ${updates.priority !== undefined ? updates.priority : sql`priority`},
          tags = ${updates.tags !== undefined ? updates.tags : sql`tags`}
        WHERE id = ${id} AND user_id = ${this.userId}
      `;

      return { success: true };
    } catch (error) {
      console.error('Failed to update in Neon:', error);
      return { success: false, error: error as Error };
    }
  }

  private async deleteFromNeon(id: string): Promise<{ success: boolean; error?: Error }> {
    if (!sql) return { success: false, error: new Error('Database not available') };

    try {
      await sql`
        DELETE FROM tasks
        WHERE id = ${id} AND user_id = ${this.userId}
      `;

      return { success: true };
    } catch (error) {
      console.error('Failed to delete from Neon:', error);
      return { success: false, error: error as Error };
    }
  }
}
