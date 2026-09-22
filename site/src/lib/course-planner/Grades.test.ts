/**
 * This file is part of Jupiterp. For terms of use, please see the file
 * called LICENSE at the top level of the Jupiterp source tree (online at
 * https://github.com/atcupps/Jupiterp/LICENSE).
 *
 *
 * @fileoverview Unit tests for Grades.ts
 */

import { formatSemester } from './Grades';
import { describe, expect, test } from '@jest/globals';

describe('formatSemester', () => {
  test('names Fall, Spring and Summer for the year in their code', () => {
    expect(formatSemester(202608)).toBe('Fall 2026');
    expect(formatSemester(202701)).toBe('Spring 2027');
    expect(formatSemester('202605')).toBe('Summer 2026');
  });

  test('names Winter for the January after its code', () => {
    expect(formatSemester(202612)).toBe('Winter 2027');
  });

  test('returns malformed codes unchanged', () => {
    expect(formatSemester('2026')).toBe('2026');
    expect(formatSemester(202603)).toBe('202603');
  });
});
