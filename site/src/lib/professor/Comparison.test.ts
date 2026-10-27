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
import { comparisonProfessors, loadComparisonProfessors, loadComparisonInstructor } from './Comparison';

jest.mock('../client', () => ({ client: { coursesWithSections: jest.fn() } }));
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
