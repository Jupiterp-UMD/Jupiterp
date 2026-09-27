/**
 * This file is part of Jupiterp. For terms of use, please see the file
 * called LICENSE at the top level of the Jupiterp source tree (online at
 * https://github.com/atcupps/Jupiterp/LICENSE).
 * Copyright (C) 2026 Andrew Cupps
 *
 * @fileoverview Parity tests for name normalization.
 *
 * Every case comes from the fixture set shared with the SQL and Python
 * implementations. Adding a case here without adding it to
 * `scraper/tests/fixtures/names.json` defeats the point of the exercise.
 */

import { describe, expect, test } from '@jest/globals';
import fixtures from './__fixtures__/names.json';
import { firstLast, isDenylisted, normalizeName, slugify, surname } from './Names';

interface Case<T> {
  input: string;
  expected: T;
  why?: string;
}

function label<T>(name: string, testCase: Case<T>): string {
  return `${name}(${JSON.stringify(testCase.input)})${testCase.why ? ` - ${testCase.why}` : ''}`;
}

describe('normalizeName', () => {
  for (const testCase of fixtures.normalize as Case<string | null>[]) {
    test(label('normalizeName', testCase), () => {
      expect(normalizeName(testCase.input)).toEqual(testCase.expected);
    });
  }
});

describe('slugify', () => {
  for (const testCase of fixtures.slugify as Case<string | null>[]) {
    test(label('slugify', testCase), () => {
      expect(slugify(testCase.input)).toEqual(testCase.expected);
    });
  }

  test('is exactly normalizeName with hyphens for spaces', () => {
    // The relationship the SQL implementation is defined by. If this stops
    // holding, the two have to be kept in step by review rather than by
    // construction, which is how they drift.
    for (const testCase of fixtures.normalize as Case<string | null>[]) {
      const normalized = normalizeName(testCase.input);
      const expected = normalized === null ? null : normalized.replaceAll(' ', '-');
      expect(slugify(testCase.input)).toEqual(expected);
    }
  });
});

describe('isDenylisted', () => {
  for (const testCase of fixtures.denylisted as Case<boolean>[]) {
    test(label('isDenylisted', testCase), () => {
      expect(isDenylisted(testCase.input)).toEqual(testCase.expected);
    });
  }

  test('is not a substring test', () => {
    for (const name of ['Stafford Jones', 'Tabatha Bacon', 'Instructors Aide']) {
      expect(isDenylisted(name)).toBe(false);
    }
  });
});

describe('firstLast', () => {
  for (const testCase of fixtures.first_last as Case<string>[]) {
    test(label('firstLast', testCase), () => {
      expect(firstLast(testCase.input)).toEqual(testCase.expected);
    });
  }
});

describe('surname', () => {
  for (const testCase of fixtures.surname as Case<string>[]) {
    test(label('surname', testCase), () => {
      expect(surname(testCase.input)).toEqual(testCase.expected);
    });
  }
});

describe('the problem this exists to solve', () => {
  test('registrar and Testudo spellings reduce to the same first+last key', () => {
    // "Walsh, Shane Bolles" from the grade files and "Shane Walsh" from
    // Testudo are the same person. Anything that joins on the raw name string
    // returns zero grade rows for them, silently.
    const registrar = normalizeName('Shane Bolles Walsh');
    const testudo = normalizeName('Shane Walsh');
    expect(registrar).toEqual('shane bolles walsh');
    expect(testudo).toEqual('shane walsh');
    expect(firstLast(registrar!)).toEqual(firstLast(testudo!));
  });
});
