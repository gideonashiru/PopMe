import { Task } from '@/types/task';
import { getBubbleSize } from '@/utils/bubble';

export type FilterBy = 'default' | 'priority' | 'energy' | 'dueDate';

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
