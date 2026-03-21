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

import { CompletedTask, Task } from '@/types/task';
import { toIsoDate } from '@/utils/date';

const STORAGE_KEY = 'popme:completed';

export type CompletedContextValue = {
  completedTasks: CompletedTask[];
  isLoaded: boolean;
  /** Move a task into the completed list. */
  completeTask: (task: Task) => void;
  /** Remove a task from the completed list and return it for reinflation. */
  reinflateTask: (id: string) => CompletedTask | null;
  /** Permanently delete all completed tasks. */
  clearAll: () => void;
};

const CompletedContext = createContext<CompletedContextValue | undefined>(
  undefined,
);

export const CompletedProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Debounced persistence
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persist = useCallback((tasks: CompletedTask[]) => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)).catch((err) =>
        console.warn('[PopMe] Failed to persist completed tasks:', err),
      );
    }, 300);
  }, []);

  // Load on mount
  useEffect(() => {
    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          setCompletedTasks(JSON.parse(raw));
        }
      } catch (err) {
        console.warn('[PopMe] Failed to load completed tasks:', err);
      } finally {
        setIsLoaded(true);
      }
    };
    load();
  }, []);

  const setAndPersist = useCallback(
    (updater: (prev: CompletedTask[]) => CompletedTask[]) => {
      setCompletedTasks((prev) => {
        const next = updater(prev);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const completeTask = useCallback(
    (task: Task) => {
      const completed: CompletedTask = {
        ...task,
        completedAt: toIsoDate(new Date()),
        originalPosition: { ...task.position },
      };
      setAndPersist((prev) => [completed, ...prev]);
    },
    [setAndPersist],
  );

  const reinflateTask = useCallback(
    (id: string): CompletedTask | null => {
      let found: CompletedTask | null = null;
      setAndPersist((prev) => {
        const idx = prev.findIndex((t) => t.id === id);
        if (idx === -1) return prev;
        found = prev[idx];
        return prev.filter((_, i) => i !== idx);
      });
      return found;
    },
    [setAndPersist],
  );

  const clearAll = useCallback(() => {
    setAndPersist(() => []);
  }, [setAndPersist]);

  const value = useMemo(
    () => ({
      completedTasks,
      isLoaded,
      completeTask,
      reinflateTask,
      clearAll,
    }),
    [completedTasks, isLoaded, completeTask, reinflateTask, clearAll],
  );

  return (
    <CompletedContext.Provider value={value}>
      {children}
    </CompletedContext.Provider>
  );
};

export const useCompleted = () => {
  const context = useContext(CompletedContext);
  if (!context) {
    throw new Error('useCompleted must be used inside CompletedProvider');
  }
  return context;
};
