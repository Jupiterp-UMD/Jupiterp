/** This file is part of Jupiterp. See LICENSE at the repository root.
 * Pure directory filters, comparison choices, and course ordering.
 */
import type { InstructorFull } from '../api/types';
import { gpaOf, type GradeDistribution } from '../course-planner/Grades';
import { displayRating } from './Rating';

export interface DirectoryProfessor {
  instructor: InstructorFull;
  distribution: GradeDistribution | null;
  courses: string[];
  gradesError: boolean;
}
export type DirectorySort =
  | 'name.asc'
  | 'name.desc'
  | 'average_rating.desc'
  | 'average_rating.asc'
  | 'gpa.desc'
  | 'gpa.asc'
  | 'graded.desc'
  | 'graded.asc';
export interface DirectoryFilters {
  query: string;
  activeOnly: boolean;
  hasRatings: boolean;
  hasGrades: boolean;
  letter: string;
  sort: DirectorySort;
}

export function matchesDirectory(
  row: DirectoryProfessor,
  filters: Pick<DirectoryFilters, 'hasRatings' | 'hasGrades' | 'letter'>
): boolean {
  return (
    (!filters.hasRatings || displayRating(row.instructor) !== null) &&
    (!filters.hasGrades || (row.distribution !== null && row.distribution.barTotal > 0)) &&
    (!filters.letter || row.instructor.name.toUpperCase().startsWith(filters.letter))
  );
}

export function commonCourseCodes(rows: DirectoryProfessor[]): string[] {
  if (!rows.length) return [];
  return [...new Set(rows[0].courses)].filter((code) => rows.every((row) => row.courses.includes(code))).sort();
}

export function orderDirectoryRows(rows: DirectoryProfessor[], sort: DirectorySort): DirectoryProfessor[] {
  return [...rows].sort((a, b) => {
    if (sort.startsWith('name.'))
      return (sort.endsWith('desc') ? -1 : 1) * a.instructor.name.localeCompare(b.instructor.name);
    const x = sort.startsWith('gpa.')
      ? gpaOf(a.distribution)
      : sort.startsWith('graded.')
        ? (a.distribution?.graded ?? null)
        : (a.instructor.combined_rating ?? a.instructor.average_rating);
    const y = sort.startsWith('gpa.')
      ? gpaOf(b.distribution)
      : sort.startsWith('graded.')
        ? (b.distribution?.graded ?? null)
        : (b.instructor.combined_rating ?? b.instructor.average_rating);
    if (x === null || y === null)
      return x === y ? a.instructor.name.localeCompare(b.instructor.name) : x === null ? 1 : -1;
    return (sort.endsWith('desc') ? y - x : x - y) || a.instructor.name.localeCompare(b.instructor.name);
  });
}
