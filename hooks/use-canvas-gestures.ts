// import React, { useRef } from 'react';
// import { useEffect, useMemo } from 'react';
// import { useWindowDimensions } from 'react-native';
// import { Gesture, GestureType } from 'react-native-gesture-handler';
// import {
//   SharedValue,
//   useSharedValue,
//   withSpring,
// } from 'react-native-reanimated';
// 
// import { CANVAS_SIZE } from '@/types/task';
// 
// 
// const MAX_SCALE = 3.0;
// /** Absolute floor so the canvas never scales to nothing. */
// const ABSOLUTE_MIN_SCALE = 0.15;
// 
// /**
//  * Clamp helper that runs on the UI thread (plain arithmetic, no imports).
//  */
// const clampWorklet = (value: number, min: number, max: number): number => {
//   'worklet';
//   return Math.max(min, Math.min(value, max));
// };
// 
// export type TaskPositionInput = { x: number; y: number };
// 
// export type CanvasGestures = {
//   /** Composed simultaneous pan + pinch gesture. */
//   composedGesture: ReturnType<typeof Gesture.Simultaneous>;
//   /** Current horizontal offset (px, UI thread). */
//   translateX: SharedValue<number>;
//   /** Current vertical offset (px, UI thread). */
//   translateY: SharedValue<number>;
//   /** Current zoom level (UI thread). */
//   scale: SharedValue<number>;
//   /** Animate camera back to center of SPAWN_REGION at scale = 1. */
//   resetCamera: () => void;
//   /** Ref to the pan gesture (for simultaneousWithExternalGesture). */
//   panRef: React.MutableRefObject<GestureType>;
//   /** Ref to the pinch gesture (for simultaneousWithExternalGesture). */
//   pinchRef: React.MutableRefObject<GestureType>;
// };
// 
// /**
//  * Compute a dynamic minimum scale that ensures all tasks fit on screen.
//  *
//  * @param tasks  - array of task positions (absolute canvas coords)
//  * @param screenW - screen width
//  * @param screenH - screen height
//  * @param padding - extra padding around the bounding box (px)
//  */
// const computeMinScale = (
//   tasks: TaskPositionInput[],
//   screenW: number,
//   screenH: number,
//   padding = 80,
// ): number => {
//   if (tasks.length === 0) return ABSOLUTE_MIN_SCALE;
// 
//   let minX = Infinity;
//   let minY = Infinity;
//   let maxX = -Infinity;
//   let maxY = -Infinity;
// 
//   for (const t of tasks) {
//     if (t.x < minX) minX = t.x;
//     if (t.y < minY) minY = t.y;
//     if (t.x > maxX) maxX = t.x;
//     if (t.y > maxY) maxY = t.y;
//   }
// 
//   const bboxW = maxX - minX + padding * 2;
//   const bboxH = maxY - minY + padding * 2;
// 
//   if (bboxW <= 0 || bboxH <= 0) return ABSOLUTE_MIN_SCALE;
// 
//   const scaleX = screenW / bboxW;
//   const scaleY = screenH / bboxH;
//   const fitScale = Math.min(scaleX, scaleY);
// 
//   return Math.max(ABSOLUTE_MIN_SCALE, fitScale);
// };
// 
// /**
//  * Creates simultaneous pan + pinch gestures for the infinite canvas.
//  *
//  * The camera starts centered on the SPAWN_REGION so the user sees
//  * their tasks immediately on launch.
//  *
//  * ### Bug fix: isolated saved state per gesture
//  * Pan and pinch each have their own saved translation values so that
//  * when both gestures run simultaneously, one gesture's `onStart` does
//  * not overwrite values the other gesture is actively using.
//  *
//  * ### Bug fix: world-coordinate focal-point zoom
//  * The pinch handler converts the focal point to world coordinates at
//  * gesture start, then keeps that world point under the finger as scale
//  * changes.  This is more numerically stable than the ratio-based
//  * approach during continuous gestures.
//  *
//  * @param tasks - current task positions used to compute dynamic min zoom
//  */
// export const useCanvasGestures = (
//   tasks: TaskPositionInput[],
// ): CanvasGestures => {
//   const { width: screenW, height: screenH } = useWindowDimensions();
// 
//   // Initial camera: center the SPAWN_REGION on screen.
//   const initialTx = -(CANVAS_SIZE / 2) + screenW / 2;
//   const initialTy = -(CANVAS_SIZE / 2) + screenH / 2;
// 
//   const translateX = useSharedValue(initialTx);
//   const translateY = useSharedValue(initialTy);
//   const scale = useSharedValue(1);
// 
//   // --- Dynamic min scale ---
//   const dynamicMinScale = useMemo(
//     () => computeMinScale(tasks, screenW, screenH),
//     [tasks, screenW, screenH],
//   );
//   const minScaleSV = useSharedValue(dynamicMinScale);
//   // Sync to the UI thread outside of render to avoid the Reanimated warning
//   useEffect(() => {
//     minScaleSV.value = dynamicMinScale;
//   }, [dynamicMinScale, minScaleSV]);
// 
//   // --- Pan: isolated saved state ---
//   const panSavedTx = useSharedValue(initialTx);
//   const panSavedTy = useSharedValue(initialTy);
// 
//   // --- Pinch: isolated saved state ---
//   const pinchSavedTx = useSharedValue(initialTx);
//   const pinchSavedTy = useSharedValue(initialTy);
//   const pinchSavedScale = useSharedValue(1);
//   const pinchInitialFocalX = useSharedValue(0);
//   const pinchInitialFocalY = useSharedValue(0);
// 
//   // --- Stable gesture refs (persist across re-renders) ---
//   const panRef = useRef<GestureType>(null!);
//   const pinchRef = useRef<GestureType>(null!);
// 
//   // Build the pan gesture and store in ref (only on first render)
//   if (panRef.current === null) {
//     panRef.current = Gesture.Pan()
//       .minPointers(1)
//       .maxPointers(1) // Prevents fighting with pinch
//       .onStart(() => {
//         'worklet';
//         panSavedTx.value = translateX.value;
//         panSavedTy.value = translateY.value;
//       })
//       .onUpdate((e) => {
//         'worklet';
//         translateX.value = panSavedTx.value + e.translationX;
//         translateY.value = panSavedTy.value + e.translationY;
//       });
//   }
// 
//   // Build the pinch gesture and store in ref (only on first render)
//   if (pinchRef.current === null) {
//     pinchRef.current = Gesture.Pinch()
//       .onStart((e) => {
//         'worklet';
//         pinchSavedScale.value = scale.value;
//         pinchSavedTx.value = translateX.value;
//         pinchSavedTy.value = translateY.value;
//         pinchInitialFocalX.value = e.focalX;
//         pinchInitialFocalY.value = e.focalY;
//       })
//       .onUpdate((e) => {
//         'worklet';
//         const newScale = clampWorklet(
//           pinchSavedScale.value * e.scale,
//           minScaleSV.value,
//           MAX_SCALE,
//         );
// 
//         // World coordinate under the focal point AT GESTURE START
//         const worldX = (pinchInitialFocalX.value - pinchSavedTx.value) / pinchSavedScale.value;
//         const worldY = (pinchInitialFocalY.value - pinchSavedTy.value) / pinchSavedScale.value;
// 
//         // Keep that world point under the TARGET focal point at the new scale
//         scale.value = newScale;
//         translateX.value = e.focalX - worldX * newScale;
//         translateY.value = e.focalY - worldY * newScale;
//       });
//   }
// 
//   const composedGesture = useMemo(
//     () => Gesture.Simultaneous(panRef.current, pinchRef.current),
//     // Refs are stable — this only runs once
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//     [],
//   );
// 
//   const resetCamera = () => {
//     const targetTx = -(CANVAS_SIZE / 2) + screenW / 2;
//     const targetTy = -(CANVAS_SIZE / 2) + screenH / 2;
//     translateX.value = withSpring(targetTx, { damping: 20, stiffness: 90 });
//     translateY.value = withSpring(targetTy, { damping: 20, stiffness: 90 });
//     scale.value = withSpring(1, { damping: 20, stiffness: 90 });
//   };
// 
//   return { composedGesture, translateX, translateY, scale, resetCamera, panRef, pinchRef };
// };
// 