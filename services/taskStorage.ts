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
      return stored ? JSON.parse(stored) : [];
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
      const dbUpdates: Record<string, any> = {};

      if (updates.text !== undefined) dbUpdates.text = updates.text;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.completedAt !== undefined) {
        dbUpdates.completed_at = updates.completedAt ? new Date(updates.completedAt).toISOString() : null;
      }

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
