/**
 * This file is part of Jupiterp. For terms of use, please see the file
 * called LICENSE at the top level of the Jupiterp source tree (online at
 * https://github.com/atcupps/Jupiterp/LICENSE).
 *
 *
 * @fileoverview Unit tests for Formatting.ts
 */

import { splitCourseCode, formatInstructors, testudoLink, testudoGenEdLink } from './Formatting';
import { describe, expect, test } from '@jest/globals';

describe('testudoLink', () => {
  test('searches the given term', () => {
    const link = testudoLink('CMSC131', 202701);
    expect(link).toContain('courseId=CMSC131&sectionId=&termId=202701&');
  });

  test("leaves the term to Testudo's default when it is unknown", () => {
    const link = testudoLink('CMSC131', null);
    expect(link).toContain('courseId=CMSC131&sectionId=&_openSectionsOnly=on');
    expect(link).not.toContain('termId');
  });
});

describe('testudoGenEdLink', () => {
  test('links to the Gen-Ed list for the given term', () => {
    expect(testudoGenEdLink('DSHS', 202608)).toBe('https://app.testudo.umd.edu/soc/gen-ed/202608/DSHS');
  });

  test('is null when the term is unknown, since Testudo has no termless page', () => {
    expect(testudoGenEdLink('DSHS', null)).toBeNull();
  });
});

describe('splitCourseCode', () => {
  test('splits four-letter department code from course number', () => {
    expect(splitCourseCode('CMSC424')).toBe('CMSC 424');
  });

  test('handles different department prefixes', () => {
    expect(splitCourseCode('ENGL101')).toBe('ENGL 101');
  });
});

describe('formatInstructors', () => {
  test('formats a single instructor', () => {
    expect(formatInstructors(['John Doe'])).toBe('John Doe');
  });

  test('formats multiple instructors', () => {
    expect(formatInstructors(['John Doe', 'Jane Smith'])).toBe('John Doe, Jane Smith');
  });

  test('handles no instructors', () => {
    expect(formatInstructors([])).toBe('');
  });
});
