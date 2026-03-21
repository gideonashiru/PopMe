import { SPAWN_REGION, TaskPosition } from '@/types/task';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

export const getBubbleSize = (priority: number) => {
  const clamped = clamp(priority, 1, 5);
  return 64 + clamped * 16; // 80..144
};

export const getEnergyColors = (energy: number): [string, string] => {
  const clamped = clamp(energy, 1, 5);
  const palettes: [string, string][] = [
    ['#A7D6FF', '#D9F0FF'],
    ['#93E3D1', '#D2FAF3'],
    ['#B8E07A', '#E9F7C9'],
    ['#FFC36B', '#FFE7B5'],
    ['#FF8F7A', '#FFD3C7'],
  ];

  return palettes[clamped - 1];
};

/**
 * Returns a random position within the SPAWN_REGION of the canvas.
 * Values are absolute pixel coordinates (not normalized 0-1).
 */
export const getRandomPosition = (): TaskPosition => {
  const x = SPAWN_REGION.x + Math.random() * SPAWN_REGION.width;
  const y = SPAWN_REGION.y + Math.random() * SPAWN_REGION.height;
  return { x, y };
};
