export type TaskStatus = 'todo' | 'completed';

export interface Task {
  id: string;
  text: string;
  status: TaskStatus;
  createdAt: number;
  completedAt?: number;
}

export enum AppMode {
  AUTO = 'AUTO',
  MANUAL = 'MANUAL',
}

export type SoundType = 'click' | 'success' | 'delete' | 'switch' | 'tab';