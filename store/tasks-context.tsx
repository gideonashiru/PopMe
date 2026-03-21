import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { sampleTasks } from '@/data/sampleTasks';
import { CANVAS_SIZE, Task, TaskPosition, TaskStatus } from '@/types/task';
import { getRandomPosition } from '@/utils/bubble';
import { toIsoDate } from '@/utils/date';

const STORAGE_KEY = 'popme:tasks';

export type TaskUpdate = Partial<Omit<Task, 'id' | 'createdAt'>>;

export type TasksContextValue = {
  tasks: Task[];
  isLoaded: boolean;
  addTask: (
    title: string,
    overrides?: Partial<Omit<Task, 'id' | 'title' | 'createdAt'>>,
  ) => string;
  removeTask: (id: string) => void;
  updateTask: (id: string, updates: TaskUpdate) => void;
  updateTaskPosition: (id: string, position: TaskPosition) => void;
  markTaskStatus: (id: string, status: TaskStatus) => void;
  addSubtask: (taskId: string, title: string) => void;
  removeSubtask: (taskId: string, subtaskId: string) => void;
};

const TasksContext = createContext<TasksContextValue | undefined>(undefined);

/**
 * If a task's position looks like the old normalized 0-1 range,
 * scale it up to canvas coordinates. This handles migration from
 * the old data format.
 */
const migratePosition = (pos: TaskPosition): TaskPosition => {
  if (pos.x <= 1 && pos.y <= 1) {
    return {
      x: pos.x * CANVAS_SIZE * 0.5 + CANVAS_SIZE * 0.25,
      y: pos.y * CANVAS_SIZE * 0.5 + CANVAS_SIZE * 0.25,
    };
  }
  return pos;
};

export const TasksProvider = ({ children }: { children: React.ReactNode }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Debounced persistence
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tasksRef = useRef<Task[]>(tasks);
  tasksRef.current = tasks;

  const persistTasks = useCallback((tasksToSave: Task[]) => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tasksToSave)).catch(
        (err) => console.warn('[PopMe] Failed to persist tasks:', err),
      );
    }, 300);
  }, []);

  // Load on mount
  useEffect(() => {
    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed: Task[] = JSON.parse(raw);
          // Migrate any old normalized positions
          const migrated = parsed.map((t) => ({
            ...t,
            position: migratePosition(t.position),
          }));
          setTasks(migrated);
        } else {
          // First launch — use sample tasks with canvas coords
          setTasks(sampleTasks);
        }
      } catch (err) {
        console.warn('[PopMe] Failed to load tasks:', err);
        setTasks(sampleTasks);
      } finally {
        setIsLoaded(true);
      }
    };
    load();
  }, []);

  const setTasksAndPersist = useCallback(
    (updater: (prev: Task[]) => Task[]) => {
      setTasks((prev) => {
        const next = updater(prev);
        persistTasks(next);
        return next;
      });
    },
    [persistTasks],
  );

  const addTask = useCallback(
    (
      title: string,
      overrides?: Partial<Omit<Task, 'id' | 'title' | 'createdAt'>>,
    ) => {
      const now = new Date();
      const id = `task-${Date.now()}`;
      const task: Task = {
        id,
        title: title.trim() || 'Untitled',
        priority: overrides?.priority ?? 3,
        energy: overrides?.energy ?? 3,
        dueDate: overrides?.dueDate ?? null,
        subtasks: overrides?.subtasks ?? [],
        status: overrides?.status ?? 'active',
        position: overrides?.position ?? getRandomPosition(),
        createdAt: toIsoDate(now),
        updatedAt: toIsoDate(now),
      };

      setTasksAndPersist((prev) => [task, ...prev]);
      return id;
    },
    [setTasksAndPersist],
  );

  const updateTask = useCallback(
    (id: string, updates: TaskUpdate) => {
      setTasksAndPersist((prev) =>
        prev.map((task) =>
          task.id === id
            ? { ...task, ...updates, updatedAt: toIsoDate(new Date()) }
            : task,
        ),
      );
    },
    [setTasksAndPersist],
  );

  const updateTaskPosition = useCallback(
    (id: string, position: TaskPosition) => {
      setTasksAndPersist((prev) =>
        prev.map((task) =>
          task.id === id
            ? { ...task, position, updatedAt: toIsoDate(new Date()) }
            : task,
        ),
      );
    },
    [setTasksAndPersist],
  );

  const removeTask = useCallback(
    (id: string) => {
      setTasksAndPersist((prev) => prev.filter((task) => task.id !== id));
    },
    [setTasksAndPersist],
  );

  const markTaskStatus = useCallback(
    (id: string, status: TaskStatus) => {
      setTasksAndPersist((prev) =>
        prev.map((task) =>
          task.id === id
            ? { ...task, status, updatedAt: toIsoDate(new Date()) }
            : task,
        ),
      );
    },
    [setTasksAndPersist],
  );

  const addSubtask = useCallback(
    (taskId: string, title: string) => {
      setTasksAndPersist((prev) =>
        prev.map((task) =>
          task.id === taskId
            ? {
                ...task,
                subtasks: [
                  ...task.subtasks,
                  {
                    id: `sub-${Date.now()}`,
                    title: title.trim(),
                    completed: false,
                  },
                ],
                updatedAt: toIsoDate(new Date()),
              }
            : task,
        ),
      );
    },
    [setTasksAndPersist],
  );

  const removeSubtask = useCallback(
    (taskId: string, subtaskId: string) => {
      setTasksAndPersist((prev) =>
        prev.map((task) =>
          task.id === taskId
            ? {
                ...task,
                subtasks: task.subtasks.filter((sub) => sub.id !== subtaskId),
                updatedAt: toIsoDate(new Date()),
              }
            : task,
        ),
      );
    },
    [setTasksAndPersist],
  );

  const value = useMemo(
    () => ({
      tasks,
      isLoaded,
      addTask,
      removeTask,
      updateTask,
      updateTaskPosition,
      markTaskStatus,
      addSubtask,
      removeSubtask,
    }),
    [
      tasks,
      isLoaded,
      addTask,
      removeTask,
      updateTask,
      updateTaskPosition,
      markTaskStatus,
      addSubtask,
      removeSubtask,
    ],
  );

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
};

export const useTasks = () => {
  const context = useContext(TasksContext);
  if (!context) {
    throw new Error('useTasks must be used inside TasksProvider');
  }
  return context;
};
