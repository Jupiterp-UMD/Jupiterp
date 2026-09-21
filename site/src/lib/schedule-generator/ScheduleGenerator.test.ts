/**
 * This file is part of Jupiterp. For terms of use, please see the file
 * called LICENSE at the top level of the Jupiterp source tree (online at
 * https://github.com/atcupps/Jupiterp/LICENSE).
 *
 *
 * @fileoverview Unit tests for the schedule generator engine.
 */

import { describe, expect, test } from '@jest/globals';
import type { ClassMeeting, Course, Section } from '@jupiterp/jupiterp';
import { generate, generateFromCourses } from './ScheduleGenerator';
import { defaultConstraints } from './types';
import type { CourseRequest, HardConstraints, SectionPin } from './types';

// --- Fixture builders ------------------------------------------------------

/** Decimal-hour helper: `hours(9, 50)` is 9:50 AM. */
function hours(h: number, m = 0): number {
  return h + m / 60;
}

/** A single timed in-person meeting. */
function meeting(days: string, start: number, end: number): ClassMeeting {
  return {
    classtime: { days, start, end },
    location: { building: 'TST', room: '101' },
  };
}

function section(
  courseCode: string,
  sectionCode: string,
  meetings: ClassMeeting[],
  opts: { openSeats?: number; instructors?: string[] } = {}
): Section {
  return {
    courseCode,
    sectionCode,
    instructors: opts.instructors ?? ['Prof ' + sectionCode],
    meetings,
    openSeats: opts.openSeats ?? 30,
    totalSeats: 30,
    waitlist: 0,
    holdfile: null,
  };
}

function course(
  courseCode: string,
  sections: Section[],
  opts: { minCredits?: number; maxCredits?: number | null } = {}
): Course {
  return {
    courseCode,
    name: courseCode + ' Name',
    minCredits: opts.minCredits ?? 3,
    maxCredits: opts.maxCredits ?? null,
    genEds: null,
    conditions: null,
    description: null,
    sections,
  };
}

function req(c: Course, required: boolean, pin: SectionPin = { kind: 'none' }): CourseRequest {
  return { course: c, required, pin };
}

// --- Conflict & ordering ---------------------------------------------------

describe('conflict and ordering', () => {
  test('excludes conflicting combinations', () => {
    const aaa = course('AAA101', [section('AAA101', '0101', [meeting('MWF', 9, 10)])]);
    const bbb = course('BBB200', [
      section('BBB200', '0301', [meeting('MWF', 9, 10)]),
      section('BBB200', '0401', [meeting('MWF', 11, 12)]),
    ]);
    const result = generateFromCourses([aaa, bbb], defaultConstraints());

    expect(result.schedules).toHaveLength(1);
    const usesConflicting = result.schedules.some((sch) =>
      sch.selections.some((s) => s.course.courseCode === 'BBB200' && s.section.sectionCode === '0301')
    );
    expect(usesConflicting).toBe(false);
  });

  test('selections follow requested course order', () => {
    const zzz = course('ZZZ200', [
      section('ZZZ200', '0101', [meeting('MWF', 9, 10)]),
      section('ZZZ200', '0201', [meeting('MWF', 13, 14)]),
    ]);
    const aaa = course('AAA101', [section('AAA101', '0101', [meeting('TuTh', 9, 10)])]);
    // ZZZ has more candidates, so fail-first orders AAA first internally.
    const result = generate([req(zzz, true), req(aaa, true)], defaultConstraints());

    expect(result.schedules.length).toBeGreaterThan(0);
    for (const sch of result.schedules) {
      const codes = sch.selections.map((s) => s.course.courseCode);
      expect(codes).toEqual(['ZZZ200', 'AAA101']);
    }
  });
});

// --- Per-section filters ---------------------------------------------------

describe('per-section filters', () => {
  test('only-open-seats filters full sections', () => {
    const c = course('AAA101', [
      section('AAA101', '0101', [meeting('MWF', 9, 10)], {
        openSeats: 0,
      }),
      section('AAA101', '0201', [meeting('MWF', 13, 14)], {
        openSeats: 5,
      }),
    ]);

    const closed = generateFromCourses([c], defaultConstraints());
    expect(closed.schedules).toHaveLength(1);
    expect(closed.schedules[0].selections[0].section.sectionCode).toBe('0201');

    const open = generateFromCourses([c], {
      ...defaultConstraints(),
      onlyOpenSeats: false,
    });
    expect(open.schedules).toHaveLength(2);
  });

  test('time window filters sections', () => {
    const c = course('AAA101', [
      section('AAA101', '0101', [meeting('MWF', 8, 9)]),
      section('AAA101', '0201', [meeting('MWF', 11, 12)]),
      section('AAA101', '0301', [meeting('MWF', 16, 17)]),
    ]);
    const constraints: HardConstraints = {
      ...defaultConstraints(),
      earliestStartMinutes: 10 * 60,
      latestEndMinutes: 15 * 60,
    };
    const result = generateFromCourses([c], constraints);
    expect(result.schedules).toHaveLength(1);
    expect(result.schedules[0].selections[0].section.sectionCode).toBe('0201');
  });

  test('days off filter sections', () => {
    const c = course('AAA101', [
      section('AAA101', '0101', [meeting('MWF', 9, 10)]),
      section('AAA101', '0201', [meeting('TuTh', 9, 10)]),
    ]);
    const result = generateFromCourses([c], {
      ...defaultConstraints(),
      daysOff: new Set(['F']),
    });
    expect(result.schedules).toHaveLength(1);
    expect(result.schedules[0].selections[0].section.sectionCode).toBe('0201');
  });

  test('min gap treats back-to-back as conflict', () => {
    const a = course('AAA101', [section('AAA101', '0101', [meeting('MWF', 9, 10)])]);
    const b = course('BBB200', [section('BBB200', '0101', [meeting('MWF', 10, 11)])]);

    const noGap = generateFromCourses([a, b], defaultConstraints());
    expect(noGap.schedules).toHaveLength(1);

    const withGap = generateFromCourses([a, b], {
      ...defaultConstraints(),
      minGapMinutes: 30,
    });
    expect(withGap.schedules).toHaveLength(0);
  });

  test('async sections always fit', () => {
    const timed = course('AAA101', [section('AAA101', '0101', [meeting('MWF', 9, 10)])]);
    const async = course('BBB200', [section('BBB200', '0101', ['OnlineAsync'])]);
    const result = generateFromCourses([timed, async], defaultConstraints());
    expect(result.schedules).toHaveLength(1);
    expect(result.schedules[0].selections).toHaveLength(2);
  });
});

// --- Bounds ----------------------------------------------------------------

describe('bounds', () => {
  test('truncates at max results', () => {
    const c = course('AAA101', [
      section('AAA101', '0101', [meeting('M', 9, 10)]),
      section('AAA101', '0201', [meeting('M', 11, 12)]),
      section('AAA101', '0301', [meeting('M', 13, 14)]),
      section('AAA101', '0401', [meeting('M', 15, 16)]),
      section('AAA101', '0501', [meeting('M', 17, 18)]),
    ]);
    const result = generateFromCourses([c], defaultConstraints(), new Map(), 3);
    expect(result.schedules).toHaveLength(3);
    expect(result.truncated).toBe(true);
  });

  test('honors a custom max-nodes budget', () => {
    const c = course('AAA101', [
      section('AAA101', '0101', [meeting('M', 9, 10)]),
      section('AAA101', '0201', [meeting('M', 11, 12)]),
      section('AAA101', '0301', [meeting('M', 13, 14)]),
    ]);
    // maxNodes = 1: the second explored candidate trips the budget.
    const result = generate([req(c, true)], defaultConstraints(), new Map(), 1000, 1);
    expect(result.truncated).toBe(true);
    expect(result.schedules.length).toBeLessThan(3);
  });
});

// --- Optional courses ------------------------------------------------------

describe('optional courses', () => {
  test('optional course is dropped when it conflicts', () => {
    const a = course('AAA101', [section('AAA101', '0101', [meeting('MWF', 9, 10)])]);
    const b = course('BBB200', [section('BBB200', '0101', [meeting('MWF', 9, 10)])]);
    const result = generate([req(a, true), req(b, false)], defaultConstraints());
    expect(result.schedules).toHaveLength(1);
    expect(result.schedules[0].selections).toHaveLength(1);
    expect(result.schedules[0].selections[0].course.courseCode).toBe('AAA101');
  });

  test('optional courses generate every subset', () => {
    const a = course('AAA101', [section('AAA101', '0101', [meeting('M', 9, 10)])]);
    const b = course('BBB200', [section('BBB200', '0101', [meeting('M', 11, 12)])]);
    const c = course('CCC300', [section('CCC300', '0101', [meeting('M', 13, 14)])]);
    const result = generate([req(a, true), req(b, false), req(c, false)], defaultConstraints());
    const sizes = result.schedules.map((s) => s.selections.length).sort();
    expect(sizes).toEqual([1, 2, 2, 3]);
  });

  test('required course with no sections blocks; optional does not', () => {
    const valid = course('AAA101', [section('AAA101', '0101', [meeting('MWF', 9, 10)])]);
    const empty = course('BBB200', []);

    const blocked = generate([req(valid, true), req(empty, true)], defaultConstraints());
    expect(blocked.schedules).toHaveLength(0);
    expect(blocked.coursesWithNoValidSections).toContain('BBB200');

    const dropped = generate([req(valid, true), req(empty, false)], defaultConstraints());
    expect(dropped.schedules).toHaveLength(1);
    expect(dropped.coursesWithNoValidSections).toHaveLength(0);
  });
});

// --- Pins ------------------------------------------------------------------

describe('pins', () => {
  test('pin by section restricts to that section', () => {
    const c = course('AAA101', [
      section('AAA101', '0101', [meeting('MWF', 9, 10)]),
      section('AAA101', '0201', [meeting('MWF', 13, 14)]),
    ]);
    const result = generate([req(c, true, { kind: 'bySection', sectionCode: '0201' })], defaultConstraints());
    expect(result.schedules).toHaveLength(1);
    expect(result.schedules[0].selections[0].section.sectionCode).toBe('0201');
  });

  test('pin by instructor keeps only that professor', () => {
    const c = course('AAA101', [
      section('AAA101', '0101', [meeting('MWF', 9, 10)], {
        instructors: ['Dr. A'],
      }),
      section('AAA101', '0201', [meeting('MWF', 13, 14)], {
        instructors: ['Dr. B'],
      }),
    ]);
    const result = generate([req(c, true, { kind: 'byInstructor', name: 'Dr. B' })], defaultConstraints());
    expect(result.schedules).toHaveLength(1);
    expect(result.schedules[0].selections[0].section.sectionCode).toBe('0201');
  });

  test('pin wins over filter and reports the override', () => {
    const c = course('AAA101', [section('AAA101', '0101', [meeting('MWF', 9, 10)])]);
    const result = generate([req(c, true, { kind: 'bySection', sectionCode: '0101' })], {
      ...defaultConstraints(),
      earliestStartMinutes: 10 * 60,
    });
    expect(result.schedules).toHaveLength(1);
    expect(result.pinNotices).toHaveLength(1);
    expect(result.pinNotices[0].overriddenFilters).toContain('earliestStart');
  });
});

// --- Credits ---------------------------------------------------------------

describe('credits', () => {
  test('min credits excludes too-light schedules', () => {
    const a = course('AAA101', [section('AAA101', '0101', [meeting('M', 9, 10)])], {
      minCredits: 3,
    });
    const b = course('BBB200', [section('BBB200', '0101', [meeting('M', 11, 12)])], {
      minCredits: 3,
    });
    const result = generate([req(a, true), req(b, false)], {
      ...defaultConstraints(),
      minCredits: 6,
    });
    expect(result.schedules).toHaveLength(1);
    expect(result.schedules[0].selections).toHaveLength(2);
  });
});

// --- Metrics ---------------------------------------------------------------

describe('metrics', () => {
  test('computes metrics', () => {
    const a = course('AAA101', [section('AAA101', '0101', [meeting('MWF', 9, 10)])], {
      minCredits: 3,
    });
    const b = course('BBB200', [section('BBB200', '0101', [meeting('MWF', 11, 12)])], {
      minCredits: 4,
    });
    const ratings = new Map([['Prof 0101', 4]]);
    const result = generateFromCourses([a, b], defaultConstraints(), ratings);
    const m = result.schedules[0].metrics;

    expect(m.sectionCount).toBe(2);
    expect(m.minCredits).toBe(7);
    expect(m.daysWithClasses).toBe(3);
    expect(m.earliestStartMinutes).toBe(540);
    expect(m.latestEndMinutes).toBe(720);
    expect(m.avgInstructorRating).toBe(4);
    expect(m.ratedSectionCount).toBe(2);
  });

  test('gap counts breaks within and across courses', () => {
    const a = course('AAA101', [section('AAA101', '0101', [meeting('MWF', 9, 10)])]);
    const b = course('BBB200', [section('BBB200', '0101', [meeting('MWF', 11, 12)])]);
    const result = generateFromCourses([a, b], defaultConstraints());
    // 60-minute gap on each of M, W, F.
    expect(result.schedules[0].metrics.totalGapMinutes).toBe(180);
  });

  test('counts short passing periods', () => {
    const a = course('AAA101', [section('AAA101', '0101', [meeting('MWF', hours(9), hours(9, 50))])]);
    const b = course('BBB200', [section('BBB200', '0101', [meeting('MWF', hours(10), hours(10, 50))])]);
    const result = generateFromCourses([a, b], defaultConstraints());
    // 10-minute passing period on each of M, W, F.
    expect(result.schedules[0].metrics.totalGapMinutes).toBe(30);
  });

  test('single meeting day has no gap', () => {
    const a = course('AAA101', [section('AAA101', '0101', [meeting('M', 9, 10)])]);
    const result = generateFromCourses([a], defaultConstraints());
    expect(result.schedules[0].metrics.totalGapMinutes).toBe(0);
  });

  test('untimed schedule has null time metrics', () => {
    const async = course('AAA101', [section('AAA101', '0101', ['OnlineAsync'])]);
    const result = generateFromCourses([async], defaultConstraints());
    const m = result.schedules[0].metrics;
    expect(m.earliestStartMinutes).toBeNull();
    expect(m.latestEndMinutes).toBeNull();
    expect(m.daysWithClasses).toBe(0);
    expect(m.totalGapMinutes).toBe(0);
  });
});
