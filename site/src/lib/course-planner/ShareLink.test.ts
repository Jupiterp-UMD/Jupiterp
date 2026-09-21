/**
 * This file is part of Jupiterp. For terms of use, please see the file
 * called LICENSE at the top level of the Jupiterp source tree (online at
 * https://github.com/atcupps/Jupiterp/LICENSE).
 *
 *
 * @fileoverview Unit tests for ShareLink.ts
 */

import { describe, expect, test } from '@jest/globals';
import type { Course } from '@jupiterp/jupiterp';
import { buildSharedSelections, decodeSchedule, encodeSchedule } from './ShareLink';
import type { ScheduleBlock, ScheduleSelection, UserEvent } from '../../types';

/** Minimal `ScheduleSelection` for encoding tests. */
function selection(courseCode: string, sectionCode: string, hover = false): ScheduleSelection {
  return {
    course: { courseCode } as ScheduleSelection['course'],
    section: { sectionCode } as ScheduleSelection['section'],
    hover,
    differences: {
      instructors: false,
      numMeetings: false,
      meetingType: false,
      meetingTime: false,
      meetingLocation: false,
    },
    colorNumber: 0,
  };
}

/** Minimal `UserEvent` for encoding tests. */
function userEvent(): UserEvent {
  return {
    id: 'e1',
    name: 'Lunch',
    days: ['M'],
    startTime: 12,
    endTime: 13,
    location: '',
    notes: '',
    colorNumber: 0,
  };
}

/** Minimal `Course` with sections for reconstruction tests. */
function course(courseCode: string, sectionCodes: string[]): Course {
  return {
    courseCode,
    name: `${courseCode} Name`,
    minCredits: 3,
    maxCredits: null,
    genEds: null,
    conditions: null,
    description: 'desc',
    sections: sectionCodes.map(
      (sectionCode) =>
        ({
          courseCode,
          sectionCode,
          instructors: ['Prof X'],
          meetings: [],
          openSeats: 0,
          totalSeats: 0,
          waitlist: 0,
          holdfile: null,
        }) as NonNullable<Course['sections']>[number]
    ),
  };
}

describe('encodeSchedule', () => {
  test('emits the current schema version prefix', () => {
    const token = encodeSchedule([selection('CMSC131', '0101')]);
    expect(token.startsWith('2~')).toBe(true);
  });

  test('returns empty string when there are no course sections', () => {
    expect(encodeSchedule([])).toBe('');
    expect(encodeSchedule([userEvent() as unknown as ScheduleBlock])).toBe('');
  });

  test('excludes hover previews and custom events', () => {
    const blocks: ScheduleBlock[] = [
      selection('CMSC131', '0101'),
      selection('ENGL101', '0301', true),
      userEvent() as unknown as ScheduleBlock,
    ];
    expect(decodeSchedule(encodeSchedule(blocks))).toEqual([{ courseCode: 'CMSC131', sectionCode: '0101' }]);
  });

  test('output uses only URL-unreserved characters', () => {
    const token = encodeSchedule([selection('CMSC351H', '9901'), selection('MATH140', '0501')]);
    expect(token).toMatch(/^[A-Za-z0-9\-._~]+$/);
  });

  test('packs standard codes shorter than the literal form', () => {
    const blocks = [
      selection('CMSC131', '0101'),
      selection('MATH140', '0501'),
      selection('ENGL101', '0301'),
      selection('HIST200', '0201'),
    ];
    const literalLength = `1~${blocks.map((b) => `${b.course.courseCode}-${b.section.sectionCode}`).join('.')}`.length;
    expect(encodeSchedule(blocks).length).toBeLessThan(literalLength);
  });
});

describe('encode/decode round-trip (v2)', () => {
  test.each([
    ['CMSC131', '0101'],
    ['MATH140', '0501'],
    ['CMSC351H', '9901'], // 1-letter suffix
    ['BMGT110', '0000'], // all-zero section
    ['PHYS161', '9999'], // max section
  ])('packs and unpacks %s-%s exactly', (courseCode, sectionCode) => {
    const token = encodeSchedule([selection(courseCode, sectionCode)]);
    expect(decodeSchedule(token)).toEqual([{ courseCode, sectionCode }]);
  });

  test('round-trips a multi-course schedule in order', () => {
    const pairs: [string, string][] = [
      ['CMSC131', '0101'],
      ['MATH140', '0501'],
      ['ENGL101', '0301'],
    ];
    const token = encodeSchedule(pairs.map(([c, s]) => selection(c, s)));
    expect(decodeSchedule(token)).toEqual(pairs.map(([c, s]) => ({ courseCode: c, sectionCode: s })));
  });

  test('falls back to a literal segment for non-standard codes and round-trips', () => {
    // 4-digit number, and a lettered section: neither is packable.
    const token = encodeSchedule([selection('AASP1000', 'FC01'), selection('CMSC131', '0101')]);
    expect(token).toContain('AASP1000-FC01');
    expect(decodeSchedule(token)).toEqual([
      { courseCode: 'AASP1000', sectionCode: 'FC01' },
      { courseCode: 'CMSC131', sectionCode: '0101' },
    ]);
  });
});

describe('decodeSchedule', () => {
  test('still decodes legacy v1 (literal) links', () => {
    expect(decodeSchedule('1~CMSC131-0101.MATH140-0501')).toEqual([
      { courseCode: 'CMSC131', sectionCode: '0101' },
      { courseCode: 'MATH140', sectionCode: '0501' },
    ]);
  });

  test('rejects an unknown schema version', () => {
    expect(decodeSchedule('9~CMSC131-0101')).toEqual([]);
  });

  test('returns empty for empty or malformed input', () => {
    expect(decodeSchedule('')).toEqual([]);
    expect(decodeSchedule('CMSC131-0101')).toEqual([]);
    expect(decodeSchedule('1~')).toEqual([]);
    expect(decodeSchedule('2~')).toEqual([]);
  });

  test('skips unparseable v1 segments but keeps valid ones', () => {
    expect(decodeSchedule('1~CMSC131-0101.garbage.MATH140-0501')).toEqual([
      { courseCode: 'CMSC131', sectionCode: '0101' },
      { courseCode: 'MATH140', sectionCode: '0501' },
    ]);
  });
});

describe('buildSharedSelections', () => {
  const courses: Record<string, Course> = {
    CMSC131: course('CMSC131', ['0101', '0201']),
    MATH140: course('MATH140', ['0501']),
  };

  test('reconstructs selections in order with sequential color numbers', () => {
    const built = buildSharedSelections(
      [
        { courseCode: 'CMSC131', sectionCode: '0101' },
        { courseCode: 'MATH140', sectionCode: '0501' },
      ],
      courses
    );
    expect(built.map((s) => s.course.courseCode)).toEqual(['CMSC131', 'MATH140']);
    expect(built.map((s) => s.section.sectionCode)).toEqual(['0101', '0501']);
    expect(built.map((s) => s.colorNumber)).toEqual([0, 1]);
    expect(built[0].hover).toBe(false);
    expect(built[0].differences.instructors).toBe(false);
  });

  test('skips pairs whose course or section no longer exists', () => {
    const built = buildSharedSelections(
      [
        { courseCode: 'CMSC131', sectionCode: '9999' }, // missing section
        { courseCode: 'BMGT110', sectionCode: '0101' }, // missing course
        { courseCode: 'MATH140', sectionCode: '0501' }, // valid
      ],
      courses
    );
    expect(built).toHaveLength(1);
    expect(built[0].course.courseCode).toBe('MATH140');
    expect(built[0].colorNumber).toBe(0);
  });
});
