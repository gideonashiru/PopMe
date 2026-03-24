import { useLayoutEffect, useRef, useState } from 'react';
import { SharedValue, makeMutable, withDelay, withSpring } from 'react-native-reanimated';
import { Task } from '@/types/task';
import { packBubbles, FilterBy, BubblePosition } from '@/utils/bubbleLayout';

export type BubbleSharedValues = {
  x: SharedValue<number>;
  y: SharedValue<number>;
  scale: SharedValue<number>;
};

export type BubbleLayoutMap = Map<string, BubbleSharedValues>;

const TRANSITION_SPRING = { damping: 18, stiffness: 120, mass: 1 };
const SPAWN_SPRING = { damping: 14, stiffness: 100, mass: 0.8 };

export function useBubbleLayout(
  tasks: Task[],
  filterBy: FilterBy,
  canvasWidth: number,
  canvasHeight: number,
): BubbleLayoutMap {
  const layoutMapRef = useRef<BubbleLayoutMap>(new Map());
  const previousIdsRef = useRef<Set<string>>(new Set());
  const [, setLayoutRevision] = useState(0);

  useLayoutEffect(() => {
    if (canvasWidth <= 0 || canvasHeight <= 0) return;

    // 1. Calculate new flat map of strict positions based on math
    const packedPositions = packBubbles(tasks, canvasWidth, canvasHeight, filterBy);
    
    const targetMap = new Map<string, BubblePosition>();
    packedPositions.forEach(p => targetMap.set(p.id, p));

    const map = layoutMapRef.current;
    const currentIds = new Set(tasks.map(t => t.id));

    // 2. Remove items that no longer exist
    for (const [id] of map) {
      if (!currentIds.has(id)) {
        map.delete(id);
      }
    }

    // 3. Inject new and update existing
    let newIndexCount = 0;
    
    tasks.forEach(task => {
      const target = targetMap.get(task.id);
      if (!target) return; // Should not happen in pure logic

      const exists = previousIdsRef.current.has(task.id);

      if (!exists) {
        // New tasks — set positions immediately to avoid fly-in, bounce scale
        map.set(task.id, {
          x: makeMutable(target.x),
          y: makeMutable(target.y),
          scale: makeMutable(0),
        });

        const entry = map.get(task.id)!;
        entry.x.value = target.x;
        entry.y.value = target.y;

        // If very first mount, stagger the scales
        const isInitialMount = previousIdsRef.current.size === 0;
        if (isInitialMount) {
          entry.scale.value = withDelay(
            newIndexCount * 40,
            withSpring(1, SPAWN_SPRING)
          );
        } else {
          entry.scale.value = withSpring(1, SPAWN_SPRING);
        }
        newIndexCount++;
      } else {
        // Existing tasks — animate x/y position to smoothly transition shapes
        const entry = map.get(task.id)!;
        entry.x.value = withSpring(target.x, TRANSITION_SPRING);
        entry.y.value = withSpring(target.y, TRANSITION_SPRING);
        entry.scale.value = 1; // force scale
      }
    });

    previousIdsRef.current = currentIds;

    setLayoutRevision((r) => r + 1);
  }, [tasks, filterBy, canvasWidth, canvasHeight]);

  return layoutMapRef.current;
}
