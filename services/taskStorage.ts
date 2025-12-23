import { supabase } from '../supabase';
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
    if (this.userId) {
      return this.loadFromSupabase();
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
    if (this.userId) {
      return this.addToSupabase(task);
    } else {
      return this.addToLocalStorage(task);
    }
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<{ success: boolean; error?: Error }> {
    if (this.userId) {
      return this.updateInSupabase(id, updates);
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
    if (this.userId) {
      return this.deleteFromSupabase(id);
    } else {
      return this.deleteFromLocalStorage(id);
    }
  }

  async migrateLocalToCloud(): Promise<{ success: boolean; count: number; error?: Error }> {
    if (!this.userId) {
      return { success: false, count: 0, error: new Error('No user logged in') };
    }

    const localTasks = this.loadFromLocalStorage();
    if (localTasks.length === 0) {
      return { success: true, count: 0 };
    }

    const tasksForDb = localTasks.map(task => ({
      id: task.id,
      text: task.text,
      status: task.status,
      created_at: new Date(task.createdAt).toISOString(),
      completed_at: task.completedAt ? new Date(task.completedAt).toISOString() : null,
      user_id: this.userId,
      project_id: task.projectId,
      kanban_column_id: task.kanbanColumnId,
      kanban_position: task.kanbanPosition,
      backlog_position: task.backlogPosition,
      is_in_backlog: task.isInBacklog,
      due_date: task.dueDate ? new Date(task.dueDate).toISOString() : null,
      priority: task.priority,
      tags: task.tags,
    }));

    const { error } = await supabase
      .from('tasks')
      .insert(tasksForDb);

    if (error) {
      return { success: false, count: 0, error: error as Error };
    }

    localStorage.removeItem(TASKS_STORAGE_KEY);
    return { success: true, count: localTasks.length };
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

  private async loadFromSupabase(): Promise<Task[]> {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', this.userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to load from Supabase:', error);
        return [];
      }

      return (data || []).map(row => ({
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
      console.error('Failed to load from Supabase:', error);
      return [];
    }
  }

  private async addToSupabase(task: Task): Promise<{ success: boolean; error?: Error }> {
    try {
      const { error } = await supabase
        .from('tasks')
        .insert([{
          id: task.id,
          text: task.text,
          status: task.status,
          created_at: new Date(task.createdAt).toISOString(),
          completed_at: task.completedAt ? new Date(task.completedAt).toISOString() : null,
          user_id: this.userId,
          project_id: task.projectId,
          kanban_column_id: task.kanbanColumnId,
          kanban_position: task.kanbanPosition,
          backlog_position: task.backlogPosition,
          is_in_backlog: task.isInBacklog,
          due_date: task.dueDate ? new Date(task.dueDate).toISOString() : null,
          priority: task.priority,
          tags: task.tags,
        }]);

      if (error) {
        return { success: false, error: error as Error };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  private async updateInSupabase(id: string, updates: Partial<Task>): Promise<{ success: boolean; error?: Error }> {
    try {
      const dbUpdates: Record<string, unknown> = {};

      if (updates.text !== undefined) dbUpdates.text = updates.text;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.completedAt !== undefined) {
        dbUpdates.completed_at = updates.completedAt ? new Date(updates.completedAt).toISOString() : null;
      }
      if (updates.projectId !== undefined) dbUpdates.project_id = updates.projectId;
      if (updates.kanbanColumnId !== undefined) dbUpdates.kanban_column_id = updates.kanbanColumnId;
      if (updates.kanbanPosition !== undefined) dbUpdates.kanban_position = updates.kanbanPosition;
      if (updates.backlogPosition !== undefined) dbUpdates.backlog_position = updates.backlogPosition;
      if (updates.isInBacklog !== undefined) dbUpdates.is_in_backlog = updates.isInBacklog;
      if (updates.dueDate !== undefined) {
        dbUpdates.due_date = updates.dueDate ? new Date(updates.dueDate).toISOString() : null;
      }
      if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
      if (updates.tags !== undefined) dbUpdates.tags = updates.tags;

      const { error } = await supabase
        .from('tasks')
        .update(dbUpdates)
        .eq('id', id)
        .eq('user_id', this.userId);

      if (error) {
        return { success: false, error: error as Error };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  private async deleteFromSupabase(id: string): Promise<{ success: boolean; error?: Error }> {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id)
        .eq('user_id', this.userId);

      if (error) {
        return { success: false, error: error as Error };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }
}
