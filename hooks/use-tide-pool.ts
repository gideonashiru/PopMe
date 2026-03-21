import { Task } from "@/types/task";
import { getBubbleSize } from "@/utils/bubble";
import Matter from "matter-js";
import { useEffect, useRef, useState } from "react";
import { useWindowDimensions } from "react-native";
import {
  SharedValue,
  makeMutable,
  useFrameCallback,
  useSharedValue,
  runOnJS,
} from "react-native-reanimated";

export type TidePoolPositions = Map<
  string,
  { x: SharedValue<number>; y: SharedValue<number> }
>;

export const useTidePool = (initialTasks: Task[], isSorted: boolean) => {
  const { width, height } = useWindowDimensions();
  // canvas height: screen height × 2.5 (scrollable space)
  const canvasHeight = height * 2.5;

  const engineRef = useRef(
    Matter.Engine.create({
      gravity: { x: 0, y: -0.3, scale: 0.001 }, // negative = upward
    }),
  );
  const [positions] = useState<TidePoolPositions>(new Map());
  const bodiesRef = useRef<Map<string, Matter.Body>>(new Map());

  const isSortedSV = useSharedValue(isSorted);
  const positionsRef = useRef(positions);

  useEffect(() => {
    isSortedSV.value = isSorted;
  }, [isSorted]);

  useEffect(() => {
    positionsRef.current = positions;
  }, [positions]);

  const world = engineRef.current.world;

  // Setup boundaries
  useEffect(() => {
    const wallThickness = 100;
    const ground = Matter.Bodies.rectangle(
      width / 2,
      canvasHeight + wallThickness / 2,
      width,
      wallThickness,
      { isStatic: true },
    );
    // Keep top open or strict wall? "Boundary walls: left, right, top, bottom static bodies"
    const ceiling = Matter.Bodies.rectangle(
      width / 2,
      -wallThickness / 2,
      width,
      wallThickness,
      { isStatic: true },
    );
    const leftWall = Matter.Bodies.rectangle(
      -wallThickness / 2,
      canvasHeight / 2,
      wallThickness,
      canvasHeight + 200,
      { isStatic: true },
    );
    const rightWall = Matter.Bodies.rectangle(
      width + wallThickness / 2,
      canvasHeight / 2,
      wallThickness,
      canvasHeight + 200,
      { isStatic: true },
    );

    Matter.World.add(world, [ground, ceiling, leftWall, rightWall]);

    return () => {
      Matter.World.clear(world, false);
      Matter.Engine.clear(engineRef.current);
    };
  }, [width, canvasHeight, world]);

  const addBody = (task: Task) => {
    if (bodiesRef.current.has(task.id)) return;

    const radius = getBubbleSize(task.priority) / 2;

    // Spawn at the bottom of the canvas so bubbles rise into the cluster
    const spawnX = width / 2 + (Math.random() * 80 - 40);
    const spawnY = canvasHeight - radius - 20;

    const body = Matter.Bodies.circle(spawnX, spawnY, radius, {
      restitution: 0.4,
      frictionAir: 0.035,
    });

    Matter.Body.setMass(body, task.priority);
    // Keep plugin data
    body.plugin = { priority: task.priority };

    Matter.World.add(world, body);
    bodiesRef.current.set(task.id, body);

    if (!positions.has(task.id)) {
      positions.set(task.id, {
        x: makeMutable(body.position.x),
        y: makeMutable(body.position.y),
      });
    } else {
      positions.get(task.id)!.x.value = body.position.x;
      positions.get(task.id)!.y.value = body.position.y;
    }
  };

  const removeBody = (taskId: string) => {
    const body = bodiesRef.current.get(taskId);
    if (body) {
      Matter.World.remove(world, body);
      bodiesRef.current.delete(taskId);
    }
  };

  const updateBodyPriority = (taskId: string, newPriority: number) => {
    const body = bodiesRef.current.get(taskId);
    if (body) {
      const oldPriority = body.plugin.priority;
      body.plugin.priority = newPriority;
      Matter.Body.setMass(body, newPriority);
      const newRadius = getBubbleSize(newPriority) / 2;
      const currentRadius = getBubbleSize(oldPriority) / 2;
      Matter.Body.scale(
        body,
        newRadius / currentRadius,
        newRadius / currentRadius,
      );
    }
  };

  useEffect(() => {
    const existingIds = new Set(bodiesRef.current.keys());
    initialTasks.forEach((task) => {
      if (!existingIds.has(task.id)) {
        addBody(task);
      }
      existingIds.delete(task.id);
    });
    existingIds.forEach((id) => removeBody(id));
  }, [initialTasks, width, canvasHeight]); // Added bounds dependency so new bounds triggers sync

  // Handle Sort Toggle
  useEffect(() => {
    if (isSorted) {
      engineRef.current.gravity.y = 0;
      Array.from(bodiesRef.current.values()).forEach((body) => {
        Matter.Body.setVelocity(body, { x: 0, y: 0 });
        Matter.Body.setAngularVelocity(body, 0);
      });
    } else {
      engineRef.current.gravity.y = -0.3; // restore upward gravity
    }
  }, [isSorted]);

  const tickPhysics = (delta: number, isCurrentlySorted: boolean) => {
    if (isCurrentlySorted) return;

    const engine = engineRef.current;
    const bodies = bodiesRef.current;
    const pos = positionsRef.current;

    Matter.Engine.update(engine, delta);

    bodies.forEach((body, taskId) => {
      const priority = body.plugin.priority || 3;
      const buoyancyStrength = (6 - priority) * 0.00012;

      Matter.Body.applyForce(body, body.position, {
        x: 0,
        y: -buoyancyStrength * body.mass,
      });

      if (Math.random() < 0.015) {
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

  useFrameCallback((frame) => {
    runOnJS(tickPhysics)(frame.timeSincePreviousFrame ?? 16, isSortedSV.value);
  });

  return {
    positions,
    canvasHeight,
    removeBody,
    addBody,
    updateBodyPriority,
  };
};
