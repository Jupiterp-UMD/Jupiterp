/**
 * This file is part of Jupiterp. For terms of use, please see the file
 * called LICENSE at the top level of the Jupiterp source tree (online at
 * https://github.com/atcupps/Jupiterp/LICENSE).
 *
 *
 * @fileoverview Unit tests for CourseSuggestions.ts
 */

import { applyProfessorSelection, getProfPartial } from './CourseSuggestions';
import { describe, expect, test } from '@jest/globals';

describe('getProfPartial', () => {
  test('returns null when there is no @ token', () => {
    expect(getProfPartial('MATH140')).toBeNull();
  });

  test('returns null for a bare @ with no following characters', () => {
    expect(getProfPartial('@')).toBeNull();
  });

  test('extracts a single-word partial', () => {
    expect(getProfPartial('@smith')).toBe('smith');
  });

  test('extracts a partial that follows a course query', () => {
    expect(getProfPartial('CMSC131 @joh')).toBe('joh');
  });

  test('stops the partial at the first whitespace', () => {
    expect(getProfPartial('@john doe')).toBe('john');
  });

  test('ignores an already-resolved quoted token', () => {
    expect(getProfPartial('@"Jane Smith"')).toBeNull();
  });

  test('ignores a resolved quoted token but still finds a later partial', () => {
    expect(getProfPartial('@"Jane Smith" @ad')).toBe('ad');
  });
});

describe('applyProfessorSelection', () => {
  test('wraps a multi-word name in quotes', () => {
    expect(applyProfessorSelection('@jane', 'Jane Smith')).toBe('@"Jane Smith"');
  });

  test('leaves a single-word name unquoted', () => {
    expect(applyProfessorSelection('@sm', 'Smith')).toBe('@Smith');
  });

  test('replaces only the partial token, preserving the course query', () => {
    expect(applyProfessorSelection('CMSC131 @jo', 'John Doe')).toBe('CMSC131 @"John Doe"');
  });

  test('returns the input unchanged when there is no partial token', () => {
    expect(applyProfessorSelection('MATH140', 'Jane Smith')).toBe('MATH140');
  });

  test('does not disturb an existing resolved token', () => {
    expect(applyProfessorSelection('@"Jane Smith" @ad', 'Alice Adams')).toBe('@"Jane Smith" @"Alice Adams"');
  });
});
