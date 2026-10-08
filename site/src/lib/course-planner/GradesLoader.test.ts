/**
 * This file is part of Jupiterp. For terms of use, please see the file
 * called LICENSE at the top level of the Jupiterp source tree (online at
 * https://github.com/atcupps/Jupiterp/LICENSE).
 *
 *
 * @fileoverview Course cards that load grades together must share requests.
 *
 * Each card fetched its own grades, so a screen of four SOCY courses sent eight
 * requests to `/v1/grades/summary` -- reported by Sentry as an N+1.
 */

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { get } from 'svelte/store';
import { CourseGradesStore } from '../../stores/CoursePlannerStores';
import { courseGradeSummary, courseInstructorGradeSummary } from '../api/JupiterpApi';
import { loadCourseGrades } from './GradesLoader';

jest.mock('../api/JupiterpApi', () => ({
  courseGradeSummary: jest.fn(),
  courseInstructorGradeSummary: jest.fn(),
}));

// Jest runs as CommonJS here and Svelte ships ESM only. The loader needs no
// more of a store than set, update, and a synchronous read.
jest.mock('svelte/store', () => ({
  writable<T>(value: T) {
    return {
      set(next: T) {
        value = next;
      },
      update(fn: (current: T) => T) {
        value = fn(value);
      },
      subscribe(run: (current: T) => void) {
        run(value);
        return () => {};
      },
    };
  },
  get<T>(store: { subscribe(run: (current: T) => void): () => void }): T {
    let current!: T;
    store.subscribe((value) => (current = value))();
    return current;
  },
}));

const courseMock = courseGradeSummary as jest.MockedFunction<typeof courseGradeSummary>;
const instructorMock = courseInstructorGradeSummary as jest.MockedFunction<typeof courseInstructorGradeSummary>;

const counts = {
  a_plus: 1,
  a: 1,
  a_minus: 0,
  b_plus: 0,
  b: 0,
  b_minus: 0,
  c_plus: 0,
  c: 0,
  c_minus: 0,
  d_plus: 0,
  d: 0,
  d_minus: 0,
  f: 0,
  w: 0,
  other: 0,
  total: 2,
  graded: 2,
  gpa: 4,
  section_count: 1,
  term_count: 1,
  first_term: 202401,
  last_term: 202401,
};

function courseRow(course_code: string) {
  return { ...counts, course_code };
}

function instructorRow(course_code: string, instructor_id: number) {
  return {
    ...counts,
    course_code,
    instructor_id,
    instructor: `Prof ${instructor_id}`,
    instructor_slug: `prof-${instructor_id}`,
  };
}

describe('loadCourseGrades', () => {
  beforeEach(() => {
    CourseGradesStore.set({});
    courseMock.mockReset();
    instructorMock.mockReset();
  });

  test('sends one pair of requests for courses loaded together', async () => {
    courseMock.mockResolvedValue({ data: [courseRow('SOCY320'), courseRow('SOCY322')], total: null });
    instructorMock.mockResolvedValue({ data: [instructorRow('SOCY320', 1), instructorRow('SOCY322', 2)], total: null });

    await Promise.all(['SOCY322', 'SOCY320', 'SOCY335', 'SOCY340'].map((code) => loadCourseGrades(code)));

    expect(courseMock).toHaveBeenCalledTimes(1);
    expect(instructorMock).toHaveBeenCalledTimes(1);
    expect(courseMock.mock.calls[0][0].courseCodes).toBe('SOCY320,SOCY322,SOCY335,SOCY340');

    const store = get(CourseGradesStore);
    const socy320 = store['SOCY320'];
    expect(socy320.status).toBe('loaded');
    if (socy320.status === 'loaded') {
      expect(Object.keys(socy320.grades.byInstructorSlug)).toEqual(['prof-1']);
    }
    expect(store['SOCY335']).toEqual({ status: 'none' });
  });

  test('follows offsets when per-professor rows exceed one page', async () => {
    const firstPage = Array.from({ length: 500 }, (_, i) => instructorRow('ENGL101', i));
    courseMock.mockResolvedValue({ data: [courseRow('ENGL101')], total: null });
    instructorMock
      .mockResolvedValueOnce({ data: firstPage, total: null })
      .mockResolvedValueOnce({ data: [instructorRow('ENGL101', 500)], total: null });

    await loadCourseGrades('ENGL101');

    expect(instructorMock).toHaveBeenCalledTimes(2);
    expect(instructorMock.mock.calls[1][0].offset).toBe(500);
    const entry = get(CourseGradesStore)['ENGL101'];
    expect(entry.status === 'loaded' && Object.keys(entry.grades.byInstructorSlug).length).toBe(501);
  });

  test('marks every course in a failed batch as an error', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    courseMock.mockRejectedValue(new Error('down'));
    instructorMock.mockResolvedValue({ data: [], total: null });

    await Promise.all(['MATH140', 'MATH141'].map((code) => loadCourseGrades(code)));

    const store = get(CourseGradesStore);
    expect(store['MATH140']).toEqual({ status: 'error' });
    expect(store['MATH141']).toEqual({ status: 'error' });
  });
});
