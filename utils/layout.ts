import { Task } from '@/types/task';
import { getBubbleSize } from '@/utils/bubble';

/**
 * Compute a sorted grid layout for all tasks.
 *
 * Used when a filter/arrange is active — tasks animate from their
 * freeform canvas positions into this deterministic grid.
 *
 * @param tasks  - tasks pre-sorted by the caller
 * @param startX - top-left X of the grid on the canvas
 * @param startY - top-left Y of the grid on the canvas
 * @param columns - number of columns in the grid
 * @param gap     - spacing between bubble centers
 * @returns Map of task id → { x, y } canvas positions
 */
export const computeArrangedLayout = (
  tasks: Task[],
  startX = 1600,
  startY = 1600,
  columns = 4,
  gap = 160,
): Map<string, { x: number; y: number }> => {
  const positions = new Map<string, { x: number; y: number }>();

  tasks.forEach((task, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const x = startX + col * gap;
    const y = startY + row * gap;
    positions.set(task.id, { x, y });
  });

  return positions;
};

/**
 * Sort tasks by a given key and direction.
 */
export type SortKey = 'priority' | 'energy' | 'dueDate';

export const sortTasks = (
  tasks: Task[],
  key: SortKey,
  ascending: boolean,
): Task[] => {
  const sorted = [...tasks];
  const dir = ascending ? 1 : -1;

  sorted.sort((a, b) => {
    switch (key) {
      case 'priority':
        return (a.priority - b.priority) * dir;
      case 'energy':
        return (a.energy - b.energy) * dir;
      case 'dueDate': {
        // Tasks without a due date sort last.
        if (a.dueDate === null && b.dueDate === null) return 0;
        if (a.dueDate === null) return 1;
        if (b.dueDate === null) return -1;
        return (
          (new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()) * dir
        );
      }
      default:
        return 0;
    }
  });

  return sorted;
};
