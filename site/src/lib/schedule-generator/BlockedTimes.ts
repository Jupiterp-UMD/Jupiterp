/**
 * This file is part of Jupiterp. For terms of use, please see the file
 * called LICENSE at the top level of the Jupiterp source tree (online at
 * https://github.com/atcupps/Jupiterp/LICENSE).
 *
 */

import type { BlockedTime, EngineDay } from './types';

export const STEP = 30;
export const GRID_DAYS: EngineDay[] = ['M', 'Tu', 'W', 'Th', 'F'];

export const GRID_STARTS: number[] = [];
for (let m = 7 * 60; m < 22 * 60; m += STEP) {
  GRID_STARTS.push(m);
}

export function cellKey(day: EngineDay, start: number): string {
  return `${day}:${start}`;
}

export function blocksToKeys(blocks: BlockedTime[]): Set<string> {
  const keys = new Set<string>();
  for (const block of blocks) {
    for (let m = block.start; m < block.end; m += STEP) {
      keys.add(cellKey(block.day, m));
    }
  }
  return keys;
}

export function keysToBlocks(keys: Set<string>): BlockedTime[] {
  const blocks: BlockedTime[] = [];
  for (const day of GRID_DAYS) {
    let current: BlockedTime | null = null;
    for (const start of GRID_STARTS) {
      if (!keys.has(cellKey(day, start))) {
        current = null;
      } else if (current) {
        current.end = start + STEP;
      } else {
        current = { day, start, end: start + STEP };
        blocks.push(current);
      }
    }
  }
  return blocks;
}

export function rectangleKeys(fromDay: EngineDay, fromStart: number, toDay: EngineDay, toStart: number): string[] {
  const a = GRID_DAYS.indexOf(fromDay);
  const b = GRID_DAYS.indexOf(toDay);
  const keys: string[] = [];
  for (let d = Math.min(a, b); d <= Math.max(a, b); d++) {
    for (let m = Math.min(fromStart, toStart); m <= Math.max(fromStart, toStart); m += STEP) {
      keys.push(cellKey(GRID_DAYS[d], m));
    }
  }
  return keys;
}
