/**
 * This file is part of Jupiterp. For terms of use, please see LICENSE at
 * https://github.com/atcupps/Jupiterp/LICENSE.
 *
 * Combines historical grade records and current teaching assignments by slug.
 */
import { client } from '../client';
import { instructorBySlug } from '../api/JupiterpApi';
import { loadCourseGradeSummaries } from '../course-planner/GradesLoader';
import type { CourseMinified, Section } from '@jupiterp/jupiterp';
import type { CourseInstructorGradeSummary } from '../api/types';
import { toDistribution, mergeDistributions, type GradeDistribution } from '../course-planner/Grades';

export interface ComparisonProfessor {
  slug: string;
  name: string;
  current: boolean;
  distribution: GradeDistribution | null;
}

export const MAX_COMPARED = 4;

export const PROFESSOR_COLORS = [
  {
    dot: 'var(--orange)',
    shades: ['var(--grade-strong)', 'var(--grade-mid)', 'var(--grade-soft)'],
    withdrawn: 'var(--mid-gray)',
    text: '#000',
  },
  { dot: '#38bdf8', shades: ['#0369a1', '#38bdf8', '#bae6fd'], withdrawn: '#647f98', text: '#000' },
  { dot: '#8b5cf6', shades: ['#5b21b6', '#8b5cf6', '#ddd6fe'], withdrawn: '#7c6f9a', text: '#fff' },
  { dot: '#14b8a6', shades: ['#0f766e', '#14b8a6', '#99f6e4'], withdrawn: '#5f8a85', text: '#000' },
] as const;

export interface ProfessorRating {
  rating: number | null;
  reviews: number;
}

const ratings = new Map<string, Promise<ProfessorRating | null>>();

export async function loadRatings(slugs: string[]): Promise<Map<string, ProfessorRating | null>> {
  const missing = [...new Set(slugs)].filter((slug) => !ratings.has(slug));
  for (let start = 0; start < missing.length; start += 100) {
    const chunk = missing.slice(start, start + 100);
    const request = client
      .instructors({
        instructorSlugs: new Set(chunk),
        columns: ['slug', 'combined_rating', 'average_rating', 'jupiterp_review_count', 'pt_review_count'],
        limit: 500,
      })
      .then((response) => {
        if (!response.ok() || response.data == null) throw new Error('Ratings could not be loaded');
        return new Map(response.data.map((row) => [row.slug, row]));
      });
    for (const slug of chunk) {
      const pending = request.then((rows) => {
        const row = rows.get(slug);
        if (!row) return null;
        return {
          rating: row.combined_rating ?? row.average_rating,
          reviews: (row.jupiterp_review_count ?? 0) + (row.pt_review_count ?? 0),
        };
      });
      pending.catch(() => ratings.delete(slug));
      ratings.set(slug, pending);
    }
  }
  const entries = await Promise.all(slugs.map(async (slug) => [slug, await ratings.get(slug)!] as const));
  return new Map(entries);
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

const suggestions = new Map<string, Promise<CourseMinified[]>>();

export function loadCourseSuggestions(prefix: string): Promise<CourseMinified[]> {
  let pending = suggestions.get(prefix);
  if (!pending) {
    pending = client
      .minifiedCourses({ prefix, limit: 50 })
      .then((response) => {
        if (!response.ok() || response.data == null) throw new Error(`Course suggestions failed for ${prefix}`);
        return [...response.data].sort((a, b) => a.courseCode.localeCompare(b.courseCode));
      })
      .catch((error) => {
        suggestions.delete(prefix);
        throw error;
      });
    suggestions.set(prefix, pending);
  }
  return pending;
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

export interface ProfessorGpa {
  slug: string;
  name: string;
  gpa: number;
}

export function groupGpaDots(professors: ProfessorGpa[], scaleWidth: number) {
  const width = Math.max(44, scaleWidth);
  const position = (gpa: number) => Math.max(22, Math.min(width - 22, ((gpa - 2) / 2) * width));
  const groups: ProfessorGpa[][] = [];
  for (const professor of [...professors].sort((a, b) => a.gpa - b.gpa)) {
    const group = groups.at(-1);
    const previous = group?.at(-1);
    if (
      group &&
      previous &&
      (professor.gpa - previous.gpa <= 0.04 + Number.EPSILON || position(professor.gpa) - position(previous.gpa) <= 44)
    ) {
      group.push(professor);
    } else {
      groups.push([professor]);
    }
  }
  return groups.map((professors) => ({
    professors,
    gpa: professors.reduce((sum, professor) => sum + professor.gpa, 0) / professors.length,
  }));
}
