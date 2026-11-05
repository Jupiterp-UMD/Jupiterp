/**
 * This file is part of Jupiterp. For terms of use, please see LICENSE at
 * https://github.com/atcupps/Jupiterp/LICENSE.
 */
import { beforeEach, expect, jest, test } from '@jest/globals';
import { courseGradeSummary, courseInstructorGradeSummary } from '../api/JupiterpApi';
import { CourseGradesStore } from '../../stores/CoursePlannerStores';
import type { CourseGradeSummary, CourseInstructorGradeSummary } from '../api/types';
import type { CourseGradesEntry } from '../../stores/CoursePlannerStores';
import { loadCourseGradeSummaries, loadCourseGrades } from './GradesLoader';

jest.mock('svelte/store', () => ({ get: () => ({}) }));
jest.mock('../../stores/CoursePlannerStores', () => ({ CourseGradesStore: { update: jest.fn() } }));
jest.mock('../api/JupiterpApi', () => ({ courseGradeSummary: jest.fn(), courseInstructorGradeSummary: jest.fn() }));

const course = jest.mocked(courseGradeSummary);
const instructors = jest.mocked(courseInstructorGradeSummary);
beforeEach(() => {
  jest.clearAllMocks();
});

test('reuses successful and in-flight grade requests across planner and comparison callers', async () => {
  course.mockResolvedValue({ data: [], total: null });
  instructors.mockResolvedValue({ data: [], total: null });
  await Promise.all([loadCourseGradeSummaries('CACHE101'), loadCourseGradeSummaries('CACHE101')]);
  await loadCourseGradeSummaries('CACHE101');
  expect(course).toHaveBeenCalledTimes(1);
  expect(instructors).toHaveBeenCalledTimes(1);
});

test('retries a failed summary without refetching successful instructor history', async () => {
  course.mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ data: [], total: null });
  instructors.mockResolvedValue({ data: [], total: null });
  const [failed, history] = await loadCourseGradeSummaries('RETRY101');
  expect(failed.status).toBe('rejected');
  expect(history.status).toBe('fulfilled');
  const [retried] = await loadCourseGradeSummaries('RETRY101');
  expect(retried.status).toBe('fulfilled');
  expect(course).toHaveBeenCalledTimes(2);
  expect(instructors).toHaveBeenCalledTimes(1);
});

test('the planner cache also preserves duplicate-slug counts and weighted GPAs', async () => {
  course.mockResolvedValue({ data: [{ graded: 100, gpa: 3 }] as CourseGradeSummary[], total: null });
  instructors.mockResolvedValue({
    data: [
      { instructor_slug: 'alex', instructor: 'Alex', graded: 30, gpa: 4 },
      { instructor_slug: 'alex', instructor: 'A. Alias', graded: 70, gpa: 2 },
    ] as CourseInstructorGradeSummary[],
    total: null,
  });
  await loadCourseGrades('MERGE101');
  const entries = jest
    .mocked(CourseGradesStore.update)
    .mock.calls.map(([update]) => update({}) as Record<string, CourseGradesEntry>);
  expect(entries.at(-1)).toMatchObject({
    MERGE101: { status: 'loaded', grades: { byInstructorSlug: { alex: { graded: 100, gpa: 2.6 } } } },
  });
});
