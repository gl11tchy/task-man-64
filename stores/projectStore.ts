import { create } from 'zustand';
import { Project, KanbanColumn, Task, PROJECT_COLORS } from '../types';
import { ProjectStorage } from '../services/projectStorage';
import { TaskStorage } from '../services/taskStorage';
import { v4 as uuidv4 } from 'uuid';

interface ProjectState {
  // Data
  projects: Project[];
  currentProjectId: string | null;
  columns: KanbanColumn[];
  tasks: Task[];

  // Loading states
  isLoading: boolean;
  isInitialized: boolean;

  // Storage refs (set by App)
  projectStorage: ProjectStorage | null;
  taskStorage: TaskStorage | null;

  // Computed
  currentProject: Project | null;
  activeTasks: Task[];
  completedTasks: Task[];
  backlogTasks: Task[];
  kanbanTasks: Task[];

  // Actions
  setStorageRefs: (projectStorage: ProjectStorage, taskStorage: TaskStorage) => void;
  initialize: () => Promise<void>;
  setCurrentProject: (projectId: string) => Promise<void>;

  // Project CRUD
  createProject: (name: string, color?: string, description?: string) => Promise<Project | null>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  archiveProject: (id: string) => Promise<void>;

  // Column management
  loadColumns: (projectId: string) => Promise<void>;
  addColumn: (name: string, color: string) => Promise<void>;
  updateColumn: (id: string, updates: Partial<KanbanColumn>) => Promise<void>;
  deleteColumn: (id: string) => Promise<void>;
  reorderColumns: (columnIds: string[]) => Promise<void>;

  // Task actions
  addTask: (text: string, toBacklog?: boolean, columnId?: string) => Promise<Task | null>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  completeTask: (id: string) => Promise<void>;
  restoreTask: (id: string) => Promise<void>;
  moveTaskToColumn: (taskId: string, columnId: string, position: number) => Promise<void>;
  moveTaskToBacklog: (taskId: string, position?: number) => Promise<void>;
  promoteFromBacklog: (taskId: string, columnId?: string) => Promise<void>;
  reorderTasks: (tasks: Task[]) => void;
  reorderBacklogTasks: (tasks: Task[]) => void;

  // Refresh
  refreshTasks: () => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  // Initial state
  projects: [],
  currentProjectId: null,
  columns: [],
  tasks: [],
  isLoading: true,
  isInitialized: false,
  projectStorage: null,
  taskStorage: null,

  // Computed getters (these update when state changes)
  get currentProject() {
    const state = get();
    return state.projects.find(p => p.id === state.currentProjectId) || null;
  },

  get activeTasks() {
    const state = get();
    return state.tasks.filter(t =>
      t.projectId === state.currentProjectId &&
      t.status === 'todo' &&
      !t.isInBacklog
    );
  },

  get completedTasks() {
    const state = get();
    return state.tasks
      .filter(t => t.projectId === state.currentProjectId && t.status === 'completed')
      .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
  },

  get backlogTasks() {
    const state = get();
    return state.tasks
      .filter(t => t.projectId === state.currentProjectId && t.isInBacklog)
      .sort((a, b) => (a.backlogPosition ?? 0) - (b.backlogPosition ?? 0));
  },

  get kanbanTasks() {
    const state = get();
    return state.tasks.filter(t =>
      t.projectId === state.currentProjectId &&
      !t.isInBacklog &&
      t.kanbanColumnId
    );
  },

  // Storage setup
  setStorageRefs: (projectStorage, taskStorage) => {
    set({ projectStorage, taskStorage });
  },

  // Initialize - load projects and set current project
  initialize: async () => {
    const { projectStorage, taskStorage } = get();
    if (!projectStorage || !taskStorage) return;

    set({ isLoading: true });

    try {
      // Load all projects
      let projects = await projectStorage.loadProjects();

      // If no projects exist, create default
      if (projects.length === 0) {
        const defaultProject = await projectStorage.getOrCreateDefaultProject();
        projects = [defaultProject];
      }

      // Get saved current project or use first
      const savedProjectId = projectStorage.getCurrentProjectId();
      const currentProjectId = savedProjectId && projects.find(p => p.id === savedProjectId)
        ? savedProjectId
        : projects[0]?.id || null;

      // Load columns and tasks for current project
      let columns: KanbanColumn[] = [];
      let tasks: Task[] = [];

      if (currentProjectId) {
        columns = await projectStorage.loadColumns(currentProjectId);
        // If no columns, create defaults
        if (columns.length === 0) {
          const result = await projectStorage.createDefaultColumns(currentProjectId);
          columns = result.columns || [];
        }

        tasks = await taskStorage.loadTasks();
        projectStorage.setCurrentProjectId(currentProjectId);
      }

      set({
        projects,
        currentProjectId,
        columns,
        tasks,
        isLoading: false,
        isInitialized: true,
      });
    } catch (error) {
      console.error('Failed to initialize project store:', error);
      set({ isLoading: false, isInitialized: true });
    }
  },

  setCurrentProject: async (projectId) => {
    const { projectStorage, taskStorage } = get();
    if (!projectStorage || !taskStorage) return;

    set({ isLoading: true });

    // Load columns for new project
    let columns = await projectStorage.loadColumns(projectId);
    if (columns.length === 0) {
      const result = await projectStorage.createDefaultColumns(projectId);
      columns = result.columns || [];
    }

    projectStorage.setCurrentProjectId(projectId);

    set({
      currentProjectId: projectId,
      columns,
      isLoading: false,
    });
  },

  // Project CRUD
  createProject: async (name, color, description) => {
    const { projectStorage } = get();
    if (!projectStorage) return null;

    const result = await projectStorage.createProject({
      name,
      color: color || PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)],
      description,
    });

    if (result.success && result.project) {
      // Create default columns for new project
      await projectStorage.createDefaultColumns(result.project.id);

      set((state) => ({
        projects: [...state.projects, result.project!],
      }));

      return result.project;
    }

    return null;
  },

  updateProject: async (id, updates) => {
    const { projectStorage } = get();
    if (!projectStorage) return;

    const result = await projectStorage.updateProject(id, updates);
    if (result.success) {
      set((state) => ({
        projects: state.projects.map(p =>
          p.id === id ? { ...p, ...updates } : p
        ),
      }));
    }
  },

  archiveProject: async (id) => {
    const { projectStorage, projects, currentProjectId } = get();
    if (!projectStorage) return;

    const result = await projectStorage.updateProject(id, { isArchived: true });
    if (result.success) {
      const updatedProjects = projects.map(p =>
        p.id === id ? { ...p, isArchived: true } : p
      );

      // If archiving current project, switch to another
      let newCurrentId = currentProjectId;
      if (currentProjectId === id) {
        const activeProjects = updatedProjects.filter(p => !p.isArchived);
        newCurrentId = activeProjects[0]?.id || null;
        if (newCurrentId) {
          await get().setCurrentProject(newCurrentId);
        }
      }

      set({ projects: updatedProjects });
    }
  },

  // Column management
  loadColumns: async (projectId) => {
    const { projectStorage } = get();
    if (!projectStorage) return;

    const columns = await projectStorage.loadColumns(projectId);
    set({ columns });
  },

  addColumn: async (name, color) => {
    const { projectStorage, currentProjectId, columns } = get();
    if (!projectStorage || !currentProjectId) return;

    const newColumn = await projectStorage.addColumn({
      projectId: currentProjectId,
      name,
      color,
      position: columns.length,
      isDoneColumn: false,
    });

    if (newColumn.success && newColumn.column) {
      set((state) => ({
        columns: [...state.columns, newColumn.column!],
      }));
    }
  },

  updateColumn: async (id, updates) => {
    const { projectStorage } = get();
    if (!projectStorage) return;

    const result = await projectStorage.updateColumn(id, updates);
    if (result.success) {
      set((state) => ({
        columns: state.columns.map(c =>
          c.id === id ? { ...c, ...updates } : c
        ),
      }));
    }
  },

  deleteColumn: async (id) => {
    const { projectStorage } = get();
    if (!projectStorage) return;

    const result = await projectStorage.deleteColumn(id);
    if (result.success) {
      set((state) => ({
        columns: state.columns.filter(c => c.id !== id),
      }));
    }
  },

  reorderColumns: async (columnIds) => {
    const { projectStorage, currentProjectId } = get();
    if (!projectStorage || !currentProjectId) return;

    await projectStorage.reorderColumns(currentProjectId, columnIds);

    set((state) => ({
      columns: columnIds.map((id, index) => {
        const col = state.columns.find(c => c.id === id);
        return col ? { ...col, position: index } : col;
      }).filter(Boolean) as KanbanColumn[],
    }));
  },

  // Task actions
  addTask: async (text, toBacklog = false, columnId) => {
    const { taskStorage, currentProjectId, columns, tasks } = get();
    if (!taskStorage || !currentProjectId) return null;

    const todoColumn = columns.find(c => c.position === 0) || columns[0];
    const targetColumnId = columnId || todoColumn?.id;

    // Calculate position
    let kanbanPosition = 0;
    let backlogPosition: number | null = null;

    if (toBacklog) {
      const backlogTasks = tasks.filter(t =>
        t.projectId === currentProjectId && t.isInBacklog
      );
      backlogPosition = backlogTasks.length;
    } else if (targetColumnId) {
      const columnTasks = tasks.filter(t =>
        t.projectId === currentProjectId &&
        t.kanbanColumnId === targetColumnId
      );
      kanbanPosition = columnTasks.length;
    }

    const newTask: Task = {
      id: uuidv4(),
      text,
      status: 'todo',
      createdAt: Date.now(),
      projectId: currentProjectId,
      kanbanColumnId: toBacklog ? null : targetColumnId,
      kanbanPosition: toBacklog ? undefined : kanbanPosition,
      backlogPosition: toBacklog ? backlogPosition : null,
      isInBacklog: toBacklog,
      priority: null,
      tags: [],
    };

    const result = await taskStorage.addTask(newTask);
    if (result.success) {
      set((state) => ({
        tasks: [newTask, ...state.tasks],
      }));
      return newTask;
    }

    return null;
  },

  updateTask: async (id, updates) => {
    const { taskStorage } = get();
    if (!taskStorage) return;

    const result = await taskStorage.updateTask(id, updates);
    if (result.success) {
      set((state) => ({
        tasks: state.tasks.map(t =>
          t.id === id ? { ...t, ...updates } : t
        ),
      }));
    }
  },

  deleteTask: async (id) => {
    const { taskStorage } = get();
    if (!taskStorage) return;

    const result = await taskStorage.deleteTask(id);
    if (result.success) {
      set((state) => ({
        tasks: state.tasks.filter(t => t.id !== id),
      }));
    }
  },

  completeTask: async (id) => {
    const { taskStorage, columns } = get();
    if (!taskStorage) return;

    const doneColumn = columns.find(c => c.isDoneColumn);
    const completedAt = Date.now();

    const updates: Partial<Task> = {
      status: 'completed',
      completedAt,
    };

    if (doneColumn) {
      updates.kanbanColumnId = doneColumn.id;
    }

    const result = await taskStorage.updateTask(id, updates);
    if (result.success) {
      set((state) => ({
        tasks: state.tasks.map(t =>
          t.id === id ? { ...t, ...updates } : t
        ),
      }));
    }
  },

  restoreTask: async (id) => {
    const { taskStorage, columns } = get();
    if (!taskStorage) return;

    const todoColumn = columns.find(c => c.position === 0) || columns[0];

    const updates: Partial<Task> = {
      status: 'todo',
      completedAt: undefined,
      kanbanColumnId: todoColumn?.id,
    };

    const result = await taskStorage.updateTask(id, updates);
    if (result.success) {
      set((state) => ({
        tasks: state.tasks.map(t =>
          t.id === id ? { ...t, ...updates } : t
        ),
      }));
    }
  },

  moveTaskToColumn: async (taskId, columnId, position) => {
    const { taskStorage, columns } = get();
    if (!taskStorage) return;

    const column = columns.find(c => c.id === columnId);
    const updates: Partial<Task> = {
      kanbanColumnId: columnId,
      kanbanPosition: position,
      isInBacklog: false,
      backlogPosition: null,
    };

    // If moving to done column, mark as completed
    if (column?.isDoneColumn) {
      updates.status = 'completed';
      updates.completedAt = Date.now();
    } else {
      updates.status = 'todo';
      updates.completedAt = undefined;
    }

    const result = await taskStorage.updateTask(taskId, updates);
    if (result.success) {
      set((state) => ({
        tasks: state.tasks.map(t =>
          t.id === taskId ? { ...t, ...updates } : t
        ),
      }));
    }
  },

  moveTaskToBacklog: async (taskId, position) => {
    const { taskStorage, tasks, currentProjectId } = get();
    if (!taskStorage || !currentProjectId) return;

    const backlogTasks = tasks.filter(t =>
      t.projectId === currentProjectId && t.isInBacklog
    );
    const newPosition = position ?? backlogTasks.length;

    const result = await taskStorage.moveToBacklog(taskId, newPosition);
    if (result.success) {
      set((state) => ({
        tasks: state.tasks.map(t =>
          t.id === taskId
            ? {
                ...t,
                isInBacklog: true,
                kanbanColumnId: null,
                kanbanPosition: undefined,
                backlogPosition: newPosition,
              }
            : t
        ),
      }));
    }
  },

  promoteFromBacklog: async (taskId, columnId) => {
    const { taskStorage, columns, tasks, currentProjectId } = get();
    if (!taskStorage || !currentProjectId) return;

    const todoColumn = columns.find(c => c.position === 0) || columns[0];
    const targetColumnId = columnId || todoColumn?.id;

    if (!targetColumnId) return;

    const columnTasks = tasks.filter(t =>
      t.projectId === currentProjectId &&
      t.kanbanColumnId === targetColumnId
    );

    const result = await taskStorage.promoteToBoard(taskId, targetColumnId, columnTasks.length);
    if (result.success) {
      set((state) => ({
        tasks: state.tasks.map(t =>
          t.id === taskId
            ? {
                ...t,
                isInBacklog: false,
                kanbanColumnId: targetColumnId,
                kanbanPosition: columnTasks.length,
                backlogPosition: null,
                status: 'todo',
              }
            : t
        ),
      }));
    }
  },

  reorderTasks: (reorderedTasks) => {
    set((state) => {
      // Get tasks not affected by reorder
      const otherTasks = state.tasks.filter(t =>
        !reorderedTasks.some(rt => rt.id === t.id)
      );

      return {
        tasks: [...reorderedTasks, ...otherTasks],
      };
    });
  },

  reorderBacklogTasks: (reorderedTasks) => {
    // Update backlog positions
    const updatedTasks = reorderedTasks.map((t, index) => ({
      ...t,
      backlogPosition: index,
    }));

    set((state) => {
      const otherTasks = state.tasks.filter(t => !t.isInBacklog);
      return {
        tasks: [...updatedTasks, ...otherTasks],
      };
    });
  },

  refreshTasks: async () => {
    const { taskStorage } = get();
    if (!taskStorage) return;

    const tasks = await taskStorage.loadTasks();
    set({ tasks });
  },
}));
