/**
 * This file is part of Jupiterp. For terms of use, please see the file
 * called LICENSE at the top level of the Jupiterp source tree (online at
 * https://github.com/atcupps/Jupiterp/LICENSE).
 *
 *
 * @fileoverview Unit tests for WishlistActions.ts
 */

import type { Course } from '@jupiterp/jupiterp';
import { addRequirement, chosenCourseCodes, removeRequirement } from './WishlistActions';
import { describe, expect, test } from '@jest/globals';

/** Builds a minimal Course with the given code; other fields are unused here. */
function course(courseCode: string): Course {
  return {
    courseCode,
    name: `${courseCode} Course`,
    minCredits: 3,
    maxCredits: null,
    genEds: null,
    conditions: null,
    description: null,
    sections: null,
  };
}

describe('addRequirement', () => {
  test('appends a new course as a required, unpinned requirement', () => {
    const result = addRequirement([], course('CMSC131'));
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      course: course('CMSC131'),
      required: true,
      pin: { kind: 'none' },
    });
  });

  test('preserves existing requirements and appends at the end', () => {
    const start = addRequirement([], course('CMSC131'));
    const result = addRequirement(start, course('MATH140'));
    expect(result.map((r) => r.course.courseCode)).toEqual(['CMSC131', 'MATH140']);
  });

  test('is a no-op when the course is already present', () => {
    const start = addRequirement([], course('CMSC131'));
    const result = addRequirement(start, course('CMSC131'));
    expect(result).toBe(start);
    expect(result).toHaveLength(1);
  });

  test('does not mutate the input array', () => {
    const start = addRequirement([], course('CMSC131'));
    addRequirement(start, course('MATH140'));
    expect(start).toHaveLength(1);
  });
});

describe('removeRequirement', () => {
  test('removes the requirement matching the course code', () => {
    const start = addRequirement(addRequirement([], course('CMSC131')), course('MATH140'));
    const result = removeRequirement(start, 'CMSC131');
    expect(result.map((r) => r.course.courseCode)).toEqual(['MATH140']);
  });

  test('leaves the wishlist unchanged when the code is absent', () => {
    const start = addRequirement([], course('CMSC131'));
    const result = removeRequirement(start, 'ENGL101');
    expect(result.map((r) => r.course.courseCode)).toEqual(['CMSC131']);
  });

  test('does not mutate the input array', () => {
    const start = addRequirement([], course('CMSC131'));
    removeRequirement(start, 'CMSC131');
    expect(start).toHaveLength(1);
  });
});

describe('chosenCourseCodes', () => {
  test('returns the set of course codes in the wishlist', () => {
    const reqs = addRequirement(addRequirement([], course('CMSC131')), course('MATH140'));
    expect(chosenCourseCodes(reqs)).toEqual(new Set(['CMSC131', 'MATH140']));
  });

  test('returns an empty set for an empty wishlist', () => {
    expect(chosenCourseCodes([]).size).toBe(0);
  });
});
