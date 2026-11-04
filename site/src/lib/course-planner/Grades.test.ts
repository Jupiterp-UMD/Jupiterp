/**
 * This file is part of Jupiterp. For terms of use, please see the file
 * called LICENSE at the top level of the Jupiterp source tree (online at
 * https://github.com/atcupps/Jupiterp/LICENSE).
 *
 *
 * @fileoverview Unit tests for the GPA and percentage helpers in Grades.ts
 */

import { bucketPercent, formatPercent, gpaOf, toDistribution } from './Grades';
import { describe, expect, test } from '@jest/globals';
import type { GradeSummary } from '../api/types';

describe('formatPercent', () => {
  test('shows one decimal place by default', () => {
    expect(formatPercent(535, 1000)).toBe('53.5');
    expect(formatPercent(535, 1000, 0)).toBe('54');
  });

  test('marks a nonzero share too small for the precision instead of showing zero', () => {
    expect(formatPercent(1, 5000)).toBe('<0.1');
    expect(formatPercent(1, 500, 0)).toBe('<1');
  });

  test('shows a true zero as zero, including an empty total', () => {
    expect(formatPercent(0, 500)).toBe('0.0');
    expect(formatPercent(0, 0, 0)).toBe('0');
  });
});

describe('bucketPercent', () => {
  test('stays a whole number with <1 for slivers', () => {
    const distribution = toDistribution({ a: 625, b: 374, f: 1, graded: 1000, gpa: 3.2 } as GradeSummary);
    expect(bucketPercent(distribution, 'A')).toBe('63');
    expect(bucketPercent(distribution, 'F')).toBe('<1');
    expect(bucketPercent(distribution, 'C')).toBe('0');
    expect(bucketPercent(toDistribution({ graded: 0, gpa: null } as GradeSummary), 'A')).toBe('0');
  });
});

describe('gpaOf', () => {
  test('returns a GPA only when enough students are behind it', () => {
    expect(gpaOf(toDistribution({ graded: 30, gpa: 3.1 } as GradeSummary))).toBe(3.1);
    expect(gpaOf(toDistribution({ graded: 10, gpa: 3.9 } as GradeSummary))).toBeNull();
    expect(gpaOf(null)).toBeNull();
    expect(gpaOf(undefined)).toBeNull();
  });
});
