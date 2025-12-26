import { sql, isDatabaseAvailable } from '../neon';
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
    if (this.userId && isDatabaseAvailable()) {
      return this.loadProjectsFromNeon();
    } else {
      return this.loadProjectsFromLocalStorage();
    }
  }

  // Returns { data, error } to distinguish network errors from empty results
  async loadProjectsWithStatus(): Promise<{ data: Project[]; error?: Error }> {
    if (this.userId && isDatabaseAvailable()) {
      return this.loadProjectsFromNeonWithStatus();
    } else {
      return { data: this.loadProjectsFromLocalStorage() };
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

    if (this.userId && isDatabaseAvailable()) {
      return this.addProjectToNeon(newProject);
    } else {
      return this.addProjectToLocalStorage(newProject);
    }
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<{ success: boolean; error?: Error }> {
    if (this.userId && isDatabaseAvailable()) {
      return this.updateProjectInNeon(id, updates);
    } else {
      return this.updateProjectInLocalStorage(id, updates);
    }
  }

  async deleteProject(id: string): Promise<{ success: boolean; error?: Error }> {
    if (this.userId && isDatabaseAvailable()) {
      return this.deleteProjectFromNeon(id);
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
    if (this.userId && isDatabaseAvailable()) {
      return this.loadColumnsFromNeon(projectId);
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
      if (this.userId && isDatabaseAvailable()) {
        await this.addColumnToNeon(column);
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

    if (this.userId && isDatabaseAvailable()) {
      return this.addColumnToNeon(newColumn);
    } else {
      return this.addColumnToLocalStorage(newColumn);
    }
  }

  async updateColumn(id: string, updates: Partial<KanbanColumn>): Promise<{ success: boolean; error?: Error }> {
    if (this.userId && isDatabaseAvailable()) {
      return this.updateColumnInNeon(id, updates);
    } else {
      return this.updateColumnInLocalStorage(id, updates);
    }
  }

  async deleteColumn(id: string): Promise<{ success: boolean; error?: Error }> {
    if (this.userId && isDatabaseAvailable()) {
      return this.deleteColumnFromNeon(id);
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

  // ============ Neon Implementation ============

  private async loadProjectsFromNeon(): Promise<Project[]> {
    const result = await this.loadProjectsFromNeonWithStatus();
    return result.data;
  }

  private async loadProjectsFromNeonWithStatus(): Promise<{ data: Project[]; error?: Error }> {
    if (!sql) return { data: [] };

    try {
      const rows = await sql`
        SELECT * FROM projects
        WHERE user_id = ${this.userId}
        ORDER BY created_at DESC
      `;

      const projects = rows.map(row => ({
        id: row.id,
        name: row.name,
        color: row.color,
        description: row.description,
        createdAt: new Date(row.created_at).getTime(),
        isArchived: row.is_archived,
        user_id: row.user_id,
        repoUrl: row.repo_url,
        autoclaudePaused: row.autoclaude_paused ?? true,
      }));

      return { data: projects };
    } catch (error) {
      console.error('Failed to load projects from Neon:', error);
      return { data: [], error: error as Error };
    }
  }

  private async addProjectToNeon(project: Project): Promise<{ success: boolean; project?: Project; error?: Error }> {
    if (!sql) return { success: false, error: new Error('Database not available') };

    try {
      await sql`
        INSERT INTO projects (id, name, color, description, created_at, is_archived, user_id, repo_url)
        VALUES (
          ${project.id},
          ${project.name},
          ${project.color},
          ${project.description ?? null},
          ${new Date(project.createdAt).toISOString()},
          ${project.isArchived},
          ${this.userId},
          ${project.repoUrl ?? null}
        )
      `;

      return { success: true, project };
    } catch (error) {
      console.error('Failed to add project to Neon:', error);
      return { success: false, error: error as Error };
    }
  }

  private async updateProjectInNeon(id: string, updates: Partial<Project>): Promise<{ success: boolean; error?: Error }> {
    if (!sql) return { success: false, error: new Error('Database not available') };

    try {
      // Build SET clauses only for fields that are actually being updated
      const setClauses: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      const addField = (column: string, value: unknown) => {
        setClauses.push(`${column} = $${paramIndex++}`);
        values.push(value);
      };

      if (updates.name !== undefined) addField('name', updates.name);
      if (updates.color !== undefined) addField('color', updates.color);
      if (updates.description !== undefined) addField('description', updates.description);
      if (updates.isArchived !== undefined) addField('is_archived', updates.isArchived);
      if (updates.repoUrl !== undefined) addField('repo_url', updates.repoUrl);
      if (updates.autoclaudePaused !== undefined) addField('autoclaude_paused', updates.autoclaudePaused);

      if (setClauses.length === 0) {
        return { success: true };
      }

      values.push(id, this.userId);
      const query = `UPDATE projects SET ${setClauses.join(', ')} WHERE id = $${paramIndex++} AND user_id = $${paramIndex}`;
      await sql(query, values);

      return { success: true };
    } catch (error) {
      console.error('Failed to update project in Neon:', error);
      return { success: false, error: error as Error };
    }
  }

  private async deleteProjectFromNeon(id: string): Promise<{ success: boolean; error?: Error }> {
    if (!sql) return { success: false, error: new Error('Database not available') };

    try {
      await sql`
        DELETE FROM projects
        WHERE id = ${id} AND user_id = ${this.userId}
      `;

      return { success: true };
    } catch (error) {
      console.error('Failed to delete project from Neon:', error);
      return { success: false, error: error as Error };
    }
  }

  private async loadColumnsFromNeon(projectId: string): Promise<KanbanColumn[]> {
    if (!sql) return [];

    try {
      const rows = await sql`
        SELECT * FROM kanban_columns
        WHERE project_id = ${projectId}
        ORDER BY position ASC
      `;

      return rows.map(row => ({
        id: row.id,
        projectId: row.project_id,
        name: row.name,
        color: row.color,
        position: row.position,
        isDoneColumn: row.is_done_column,
      }));
    } catch (error) {
      console.error('Failed to load columns from Neon:', error);
      return [];
    }
  }

  private async addColumnToNeon(column: KanbanColumn): Promise<{ success: boolean; column?: KanbanColumn; error?: Error }> {
    if (!sql) return { success: false, error: new Error('Database not available') };

    try {
      await sql`
        INSERT INTO kanban_columns (id, project_id, name, color, position, is_done_column)
        VALUES (
          ${column.id},
          ${column.projectId},
          ${column.name},
          ${column.color},
          ${column.position},
          ${column.isDoneColumn}
        )
      `;

      return { success: true, column };
    } catch (error) {
      console.error('Failed to add column to Neon:', error);
      return { success: false, error: error as Error };
    }
  }

  private async updateColumnInNeon(id: string, updates: Partial<KanbanColumn>): Promise<{ success: boolean; error?: Error }> {
    if (!sql) return { success: false, error: new Error('Database not available') };

    try {
      // Build SET clauses only for fields that are actually being updated
      const setClauses: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      const addField = (column: string, value: unknown) => {
        setClauses.push(`${column} = $${paramIndex++}`);
        values.push(value);
      };

      if (updates.name !== undefined) addField('name', updates.name);
      if (updates.color !== undefined) addField('color', updates.color);
      if (updates.position !== undefined) addField('position', updates.position);
      if (updates.isDoneColumn !== undefined) addField('is_done_column', updates.isDoneColumn);

      if (setClauses.length === 0) {
        return { success: true };
      }

      values.push(id);
      const query = `UPDATE kanban_columns SET ${setClauses.join(', ')} WHERE id = $${paramIndex}`;
      await sql(query, values);

      return { success: true };
    } catch (error) {
      console.error('Failed to update column in Neon:', error);
      return { success: false, error: error as Error };
    }
  }

  private async deleteColumnFromNeon(id: string): Promise<{ success: boolean; error?: Error }> {
    if (!sql) return { success: false, error: new Error('Database not available') };

    try {
      await sql`
        DELETE FROM kanban_columns
        WHERE id = ${id}
      `;

      return { success: true };
    } catch (error) {
      console.error('Failed to delete column from Neon:', error);
      return { success: false, error: error as Error };
    }
  }
}
