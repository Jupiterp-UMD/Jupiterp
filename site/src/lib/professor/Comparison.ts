/**
 * This file is part of Jupiterp. For terms of use, please see LICENSE at
 * https://github.com/atcupps/Jupiterp/LICENSE.
 *
 * Combines historical grade records and current teaching assignments by slug.
 */
import type { Section } from '@jupiterp/jupiterp';
import type { CourseInstructorGradeSummary } from '../api/types';
import { toDistribution, type GradeDistribution } from '../course-planner/Grades';

export interface ComparisonProfessor {
  slug: string;
  name: string;
  current: boolean;
  distribution: GradeDistribution | null;
}

export function comparisonProfessors(
  history: CourseInstructorGradeSummary[],
  sections: Section[]
): ComparisonProfessor[] {
  const professors = new Map<string, ComparisonProfessor>();
  for (const row of history) {
    if (!row.instructor_slug) continue;
    professors.set(row.instructor_slug, {
      slug: row.instructor_slug,
      name: row.instructor,
      current: false,
      distribution: toDistribution(row),
    });
  }
  for (const section of sections) {
    section.instructors.forEach((name, index) => {
      const slug = section.instructorSlugs?.[index];
      if (!slug) return;
      const existing = professors.get(slug);
      if (existing) {
        existing.current = true;
      } else {
        professors.set(slug, { slug, name, current: true, distribution: null });
      }
    });
  }
  return [...professors.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function sharedComparisonCourses(selected: { courses: string[] }[]): string[] {
  return selected.length === 0
    ? []
    : selected[0].courses.filter((code) => selected.every((professor) => professor.courses.includes(code))).sort();
}
