/**
 * This file is part of Jupiterp. For terms of use, please see LICENSE at
 * https://github.com/atcupps/Jupiterp/LICENSE.
 *
 * Combines historical grade records and current teaching assignments by slug.
 */
import { client } from '../client';
import { instructorBySlug } from '../api/JupiterpApi';
import { loadCourseGradeSummaries } from '../course-planner/GradesLoader';
import type { Section } from '@jupiterp/jupiterp';
import type { CourseInstructorGradeSummary } from '../api/types';
import { toDistribution, mergeDistributions, type GradeDistribution } from '../course-planner/Grades';

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
    const existing = professors.get(row.instructor_slug);
    const distribution = toDistribution(row);
    professors.set(row.instructor_slug, {
      slug: row.instructor_slug,
      name: row.instructor,
      current: false,
      distribution: existing?.distribution ? mergeDistributions(existing.distribution, distribution) : distribution,
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

const currentCourses = new Map<string, ReturnType<typeof client.coursesWithSections>>();
const instructors = new Map<string, ReturnType<typeof instructorBySlug>>();

export function loadComparisonInstructor(slug: string) {
  let pending = instructors.get(slug);
  if (!pending) {
    pending = instructorBySlug(slug).catch((error) => {
      instructors.delete(slug);
      throw error;
    });
    instructors.set(slug, pending);
  }
  return pending;
}

export async function loadComparisonProfessors(code: string) {
  let current = currentCourses.get(code);
  if (!current) {
    current = client
      .coursesWithSections({ courseCodes: new Set([code]) })
      .then((response) => {
        if (!response.ok()) currentCourses.delete(code);
        return response;
      })
      .catch((error) => {
        currentCourses.delete(code);
        throw error;
      });
    currentCourses.set(code, current);
  }
  const [grades, assignments] = await Promise.allSettled([loadCourseGradeSummaries(code), current]);
  if (grades.status === 'rejected') throw grades.reason;
  const [summary, history] = grades.value;
  if (history.status === 'rejected') throw history.reason;
  const response = assignments.status === 'fulfilled' ? assignments.value : null;
  const currentCourse = response?.ok() ? response.data?.find((row) => row.courseCode === code) : undefined;
  const warnings: string[] = [];
  if (!response?.ok())
    warnings.push('Current teaching assignments could not be loaded. Showing professors from grade history.');
  if (summary.status === 'rejected') warnings.push('The course average could not be loaded.');
  const overall = summary.status === 'fulfilled' ? summary.value.data[0] : undefined;
  return {
    professors: comparisonProfessors(history.value.data, currentCourse?.sections ?? []),
    overall: overall ? toDistribution(overall) : null,
    warning: warnings.join(' '),
  };
}
