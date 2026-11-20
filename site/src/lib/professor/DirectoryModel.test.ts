/** This file is part of Jupiterp. See LICENSE at the repository root. */
import { describe, expect, test } from '@jest/globals';
import type { InstructorFull } from '../api/types';
import type { GradeDistribution } from '../course-planner/Grades';
import { commonCourseCodes, matchesDirectory, orderDirectoryRows, type DirectoryProfessor } from './DirectoryModel';

function row(name: string, gpa: number | null, rating: number | null, courses: string[]): DirectoryProfessor {
  return {
    instructor: {
      slug: name.toLowerCase(),
      name,
      display_rating: rating,
      combined_rating: rating,
      average_rating: rating,
    } as InstructorFull,
    distribution: gpa === null ? null : ({ gpa, graded: 100, barTotal: 100 } as GradeDistribution),
    courses,
    gradesError: false,
  };
}
describe('professor directory', () => {
  const a = row('Anvita', 3.8, 4.5, ['CMSC131', 'CMSC330']);
  const b = row('Jimmy', 2.8, null, ['CMSC131', 'MATH141']);
  const c = row('Priyam', null, 4, ['PHYS161']);
  test('combines rating, grade-history and initial filters', () => {
    expect(matchesDirectory(a, { hasRatings: true, hasGrades: true, letter: 'A' })).toBe(true);
    expect(matchesDirectory(b, { hasRatings: true, hasGrades: false, letter: '' })).toBe(false);
    expect(matchesDirectory(c, { hasRatings: false, hasGrades: true, letter: '' })).toBe(false);
    expect(matchesDirectory(a, { hasRatings: false, hasGrades: false, letter: 'Z' })).toBe(false);
  });
  test('finds only courses every selected professor has taught', () => {
    expect(commonCourseCodes([a, b])).toEqual(['CMSC131']);
    expect(commonCourseCodes([a, c])).toEqual([]);
    expect(commonCourseCodes([])).toEqual([]);
  });
  test('sorts GPA in either direction with missing data last', () => {
    expect(orderDirectoryRows([c, b, a], 'gpa.desc').map((row) => row.instructor.name)).toEqual([
      'Anvita',
      'Jimmy',
      'Priyam',
    ]);
    expect(orderDirectoryRows([c, b, a], 'gpa.asc').map((row) => row.instructor.name)).toEqual([
      'Jimmy',
      'Anvita',
      'Priyam',
    ]);
  });
  test('does not mutate the course results when sorting', () => {
    const rows = [c, b, a];
    orderDirectoryRows(rows, 'name.asc');
    expect(rows.map((row) => row.instructor.name)).toEqual(['Priyam', 'Jimmy', 'Anvita']);
  });
});
