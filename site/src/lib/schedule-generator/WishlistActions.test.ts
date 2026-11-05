/**
 * This file is part of Jupiterp. For terms of use, please see the file
 * called LICENSE at the top level of the Jupiterp source tree (online at
 * https://github.com/atcupps/Jupiterp/LICENSE).
 *
 *
 * @fileoverview Unit tests for WishlistActions.ts
 */

import type { Course, Section } from '@jupiterp/jupiterp';
import {
  addRequirement,
  chosenCourseCodes,
  hydrateRequirements,
  plannerCourses,
  removeRequirement,
  syncRequirements,
} from './WishlistActions';
import { describe, expect, test } from '@jest/globals';
import type { GeneratorRequirement } from '../../stores/GeneratorStores';
import type { ScheduleSelection, UserEvent } from '../../types';

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

/** Builds a section of `courseCode` with the given section code. */
function section(courseCode: string, sectionCode: string): Section {
  return {
    courseCode,
    sectionCode,
    instructors: ['Prof ' + sectionCode],
    meetings: [],
    openSeats: 30,
    totalSeats: 30,
    waitlist: 0,
    holdfile: null,
  };
}

/** Builds a planner selection of one section, as stored in local storage. */
function selection(courseCode: string, sectionCode: string, hover: boolean = false): ScheduleSelection {
  return {
    course: {
      courseCode,
      name: `${courseCode} Course`,
      minCredits: 3,
      maxCredits: null,
      genEds: null,
      conditions: null,
      description: null,
    },
    section: section(courseCode, sectionCode),
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

/** Builds a required, unpinned requirement for `courseCode`. */
function requirement(courseCode: string): GeneratorRequirement {
  return { course: course(courseCode), required: true, pin: { kind: 'none' } };
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

describe('plannerCourses', () => {
  test('converts a selection into a course holding that section', () => {
    expect(plannerCourses([selection('CMSC131', '0101')])).toEqual([
      {
        courseCode: 'CMSC131',
        name: 'CMSC131 Course',
        minCredits: 3,
        maxCredits: null,
        genEds: null,
        conditions: null,
        description: null,
        sections: [section('CMSC131', '0101')],
      },
    ]);
  });

  test('ignores custom events', () => {
    const shift: UserEvent = {
      id: 'event-1',
      name: 'Work shift',
      days: ['M'],
      startTime: 9,
      endTime: 12,
      location: '',
      notes: '',
      colorNumber: 0,
    };
    const result = plannerCourses([shift, selection('MATH140', '0101')]);
    expect(result.map((c) => c.courseCode)).toEqual(['MATH140']);
  });

  test('ignores hover previews', () => {
    expect(plannerCourses([selection('CMSC131', '0101', true)])).toEqual([]);
  });

  test('merges two sections of one course into a single entry', () => {
    const result = plannerCourses([
      selection('CMSC131', '0101'),
      selection('MATH140', '0201'),
      selection('CMSC131', '0102'),
    ]);
    expect(result.map((c) => c.courseCode)).toEqual(['CMSC131', 'MATH140']);
    expect(result[0].sections?.map((s) => s.sectionCode)).toEqual(['0101', '0102']);
  });
});

describe('syncRequirements', () => {
  test('adds a new planner course as required and unpinned', () => {
    expect(syncRequirements([], [course('CMSC131')])).toEqual([
      { course: course('CMSC131'), required: true, pin: { kind: 'none' } },
    ]);
  });

  test('drops a course removed from the planner', () => {
    const result = syncRequirements([requirement('CMSC131'), requirement('MATH140')], [course('MATH140')]);
    expect(result.map((r) => r.course.courseCode)).toEqual(['MATH140']);
  });

  test('keeps the settings and full course data of an existing course', () => {
    const fullCourse: Course = {
      ...course('CMSC131'),
      sections: [section('CMSC131', '0101'), section('CMSC131', '0102')],
    };
    const existing: GeneratorRequirement = {
      course: fullCourse,
      required: false,
      pin: { kind: 'bySection', sectionCode: '0102' },
    };
    const plannerCopy: Course = {
      ...course('CMSC131'),
      sections: [section('CMSC131', '0101')],
    };

    const [result] = syncRequirements([existing], [plannerCopy]);

    expect(result.required).toBe(false);
    expect(result.pin).toEqual({ kind: 'bySection', sectionCode: '0102' });
    expect(result.course.sections?.map((s) => s.sectionCode)).toEqual(['0101', '0102']);
  });

  test('drops a hand-added course that is not in the planner', () => {
    const result = syncRequirements([requirement('ENGL101')], [course('CMSC131')]);
    expect(result.map((r) => r.course.courseCode)).toEqual(['CMSC131']);
  });

  test('keeps existing order and appends new courses at the end', () => {
    const result = syncRequirements(
      [requirement('MATH140'), requirement('CMSC131')],
      [course('ENGL101'), course('CMSC131'), course('MATH140'), course('HIST200')]
    );
    expect(result.map((r) => r.course.courseCode)).toEqual(['MATH140', 'CMSC131', 'ENGL101', 'HIST200']);
  });

  test('empties the wishlist when the planner has no courses', () => {
    expect(syncRequirements([requirement('CMSC131')], [])).toEqual([]);
  });
});

describe('hydrateRequirements', () => {
  /** A full version of `courseCode`, with sections the planner did not have. */
  function fullCourse(courseCode: string): Course {
    return {
      ...course(courseCode),
      sections: [section(courseCode, '0101'), section(courseCode, '0102')],
    };
  }

  test('replaces course data for a requested code', () => {
    const [result] = hydrateRequirements([requirement('CMSC131')], new Set(['CMSC131']), {
      CMSC131: fullCourse('CMSC131'),
    });
    expect(result.course.sections?.map((s) => s.sectionCode)).toEqual(['0101', '0102']);
  });

  test('keeps settings changed while the request was in flight', () => {
    const edited: GeneratorRequirement = {
      course: course('CMSC131'),
      required: false,
      pin: { kind: 'byInstructor', name: 'Prof 0101' },
    };
    const [result] = hydrateRequirements([edited], new Set(['CMSC131']), {
      CMSC131: fullCourse('CMSC131'),
    });
    expect(result.required).toBe(false);
    expect(result.pin).toEqual({ kind: 'byInstructor', name: 'Prof 0101' });
  });

  test('leaves codes that were not requested untouched', () => {
    const untouched = requirement('MATH140');
    const result = hydrateRequirements([untouched], new Set(['CMSC131']), {
      CMSC131: fullCourse('CMSC131'),
      MATH140: fullCourse('MATH140'),
    });
    expect(result).toEqual([untouched]);
    expect(result[0].course.sections).toBeNull();
  });

  test('does not re-add a requested course removed from the list', () => {
    const result = hydrateRequirements([requirement('MATH140')], new Set(['CMSC131']), {
      CMSC131: fullCourse('CMSC131'),
    });
    expect(result.map((r) => r.course.courseCode)).toEqual(['MATH140']);
  });

  test('drops a requested code missing from the response', () => {
    const result = hydrateRequirements([requirement('OLD101'), requirement('MATH140')], new Set(['OLD101']), {});
    expect(result.map((r) => r.course.courseCode)).toEqual(['MATH140']);
  });
});
