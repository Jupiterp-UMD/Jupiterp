/**
 * This file is part of Jupiterp. For terms of use, please see LICENSE at
 * https://github.com/atcupps/Jupiterp/LICENSE.
 */
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { client } from '../client';
import { instructorBySlug } from '../api/JupiterpApi';
import { loadCourseGradeSummaries } from '../course-planner/GradesLoader';
import { toDistribution, mergeDistributions, calculateGpaWithoutActiveProf } from '../course-planner/Grades';
import type { Section } from '@jupiterp/jupiterp';
import type { CourseInstructorGradeSummary } from '../api/types';
import {
  comparisonProfessors,
  loadComparisonProfessors,
  loadComparisonInstructor,
  loadRatings,
  loadCourseSuggestions,
  hasCourseSuggestions,
  groupGpaDots,
} from './Comparison';

jest.mock('../client', () => ({
  client: { coursesWithSections: jest.fn(), instructors: jest.fn(), minifiedCourses: jest.fn() },
}));
jest.mock(
  '@jupiterp/jupiterp',
  () => ({
    SortBy: class {
      keys: string[] = [];
      ascending(key: string) {
        this.keys.push(`${key}.asc`);
        return this;
      }
      argsArray() {
        return this.keys;
      }
    },
  }),
  { virtual: true }
);
jest.mock('../api/JupiterpApi', () => ({ instructorBySlug: jest.fn() }));
jest.mock('../course-planner/GradesLoader', () => ({ loadCourseGradeSummaries: jest.fn() }));

describe('comparisonProfessors', () => {
  const history = {
    instructor_slug: 'alex',
    instructor: 'Alex Canonical',
    graded: 30,
    gpa: 3.2,
    section_count: 1,
  } as CourseInstructorGradeSummary;

  test('merges current aliases by slug while retaining historical grades and canonical names', () => {
    const section = { instructors: ['A. Alias'], instructorSlugs: ['alex'] } as Section;
    const results = comparisonProfessors([history], [section, section]);
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ name: 'Alex Canonical', current: true, distribution: { gpa: 3.2, graded: 30 } });
  });

  test('includes historical professors and current professors without grades, excluding unresolved names', () => {
    const section = { instructors: ['Bea', 'Unknown'], instructorSlugs: ['bea', null] } as Section;
    expect(comparisonProfessors([history], [section])).toMatchObject([
      { slug: 'alex', current: false },
      { slug: 'bea', current: true, distribution: null },
    ]);
  });

  test('keeps different professors with the same name separate', () => {
    const section = { instructors: ['Alex Canonical'], instructorSlugs: ['another-alex'] } as Section;
    expect(comparisonProfessors([history], [section])).toHaveLength(2);
  });
});

describe('loadRatings', () => {
  test('treats a non-finite fallback rating as no rating', async () => {
    jest.mocked(client.instructors).mockResolvedValue({
      ok: () => true,
      data: [{ slug: 'nan-rating', combined_rating: null, average_rating: NaN, pt_review_count: 2 }],
    } as never);
    const ratings = await loadRatings(['nan-rating']);
    expect(ratings.get('nan-rating')).toEqual({ rating: null, reviews: 2 });
  });

  test('serves a slug from a bulk load without another request', async () => {
    const instructors = jest.mocked(client.instructors);
    instructors.mockResolvedValue({
      ok: () => true,
      data: [
        { slug: 'bulk-a', combined_rating: 4.2, average_rating: 4, jupiterp_review_count: 1, pt_review_count: 2 },
        { slug: 'bulk-b', combined_rating: 3.1, average_rating: 3, jupiterp_review_count: 0, pt_review_count: 5 },
      ],
    } as never);
    await loadRatings(['bulk-a', 'bulk-b']);
    const requests = instructors.mock.calls.length;
    const ratings = await loadRatings(['bulk-b']);
    expect(instructors.mock.calls.length).toBe(requests);
    expect(ratings.get('bulk-b')).toEqual({ rating: 3.1, reviews: 5 });
  });
});

describe('loadCourseSuggestions', () => {
  test('asks the API for course code order so the limit keeps the first results', async () => {
    jest.mocked(client.minifiedCourses).mockResolvedValue({ ok: () => true, data: [] } as never);
    await loadCourseSuggestions('CM');
    const config = jest.mocked(client.minifiedCourses).mock.calls[0][0];
    expect(config).toMatchObject({ prefix: 'CM', limit: 50 });
    expect(config.sortBy?.argsArray()).toEqual(['course_code.asc']);
  });

  test('evicts the least recently used prefix once the cache is full', async () => {
    jest.mocked(client.minifiedCourses).mockResolvedValue({ ok: () => true, data: [] } as never);
    for (let i = 0; i < 50; i++) await loadCourseSuggestions(`K${i}`);
    await loadCourseSuggestions('K0');
    await loadCourseSuggestions('K50');
    expect(hasCourseSuggestions('K0')).toBe(true);
    expect(hasCourseSuggestions('K1')).toBe(false);
    expect(hasCourseSuggestions('K50')).toBe(true);
  });

  test('reuses a cached prefix without another request', async () => {
    const minifiedCourses = jest.mocked(client.minifiedCourses);
    minifiedCourses.mockResolvedValue({ ok: () => true, data: [] } as never);
    await loadCourseSuggestions('RE');
    const requests = minifiedCourses.mock.calls.length;
    await loadCourseSuggestions('RE');
    expect(minifiedCourses.mock.calls.length).toBe(requests);
  });

  test('does not cache a failed lookup', async () => {
    jest.mocked(client.minifiedCourses).mockRejectedValueOnce(new Error('offline') as never);
    await expect(loadCourseSuggestions('FA')).rejects.toThrow('offline');
    expect(hasCourseSuggestions('FA')).toBe(false);
  });
});

describe('combined grade records', () => {
  test('merges counts, weighted API GPAs, sections, and term ranges for duplicate slugs', () => {
    const first = {
      instructor_slug: 'alex',
      instructor: 'Alex',
      graded: 30,
      total: 32,
      gpa: 3.2,
      a: 10,
      w: 2,
      first_term: 201001,
      last_term: 201808,
      section_count: 1,
    } as CourseInstructorGradeSummary;
    const second = {
      ...first,
      instructor: 'A. Alias',
      graded: 70,
      total: 73,
      gpa: 2,
      a: 15,
      w: 3,
      first_term: 201501,
      last_term: 202608,
      section_count: 2,
    };
    const [professor] = comparisonProfessors([first, second], []);
    expect(professor.distribution).toMatchObject({
      graded: 100,
      total: 105,
      gpa: 2.36,
      barTotal: 105,
      letters: { A: 25, W: 5 },
      buckets: { A: 25, W: 5 },
      sectionCount: 3,
      firstTerm: 201001,
      lastTerm: 202608,
    });
    expect(first.graded).toBe(30);
  });

  test('does not invent a GPA when a contributing record has missing GPA', () => {
    const known = toDistribution({ graded: 30, gpa: 3 } as CourseInstructorGradeSummary);
    const unknown = toDistribution({ graded: 10, gpa: null } as CourseInstructorGradeSummary);
    expect(mergeDistributions(known, unknown).gpa).toBeNull();
  });
});

describe('GPA excluding the active professor', () => {
  test('uses graded-student weights and excludes the professor being compared', () => {
    expect(calculateGpaWithoutActiveProf({ graded: 100, gpa: 3 }, { graded: 20, gpa: 4 })).toBe(2.75);
  });
  test('handles missing grades and insufficient remaining students', () => {
    expect(calculateGpaWithoutActiveProf(null, null)).toBeNull();
    expect(calculateGpaWithoutActiveProf({ graded: 100, gpa: 3 }, null)).toBe(3);
    expect(calculateGpaWithoutActiveProf({ graded: 100, gpa: 3 }, { graded: 81, gpa: 3 })).toBeNull();
    expect(calculateGpaWithoutActiveProf({ graded: 19, gpa: 3 }, null)).toBeNull();
  });
});

describe('comparison loading', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  const summaries = jest.mocked(loadCourseGradeSummaries);
  const assignments = jest.mocked(client.coursesWithSections);
  const instructor = jest.mocked(instructorBySlug);

  test('shares current-course and instructor requests across consumers', async () => {
    summaries.mockResolvedValue([
      { status: 'fulfilled', value: { data: [], total: null } },
      { status: 'fulfilled', value: { data: [], total: null } },
    ]);
    assignments.mockResolvedValue({ ok: () => true, data: [] } as never);
    await Promise.all([loadComparisonProfessors('CACHE101'), loadComparisonProfessors('CACHE101')]);
    expect(assignments).toHaveBeenCalledTimes(1);
    instructor.mockResolvedValue(null);
    await Promise.all([loadComparisonInstructor('cached-professor'), loadComparisonInstructor('cached-professor')]);
    await loadComparisonInstructor('cached-professor');
    expect(instructor).toHaveBeenCalledTimes(1);
  });

  test('returns consistent partial-failure warnings and retries failed assignments', async () => {
    summaries.mockResolvedValue([
      { status: 'rejected', reason: new Error('summary unavailable') },
      { status: 'fulfilled', value: { data: [], total: null } },
    ]);
    assignments.mockRejectedValue(new Error('assignments unavailable'));
    const result = await loadComparisonProfessors('RETRY101');
    expect(result.warning).toContain('Current teaching assignments could not be loaded');
    expect(result.warning).toContain('course average could not be loaded');
    expect(result.overall).toBeNull();
    assignments.mockResolvedValue({ ok: () => true, data: [] } as never);
    await loadComparisonProfessors('RETRY101');
    expect(assignments).toHaveBeenCalledTimes(2);
  });

  test('fails when essential grade history cannot be loaded', async () => {
    summaries.mockResolvedValue([
      { status: 'fulfilled', value: { data: [], total: null } },
      { status: 'rejected', reason: new Error('history unavailable') },
    ]);
    assignments.mockResolvedValue({ ok: () => true, data: [] } as never);
    await expect(loadComparisonProfessors('FAIL101')).rejects.toThrow('history unavailable');
  });

  test('retries failed instructor requests instead of caching an outage', async () => {
    instructor.mockRejectedValueOnce(new Error('offline')).mockResolvedValue(null);
    await expect(loadComparisonInstructor('retry-professor')).rejects.toThrow('offline');
    await expect(loadComparisonInstructor('retry-professor')).resolves.toBeNull();
    expect(instructor).toHaveBeenCalledTimes(2);
  });
});

describe('touch GPA groups', () => {
  const professor = (slug: string, gpa: number) => ({ slug, name: slug, gpa });

  test('retains every professor without mutating input order', () => {
    const input = [professor('high', 3.8), professor('close', 3.03), professor('low', 3)];
    const groups = groupGpaDots(input, 1000);
    expect(groups.map((group) => group.professors.map((entry) => entry.slug))).toEqual([['low', 'close'], ['high']]);
    expect(groups[0].gpa).toBeCloseTo(3.015);
    expect(input.map((entry) => entry.slug)).toEqual(['high', 'close', 'low']);
  });

  test('groups markers whose tap targets would overlap on a narrow scale', () => {
    const groups = groupGpaDots([professor('a', 2.5), professor('b', 2.65), professor('c', 3.5)], 288);
    expect(groups.map((group) => group.professors.length)).toEqual([2, 1]);
  });

  test('groups dots clamped to either end of the scale', () => {
    expect(
      groupGpaDots([professor('a', 1), professor('b', 1.8), professor('c', 4), professor('d', 4.1)], 288).map(
        (group) => group.professors.length
      )
    ).toEqual([2, 2]);
  });

  test('handles empty and single-professor scales', () => {
    expect(groupGpaDots([], 0)).toEqual([]);
    expect(groupGpaDots([professor('a', 3)], 0)[0].professors).toHaveLength(1);
  });
});
