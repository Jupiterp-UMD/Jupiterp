/** This file is part of Jupiterp. See LICENSE at the repository root. */
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import type { InstructorFull, InstructorGradeSummary } from '../api/types';
import {
  currentCourseCodesFor,
  searchInstructors,
  directoryGradeSummaries,
  instructorGradeSummary,
  instructorCourseGradeSummary,
} from '../api/JupiterpApi';
import { loadDirectoryPage } from './DirectoryData';
import type { DirectoryFilters } from './DirectoryModel';

jest.mock('../api/JupiterpApi', () => ({
  searchInstructors: jest.fn(),
  directoryGradeSummaries: jest.fn(),
  instructorGradeSummary: jest.fn(),
  instructorCourseGradeSummary: jest.fn(),
  currentCourseCodesFor: jest.fn(),
}));
const search = jest.mocked(searchInstructors);
const summaries = jest.mocked(directoryGradeSummaries);
const overall = jest.mocked(instructorGradeSummary);
const courses = jest.mocked(instructorCourseGradeSummary);
const grade = {
  a_plus: 0,
  a: 30,
  a_minus: 0,
  b_plus: 0,
  b: 40,
  b_minus: 0,
  c_plus: 0,
  c: 20,
  c_minus: 0,
  d_plus: 0,
  d: 10,
  d_minus: 0,
  f: 0,
  w: 0,
  other: 0,
  total: 100,
  graded: 100,
  gpa: 2.9,
  section_count: 1,
} as InstructorGradeSummary;
const filters: DirectoryFilters = {
  query: '',
  activeOnly: true,
  hasRatings: false,
  hasGrades: false,
  letter: '',
  sort: 'name.asc',
};
const people = Array.from(
  { length: 25 },
  (_, index) =>
    ({
      slug: `paging-${index}`,
      name: `Professor ${String(index).padStart(2, '0')}`,
      is_active: true,
      display_rating: 4,
      average_rating: 4,
      combined_rating: 4,
    }) as InstructorFull
);

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(currentCourseCodesFor).mockResolvedValue([]);
  overall.mockResolvedValue(grade);
  courses.mockResolvedValue({ data: [], total: 0 });
  search.mockImplementation(async (config) => ({
    data: people.slice(config.offset ?? 0, (config.offset ?? 0) + (config.limit ?? 25)),
    total: people.length,
  }));
});
describe('directory page cursors', () => {
  test('ten-row pages preserve unconsumed rows from a larger API batch', async () => {
    const first = await loadDirectoryPage(filters, 0, () => false);
    const second = await loadDirectoryPage(filters, first.cursor, () => false);
    const third = await loadDirectoryPage(filters, second.cursor, () => false);
    expect([first.rows.length, second.rows.length, third.rows.length]).toEqual([10, 10, 5]);
    expect([first.cursor, second.cursor, third.cursor]).toEqual([10, 20, 25]);
    expect(third.more).toBe(false);
    expect(new Set([...first.rows, ...second.rows, ...third.rows].map((row) => row.instructor.slug)).size).toBe(25);
  });
  test('keeps summary order when instructor metadata arrives in a different order', async () => {
    const ordered = people.map((person, index) => ({
      ...grade,
      instructor_slug: person.slug,
      instructor: person.name,
      gpa: 4 - index / 100,
    }));
    summaries.mockImplementation(async (_sort, offset) => ({ data: ordered.slice(offset, offset + 25), total: 25 }));
    search.mockImplementation(async (config) => ({
      data: people.filter((person) => config.instructorSlugs?.split(',').includes(person.slug)).reverse(),
      total: 25,
    }));
    const result = await loadDirectoryPage({ ...filters, sort: 'gpa.desc' }, 0, () => false);
    expect(result.rows.map((row) => row.instructor.slug)).toEqual(people.slice(0, 10).map((person) => person.slug));
    expect(result.rows[0].distribution?.gpa).toBe(4);
    expect(result.cursor).toBe(10);
  });
  test('does not request more data after cancellation', async () => {
    const result = await loadDirectoryPage(filters, 10, () => true);
    expect(result.rows).toEqual([]);
    expect(search).not.toHaveBeenCalled();
  });
});
