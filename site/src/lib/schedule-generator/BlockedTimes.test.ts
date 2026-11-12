/**
 * This file is part of Jupiterp. For terms of use, please see the file
 * called LICENSE at the top level of the Jupiterp source tree (online at
 * https://github.com/atcupps/Jupiterp/LICENSE).
 *
 *
 * @fileoverview Unit tests for the blocked times grid helpers.
 */

import { describe, expect, test } from '@jest/globals';
import { blocksToKeys, cellKey, keysToBlocks, rectangleKeys } from './BlockedTimes';
import type { BlockedTime } from './types';

describe('blocksToKeys', () => {
  test('expands a block into one key per half hour', () => {
    const keys = blocksToKeys([{ day: 'M', start: 9 * 60, end: 10 * 60 }]);
    expect([...keys]).toEqual([cellKey('M', 540), cellKey('M', 570)]);
  });

  test('no blocks gives no keys', () => {
    expect(blocksToKeys([]).size).toBe(0);
  });
});

describe('keysToBlocks', () => {
  test('round trips blocks', () => {
    const blocks: BlockedTime[] = [
      { day: 'M', start: 9 * 60, end: 11 * 60 },
      { day: 'M', start: 14 * 60, end: 14 * 60 + 30 },
      { day: 'Th', start: 7 * 60, end: 8 * 60 },
    ];
    expect(keysToBlocks(blocksToKeys(blocks))).toEqual(blocks);
  });

  test('merges adjacent cells into one block', () => {
    const keys = new Set([cellKey('W', 600), cellKey('W', 630), cellKey('W', 660)]);
    expect(keysToBlocks(keys)).toEqual([{ day: 'W', start: 600, end: 690 }]);
  });

  test('keeps cells with a gap as separate blocks', () => {
    const keys = new Set([cellKey('W', 600), cellKey('W', 660)]);
    expect(keysToBlocks(keys)).toEqual([
      { day: 'W', start: 600, end: 630 },
      { day: 'W', start: 660, end: 690 },
    ]);
  });

  test('does not merge across days', () => {
    const keys = new Set([cellKey('M', 21 * 60 + 30), cellKey('Tu', 7 * 60)]);
    expect(keysToBlocks(keys)).toHaveLength(2);
  });

  test('empty input gives no blocks', () => {
    expect(keysToBlocks(new Set())).toEqual([]);
  });

  test('covers the first and last cells of the grid', () => {
    const keys = new Set([cellKey('F', 7 * 60), cellKey('F', 21 * 60 + 30)]);
    expect(keysToBlocks(keys)).toEqual([
      { day: 'F', start: 7 * 60, end: 7 * 60 + 30 },
      { day: 'F', start: 21 * 60 + 30, end: 22 * 60 },
    ]);
  });

  test('drops cells outside the grid', () => {
    const keys = new Set([cellKey('Sa', 600), cellKey('M', 6 * 60)]);
    expect(keysToBlocks(keys)).toEqual([]);
  });
});

describe('rectangleKeys', () => {
  test('a single cell gives one key', () => {
    expect(rectangleKeys('M', 600, 'M', 600)).toEqual([cellKey('M', 600)]);
  });

  test('covers every cell in the rectangle', () => {
    const keys = rectangleKeys('M', 600, 'W', 630);
    expect(keys).toHaveLength(6);
    expect(keys).toContain(cellKey('Tu', 630));
  });

  test('is the same when dragged in any direction', () => {
    const forward = rectangleKeys('M', 600, 'Th', 720);
    const backward = rectangleKeys('Th', 720, 'M', 600);
    const diagonal = rectangleKeys('M', 720, 'Th', 600);
    expect([...backward].sort()).toEqual([...forward].sort());
    expect([...diagonal].sort()).toEqual([...forward].sort());
  });
});
