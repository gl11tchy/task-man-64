import { supabase } from '../supabase';
import { Project, KanbanColumn, DEFAULT_KANBAN_COLUMNS, PROJECT_COLORS } from '../types';
import { v4 as uuidv4 } from 'uuid';

const PROJECTS_STORAGE_KEY = 'workstation_projects';
const COLUMNS_STORAGE_KEY = 'workstation_kanban_columns';
const CURRENT_PROJECT_KEY = 'workstation_current_project';

export class ProjectStorage {
  private userId: string | null;

  constructor(userId: string | null = null) {
    this.userId = userId;
  }

  setUserId(userId: string | null) {
    this.userId = userId;
  }

  // ============ Projects ============

  async loadProjects(): Promise<Project[]> {
    if (this.userId) {
      return this.loadProjectsFromSupabase();
    } else {
      return this.loadProjectsFromLocalStorage();
    }
  }

  async createProject(project: Omit<Project, 'id' | 'createdAt' | 'isArchived' | 'user_id'>): Promise<{ success: boolean; project?: Project; error?: Error }> {
    const newProject: Project = {
      id: uuidv4(),
      ...project,
      createdAt: Date.now(),
      isArchived: false,
      user_id: this.userId,
    };

    if (this.userId) {
      return this.addProjectToSupabase(newProject);
    } else {
      return this.addProjectToLocalStorage(newProject);
    }
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<{ success: boolean; error?: Error }> {
    if (this.userId) {
      return this.updateProjectInSupabase(id, updates);
    } else {
      return this.updateProjectInLocalStorage(id, updates);
    }
  }

  async deleteProject(id: string): Promise<{ success: boolean; error?: Error }> {
    if (this.userId) {
      return this.deleteProjectFromSupabase(id);
    } else {
      return this.deleteProjectFromLocalStorage(id);
    }
  }

  async getOrCreateDefaultProject(): Promise<Project> {
    const projects = await this.loadProjects();
    const nonArchivedProjects = projects.filter(p => !p.isArchived);

    if (nonArchivedProjects.length > 0) {
      return nonArchivedProjects[0];
    }

    // Create default "Personal" project
    const result = await this.createProject({
      name: 'Personal',
      color: PROJECT_COLORS[0],
      description: 'Your personal task space',
    });

    if (result.success && result.project) {
      // Create default columns for this project
      await this.createDefaultColumns(result.project.id);
      return result.project;
    }

    throw new Error('Failed to create default project');
  }

  // ============ Kanban Columns ============

  async loadColumns(projectId: string): Promise<KanbanColumn[]> {
    if (this.userId) {
      return this.loadColumnsFromSupabase(projectId);
    } else {
      return this.loadColumnsFromLocalStorage(projectId);
    }
  }

  async createDefaultColumns(projectId: string): Promise<{ success: boolean; columns?: KanbanColumn[]; error?: Error }> {
    const columns: KanbanColumn[] = DEFAULT_KANBAN_COLUMNS.map((col, index) => ({
      id: uuidv4(),
      projectId,
      ...col,
      position: index,
    }));

    for (const column of columns) {
      if (this.userId) {
        await this.addColumnToSupabase(column);
      } else {
        await this.addColumnToLocalStorage(column);
      }
    }

    return { success: true, columns };
  }

  async addColumn(column: Omit<KanbanColumn, 'id'>): Promise<{ success: boolean; column?: KanbanColumn; error?: Error }> {
    const newColumn: KanbanColumn = {
      id: uuidv4(),
      ...column,
    };

    if (this.userId) {
      return this.addColumnToSupabase(newColumn);
    } else {
      return this.addColumnToLocalStorage(newColumn);
    }
  }

  async updateColumn(id: string, updates: Partial<KanbanColumn>): Promise<{ success: boolean; error?: Error }> {
    if (this.userId) {
      return this.updateColumnInSupabase(id, updates);
    } else {
      return this.updateColumnInLocalStorage(id, updates);
    }
  }

  async deleteColumn(id: string): Promise<{ success: boolean; error?: Error }> {
    if (this.userId) {
      return this.deleteColumnFromSupabase(id);
    } else {
      return this.deleteColumnFromLocalStorage(id);
    }
  }

  async reorderColumns(projectId: string, columnIds: string[]): Promise<{ success: boolean; error?: Error }> {
    const updates = columnIds.map((id, index) => ({ id, position: index }));

    for (const update of updates) {
      const result = await this.updateColumn(update.id, { position: update.position });
      if (!result.success) {
        return result;
      }
    }

    return { success: true };
  }

  // ============ Current Project ============

  getCurrentProjectId(): string | null {
    return localStorage.getItem(CURRENT_PROJECT_KEY);
  }

  setCurrentProjectId(projectId: string): void {
    localStorage.setItem(CURRENT_PROJECT_KEY, projectId);
  }

  // ============ LocalStorage Implementation ============

  private loadProjectsFromLocalStorage(): Project[] {
    try {
      const stored = localStorage.getItem(PROJECTS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load projects from localStorage:', error);
      return [];
    }
  }

  private addProjectToLocalStorage(project: Project): { success: boolean; project?: Project; error?: Error } {
    try {
      const projects = this.loadProjectsFromLocalStorage();
      projects.push(project);
      localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
      return { success: true, project };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  private updateProjectInLocalStorage(id: string, updates: Partial<Project>): { success: boolean; error?: Error } {
    try {
      const projects = this.loadProjectsFromLocalStorage();
      const updatedProjects = projects.map(p =>
        p.id === id ? { ...p, ...updates } : p
      );
      localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(updatedProjects));
      return { success: true };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  private deleteProjectFromLocalStorage(id: string): { success: boolean; error?: Error } {
    try {
      const projects = this.loadProjectsFromLocalStorage();
      const filteredProjects = projects.filter(p => p.id !== id);
      localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(filteredProjects));
      return { success: true };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  private loadColumnsFromLocalStorage(projectId: string): KanbanColumn[] {
    try {
      const stored = localStorage.getItem(COLUMNS_STORAGE_KEY);
      const allColumns: KanbanColumn[] = stored ? JSON.parse(stored) : [];
      return allColumns
        .filter(c => c.projectId === projectId)
        .sort((a, b) => a.position - b.position);
    } catch (error) {
      console.error('Failed to load columns from localStorage:', error);
      return [];
    }
  }

  private addColumnToLocalStorage(column: KanbanColumn): { success: boolean; column?: KanbanColumn; error?: Error } {
    try {
      const stored = localStorage.getItem(COLUMNS_STORAGE_KEY);
      const allColumns: KanbanColumn[] = stored ? JSON.parse(stored) : [];
      allColumns.push(column);
      localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(allColumns));
      return { success: true, column };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  private updateColumnInLocalStorage(id: string, updates: Partial<KanbanColumn>): { success: boolean; error?: Error } {
    try {
      const stored = localStorage.getItem(COLUMNS_STORAGE_KEY);
      const allColumns: KanbanColumn[] = stored ? JSON.parse(stored) : [];
      const updatedColumns = allColumns.map(c =>
        c.id === id ? { ...c, ...updates } : c
      );
      localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(updatedColumns));
      return { success: true };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  private deleteColumnFromLocalStorage(id: string): { success: boolean; error?: Error } {
    try {
      const stored = localStorage.getItem(COLUMNS_STORAGE_KEY);
      const allColumns: KanbanColumn[] = stored ? JSON.parse(stored) : [];
      const filteredColumns = allColumns.filter(c => c.id !== id);
      localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(filteredColumns));
      return { success: true };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  // ============ Supabase Implementation ============

  private async loadProjectsFromSupabase(): Promise<Project[]> {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', this.userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to load projects from Supabase:', error);
        return [];
      }

      return (data || []).map(row => ({
        id: row.id,
        name: row.name,
        color: row.color,
        description: row.description,
        createdAt: new Date(row.created_at).getTime(),
        isArchived: row.is_archived,
        user_id: row.user_id,
      }));
    } catch (error) {
      console.error('Failed to load projects from Supabase:', error);
      return [];
    }
  }

  private async addProjectToSupabase(project: Project): Promise<{ success: boolean; project?: Project; error?: Error }> {
    try {
      const { error } = await supabase
        .from('projects')
        .insert([{
          id: project.id,
          name: project.name,
          color: project.color,
          description: project.description,
          created_at: new Date(project.createdAt).toISOString(),
          is_archived: project.isArchived,
          user_id: this.userId,
        }]);

      if (error) {
        return { success: false, error: error as Error };
      }

      return { success: true, project };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  private async updateProjectInSupabase(id: string, updates: Partial<Project>): Promise<{ success: boolean; error?: Error }> {
    try {
      const dbUpdates: Record<string, unknown> = {};

      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.color !== undefined) dbUpdates.color = updates.color;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.isArchived !== undefined) dbUpdates.is_archived = updates.isArchived;

      const { error } = await supabase
        .from('projects')
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

  private async deleteProjectFromSupabase(id: string): Promise<{ success: boolean; error?: Error }> {
    try {
      const { error } = await supabase
        .from('projects')
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

  private async loadColumnsFromSupabase(projectId: string): Promise<KanbanColumn[]> {
    try {
      const { data, error } = await supabase
        .from('kanban_columns')
        .select('*')
        .eq('project_id', projectId)
        .order('position', { ascending: true });

      if (error) {
        console.error('Failed to load columns from Supabase:', error);
        return [];
      }

      return (data || []).map(row => ({
        id: row.id,
        projectId: row.project_id,
        name: row.name,
        color: row.color,
        position: row.position,
        isDoneColumn: row.is_done_column,
      }));
    } catch (error) {
      console.error('Failed to load columns from Supabase:', error);
      return [];
    }
  }

  private async addColumnToSupabase(column: KanbanColumn): Promise<{ success: boolean; column?: KanbanColumn; error?: Error }> {
    try {
      const { error } = await supabase
        .from('kanban_columns')
        .insert([{
          id: column.id,
          project_id: column.projectId,
          name: column.name,
          color: column.color,
          position: column.position,
          is_done_column: column.isDoneColumn,
        }]);

      if (error) {
        return { success: false, error: error as Error };
      }

      return { success: true, column };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  private async updateColumnInSupabase(id: string, updates: Partial<KanbanColumn>): Promise<{ success: boolean; error?: Error }> {
    try {
      const dbUpdates: Record<string, unknown> = {};

      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.color !== undefined) dbUpdates.color = updates.color;
      if (updates.position !== undefined) dbUpdates.position = updates.position;
      if (updates.isDoneColumn !== undefined) dbUpdates.is_done_column = updates.isDoneColumn;

      const { error } = await supabase
        .from('kanban_columns')
        .update(dbUpdates)
        .eq('id', id);

      if (error) {
        return { success: false, error: error as Error };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  private async deleteColumnFromSupabase(id: string): Promise<{ success: boolean; error?: Error }> {
    try {
      const { error } = await supabase
        .from('kanban_columns')
        .delete()
        .eq('id', id);

      if (error) {
        return { success: false, error: error as Error };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }
}
