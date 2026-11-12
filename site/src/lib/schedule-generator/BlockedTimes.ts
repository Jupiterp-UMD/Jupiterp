/**
 * This file is part of Jupiterp. For terms of use, please see the file
 * called LICENSE at the top level of the Jupiterp source tree (online at
 * https://github.com/atcupps/Jupiterp/LICENSE).
 *
 *
 * @fileoverview Helpers for the blocked times grid in the generator's
 * constraints panel. The grid works in cells (a day plus a 30 minute row),
 * while the generator works in `BlockedTime` ranges, so these functions
 * convert between the two and compute the cells covered by a drag.
 */

import type { BlockedTime, EngineDay } from './types';

/** Minutes covered by one row of the grid. */
export const STEP = 30;

/** The days shown as columns in the grid, in display order. */
export const GRID_DAYS: EngineDay[] = ['M', 'Tu', 'W', 'Th', 'F'];

/** Start time in minutes of every row in the grid, from 7 AM to 10 PM. */
export const GRID_STARTS: number[] = [];
for (let minutes = 7 * 60; minutes < 22 * 60; minutes += STEP) {
  GRID_STARTS.push(minutes);
}

/** A string identifying one cell, used to keep cells in a `Set`. */
export function cellKey(day: EngineDay, start: number): string {
  return `${day}:${start}`;
}

/** Expands blocked time ranges into the keys of every cell they cover. */
export function blocksToKeys(blocks: BlockedTime[]): Set<string> {
  const keys = new Set<string>();
  for (const block of blocks) {
    for (let minutes = block.start; minutes < block.end; minutes += STEP) {
      keys.add(cellKey(block.day, minutes));
    }
  }
  return keys;
}

/**
 * Merges cells back into ranges, joining cells that touch on the same day.
 * Cells outside the grid are dropped.
 */
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

/**
 * Keys of every cell in the rectangle between two corner cells. The corners
 * can be given in any order, so a drag works in any direction.
 */
export function rectangleKeys(fromDay: EngineDay, fromStart: number, toDay: EngineDay, toStart: number): string[] {
  const fromDayIndex = GRID_DAYS.indexOf(fromDay);
  const toDayIndex = GRID_DAYS.indexOf(toDay);
  const keys: string[] = [];
  for (let dayIndex = Math.min(fromDayIndex, toDayIndex); dayIndex <= Math.max(fromDayIndex, toDayIndex); dayIndex++) {
    for (let minutes = Math.min(fromStart, toStart); minutes <= Math.max(fromStart, toStart); minutes += STEP) {
      keys.push(cellKey(GRID_DAYS[dayIndex], minutes));
    }
  }
  return keys;
}
