import { Task } from "@/types/task";
import { getBubbleSize } from "@/utils/bubble";

export type FilterBy = "default" | "priority" | "energy" | "dueDate";


export type BubblePosition = {
  id: string;
  x: number; // center x on canvas
  y: number; // center y on canvas
};

// Radius derived from the same getBubbleSize used by the renderer.
// priority 1 = 80px diameter = 40px radius (smallest)
// priority 5 = 144px diameter = 72px radius (largest)
function getRadius(priority: number): number {
  return getBubbleSize(priority) / 2;
}

// const GAP = 16; // minimum px gap between bubble edges
const SPIRAL_STEP = 2; // degrees per spiral step (lower = denser search)
const RING_GAP = 12; // extra gap between concentric rings

function overlaps(
  cx: number,
  cy: number,
  cr: number,
  placed: BubblePosition[],
  radii: Map<string, number>,
): boolean {
  for (const p of placed) {
    const pr = radii.get(p.id) ?? 40;
    // Minimum center-to-center distance: sum of radii + a gap that scales
    // with bubble size. Using a minimum of 16px ensures no edge-to-edge
    // overlap even when both bubbles are at their maximum size (72px radius).
    const minDist = cr + pr + Math.max(16, (cr + pr) * 0.12);
    const dx = cx - p.x;
    const dy = cy - p.y;
    if (dx * dx + dy * dy < minDist * minDist) return true;
  }
  return false;
}

function spiralPack(
  tasks: Task[],
  originX: number,
  originY: number,
  radii: Map<string, number>,
  alreadyPlaced: BubblePosition[],
  startRadius: number,
  canvasWidth: number,
  canvasHeight: number,
): { positions: BubblePosition[]; boundingRadius: number } {
  const placed: BubblePosition[] = [...alreadyPlaced];
  const newPositions: BubblePosition[] = [];

  for (const task of tasks) {
    const r = radii.get(task.id) ?? 40;

    // First bubble ever: place at origin
    if (placed.length === 0) {
      const pos = { id: task.id, x: originX, y: originY };
      placed.push(pos);
      newPositions.push(pos);
      continue;
    }

    let angle = 0;
    let radius = Math.max(startRadius + r, r);
    let wasPlaced = false;

    while (!wasPlaced) {
      const cx = originX + radius * Math.cos(angle);
      const cy = originY + radius * Math.sin(angle);
      const inBounds =
        cx - r >= PADDING &&
        cx + r <= canvasWidth - PADDING &&
        cy - r >= PADDING &&
        canvasHeight > 0;

      if (inBounds && !overlaps(cx, cy, r, placed, radii)) {
        const pos = { id: task.id, x: cx, y: cy };
        placed.push(pos);
        newPositions.push(pos);
        wasPlaced = true;
      } else {
        angle += SPIRAL_STEP * (Math.PI / 180); // 2 degrees per step
        if (angle >= Math.PI * 2) {
          angle = 0;
          radius += SPIRAL_STEP; // expand radius by 2px each full revolution
        }
      }
    }
  }

  // Bounding radius = furthest bubble edge from origin
  let maxDist = 0;
  for (const p of newPositions) {
    const r = radii.get(p.id) ?? 40;
    const dist = Math.sqrt((p.x - originX) ** 2 + (p.y - originY) ** 2) + r;
    if (dist > maxDist) maxDist = dist;
  }

  return { positions: newPositions, boundingRadius: maxDist };
}

type DateRank = 0 | 1 | 2 | 3 | 4;
const PADDING = 16;

function getDateRank(dueDate: string | null): DateRank {
  if (!dueDate) return 4;

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 0;
  if (diffDays === 0) return 1;
  if (diffDays <= 7) return 2;
  if (diffDays <= 30) return 3;
  return 4;
}

export function packBubbles(
  tasks: Task[],
  canvasWidth: number,
  canvasHeight: number,
  filterBy: FilterBy,
): { positions: BubblePosition[]; maxBottom: number } {
  if (canvasWidth <= 0 || canvasHeight <= 0) {
    return { positions: [], maxBottom: canvasHeight };
  }

  const originX = canvasWidth / 2;
  const originY = canvasHeight / 2;
  const radii = new Map<string, number>();

  tasks.forEach((t) => radii.set(t.id, getRadius(t.priority)));

  if (filterBy === "default") {
    // Descending: priority 5 (largest) goes to center, smaller bubbles spiral outward.
    const sorted = [...tasks].sort((a, b) => b.priority - a.priority);
    const result = spiralPack(
      sorted,
      originX,
      originY,
      radii,
      [],
      0,
      canvasWidth,
      canvasHeight,
    );
    let maxBottom = canvasHeight;
    result.positions.forEach(p => {
      const radius = radii.get(p.id) ?? 40;
      if (p.y + radius + 40 > maxBottom) maxBottom = p.y + radius + 40;
    });
    return { positions: result.positions, maxBottom };
  }

  const rings: Task[][] = [[], [], [], [], []];

  tasks.forEach((task) => {
    let index = 0;
    if (filterBy === "priority") {
      // Invert so priority 5 → ring 0 (innermost/center), priority 1 → ring 4 (outermost).
      index = 5 - task.priority;
    } else if (filterBy === "energy") {
      index = task.energy - 1;
    } else if (filterBy === "dueDate") {
      const rank = getDateRank(task.dueDate);
      // Ranks 0, 1, 2 (overdue, today, within 7 days) go to innermost ring (0)
      // Remaining tasks push outward
      index = rank <= 2 ? 0 : rank - 2;
    }
    // Safety clamp 0..4
    index = Math.max(0, Math.min(4, index));
    rings[index].push(task);
  });

  rings.forEach((ring) => {
    // Descending: largest bubbles (priority 5) anchor the ring first.
    ring.sort((a, b) => b.priority - a.priority);
  });

  let allPositions: BubblePosition[] = [];
  let currentStartRadius = 0;

  for (let i = 0; i < rings.length; i++) {
    const ringTasks = rings[i];
    if (ringTasks.length === 0) continue;

    // Start ring slightly larger than previous bounds
    // if (i > 0 && currentStartRadius > 0 && ringTasks.length > 0) {
    if (i > 0) {
      currentStartRadius += RING_GAP;
    }

    const result = spiralPack(
      ringTasks,
      originX,
      originY,
      radii,
      allPositions,
      currentStartRadius,
      canvasWidth,
      canvasHeight,
    );
    allPositions = [...allPositions, ...result.positions];
    currentStartRadius = result.boundingRadius;
  }

  let maxBottom = canvasHeight;
  allPositions.forEach(p => {
    const radius = radii.get(p.id) ?? 40;
    if (p.y + radius + 40 > maxBottom) maxBottom = p.y + radius + 40;
  });

  return { positions: allPositions, maxBottom };
}
