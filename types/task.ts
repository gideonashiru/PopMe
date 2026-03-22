export type TaskStatus = 'active' | 'completed';

export type Subtask = {
  id: string;
  title: string;
  completed: boolean;
};

export type TaskPosition = {
  /** Absolute pixel coordinates on the canvas */
  x: number;
  y: number;
};

export type Task = {
  id: string;
  title: string;
  priority: number; // 1..5
  energy: number; // 1..5
  dueDate: string | null; // ISO string
  subtasks: Subtask[];
  status: TaskStatus;
  position: TaskPosition;
  createdAt: string;
  updatedAt: string;
};

/** The virtual canvas is a square of this size (px). */
export const CANVAS_SIZE = 1000;

/** New tasks spawn within this rectangle on the canvas. */
export const SPAWN_REGION = {
  x: 1600,
  y: 1600,
  width: 800,
  height: 800,
} as const;

/** A task that has been completed via needle mode. */
export type CompletedTask = Task & {
  completedAt: string;
  originalPosition: TaskPosition;
};
