import { Task } from "@/types/task";
import { getBubbleSize } from "@/utils/bubble";
import Matter from "matter-js";
import { MutableRefObject, useEffect, useRef } from "react";
import { useWindowDimensions } from "react-native";
import {
  SharedValue,
  makeMutable,
  useSharedValue,
} from "react-native-reanimated";
import { FilterBy } from "@/utils/layout";
export type TidePoolPositions = Map<
  string,
  { x: SharedValue<number>; y: SharedValue<number> }
>;

export const useTidePool = (
  initialTasks: Task[],
  isSorted: boolean,
  scrollYRef: MutableRefObject<number>,
  filterBy: FilterBy,
) => {
  const { width, height } = useWindowDimensions();
  // Canvas height — kept in sync with DepthIndicator & TidePool
  // const canvasHeight = height * 1.8;

  // Dynamic canvas height grows as tasks are added beyond 10
  const canvasHeight = Math.max(
    height * 1.8,
    height * 1.8 + Math.max(0, initialTasks.length - 10) * 60,
  );

  // ─── Stable refs (never recreated) ────────────────────────────────────────

  const engineRef = useRef(
    Matter.Engine.create({
      gravity: { x: 0, y: -0.3, scale: 0.001 }, // negative = upward
    }),
  );

  // FIX #2: Use ref instead of useState so positions Map is NEVER recreated.
  const positionsRef = useRef<TidePoolPositions>(new Map());

  const bodiesRef = useRef<Map<string, Matter.Body>>(new Map());

  // FIX #1a: Tracks which bodyIds are currently in the Matter world — O(1) lookup.
  const activeBodyIds = useRef<Set<string>>(new Set());

  // FIX #1b: Stable loop ref — single RAF loop for the component lifetime.
  const loopRef = useRef<{ lastTick: number; rafId: number }>({
    lastTick: 0,
    rafId: 0,
  });

  // Shared value for sorted state so tickPhysics can read it without closure capture
  const isSortedSV = useSharedValue(isSorted);
  useEffect(() => {
    isSortedSV.value = isSorted;
  }, [isSorted]);

  const filterByRef = useRef<FilterBy>(filterBy);
  useEffect(() => {
    filterByRef.current = filterBy;
  }, [filterBy]);

  const tasksRef = useRef<Map<string, Task>>(new Map());

  // Heights needed in the RAF callback — read from refs so deps stay empty
  const dimensionsRef = useRef({ width, height, canvasHeight });
  useEffect(() => {
    dimensionsRef.current = { width, height, canvasHeight };
  }, [width, height, canvasHeight]);

  const world = engineRef.current.world;

  // ─── Boundary walls ────────────────────────────────────────────────────────

  useEffect(() => {
    const wallThickness = 100;
    const cH = canvasHeight;
    const w = width;
    const ground = Matter.Bodies.rectangle(
      w / 2,
      cH + wallThickness / 2,
      w,
      wallThickness,
      { isStatic: true },
    );
    const ceiling = Matter.Bodies.rectangle(
      w / 2,
      -wallThickness / 2,
      w,
      wallThickness,
      { isStatic: true },
    );
    const leftWall = Matter.Bodies.rectangle(
      -wallThickness / 2,
      cH / 2,
      wallThickness,
      cH + 200,
      { isStatic: true },
    );
    const rightWall = Matter.Bodies.rectangle(
      w + wallThickness / 2,
      cH / 2,
      wallThickness,
      cH + 200,
      { isStatic: true },
    );

    Matter.World.add(world, [ground, ceiling, leftWall, rightWall]);

    return () => {
      // FIX #3: Cancel the RAF *before* clearing the world so the loop never
      // fires on a cleared engine.
      cancelAnimationFrame(loopRef.current.rafId);
      Matter.World.clear(world, false);
      Matter.Engine.clear(engineRef.current);
    };
    
  }, [world]); // walls set up once; if dimensions change we live with it (canvas restarts)

  // ─── Body management ───────────────────────────────────────────────────────

  const addBody = (task: Task) => {
    if (bodiesRef.current.has(task.id)) return;

    const { width: w, canvasHeight: cH } = dimensionsRef.current;
    const radius = getBubbleSize(task.priority) / 2;
    const spawnX = w / 2 + (Math.random() * 80 - 40);
    const spawnY = cH - radius - 20;

    const body = Matter.Bodies.circle(spawnX, spawnY, radius, {
      restitution: 0.4,
      frictionAir: 0.035,
    });

    Matter.Body.setMass(body, task.priority);
    body.plugin = { priority: task.priority };

    // Body starts outside the world — culling will add it when in viewport
    bodiesRef.current.set(task.id, body);
    tasksRef.current.set(task.id, task);

    if (!positionsRef.current.has(task.id)) {
      positionsRef.current.set(task.id, {
        x: makeMutable(spawnX),
        y: makeMutable(spawnY),
      });
    } else {
      const pos = positionsRef.current.get(task.id)!;
      Matter.Body.setPosition(body, { x: pos.x.value, y: pos.y.value });
    }
  };

  const removeBody = (taskId: string) => {
    const body = bodiesRef.current.get(taskId);
    if (body) {
      if (activeBodyIds.current.has(taskId)) {
        Matter.World.remove(world, body);
        activeBodyIds.current.delete(taskId);
      }
      bodiesRef.current.delete(taskId);
    }
    // FIX #4: Clean up shared values so Reanimated doesn't accumulate them
    positionsRef.current.delete(taskId);
    tasksRef.current.delete(taskId);
  };


  // ─── Sync tasks → bodies ───────────────────────────────────────────────────

  useEffect(() => {
    const existingIds = new Set(bodiesRef.current.keys());
    initialTasks.forEach((task) => {
      if (!existingIds.has(task.id)) {
        addBody(task);
      }
      existingIds.delete(task.id);
    });
    existingIds.forEach((id) => removeBody(id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTasks]);

  // ─── Sort toggle ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (isSorted) {
      engineRef.current.gravity.y = 0;
      bodiesRef.current.forEach((body) => {
        Matter.Body.setVelocity(body, { x: 0, y: 0 });
        Matter.Body.setAngularVelocity(body, 0);
      });
    } else {
      engineRef.current.gravity.y = -0.3;
    }
  }, [isSorted]);

  // ─── Physics tick (reads only via refs — safe for empty dep array) ─────────

  const tickPhysics = (delta: number) => {
    if (isSortedSV.value) return;

    const engine = engineRef.current;
    const bodies = bodiesRef.current;
    const pos = positionsRef.current;
    const activeIds = activeBodyIds.current;
    const { height: h } = dimensionsRef.current;
    const viewportY = scrollYRef.current;
    const activeMin = viewportY - 300;
    const activeMax = viewportY + h + 300;

    // FIX #1b: Build culling set — O(n) with O(1) set checks, no allBodies() call
    const desiredActiveIds = new Set<string>();
    const distances: Array<{ id: string; dist: number }> = [];

    bodies.forEach((body, id) => {
      const yPos = pos.get(id)?.y.value ?? body.position.y;
      if (yPos >= activeMin && yPos <= activeMax) {
        distances.push({ id, dist: Math.abs(yPos - (viewportY + h / 2)) });
      }
    });

    // Keep closest 20 in viewport
    distances
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 20)
      .forEach(({ id }) => desiredActiveIds.add(id));

    // Activate bodies that entered the viewport
    desiredActiveIds.forEach((id) => {
      if (!activeIds.has(id)) {
        const body = bodies.get(id);
        if (body) {
          Matter.World.add(engine.world, body);
          activeIds.add(id);
          const savedPos = pos.get(id);
          if (savedPos) {
            Matter.Body.setPosition(body, {
              x: savedPos.x.value,
              y: savedPos.y.value,
            });
            Matter.Body.setVelocity(body, { x: 0, y: 0 });
          }
        }
      }
    });

    // Deactivate bodies that left the viewport
    activeIds.forEach((id) => {
      if (!desiredActiveIds.has(id)) {
        const body = bodies.get(id);
        if (body) {
          Matter.World.remove(engine.world, body);
        }
        activeIds.delete(id);
      }
    });

    // Step the world
    Matter.Engine.update(engine, delta);

    // Buoyancy + drift + position sync — only for active bodies
    activeIds.forEach((taskId) => {
      const body = bodies.get(taskId);
      if (!body) return;

      // const priority = body.plugin.priority || 3;
      // const buoyancyStrength = (6 - priority) * 0.00012;


      const task = tasksRef.current.get(taskId);
      if (!task) return;

      // Uniform buoyancy for all bubbles (same as priority 3 previously)
      const buoyancyStrength = 0.00036;

      Matter.Body.applyForce(body, body.position, {
        x: 0,
        y: -buoyancyStrength * body.mass,
      });

      if (Math.random() < 0.005) {
        Matter.Body.applyForce(body, body.position, {
          x: (Math.random() - 0.5) * 0.00004,
          y: (Math.random() - 0.5) * 0.00004,
        });
      }

      const p = pos.get(taskId);
      if (p) {
        p.x.value = body.position.x;
        p.y.value = body.position.y;
      }
    });
  };

  // ─── RAF loop — started once, runs forever, stable ─────────────────────────

  useEffect(() => {
    const loop = (timestamp: number) => {
      if (timestamp - loopRef.current.lastTick >= 32) {
        tickPhysics(32);
        loopRef.current.lastTick = timestamp;
      }
      loopRef.current.rafId = requestAnimationFrame(loop);
    };

    loopRef.current.rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(loopRef.current.rafId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // empty — tickPhysics reads everything through stable refs

  return {
    positions: positionsRef.current,
    canvasHeight,
    removeBody,
    addBody,
  };
};
