/**
 * This file is part of Jupiterp. For terms of use, please see the file
 * called LICENSE at the top level of the Jupiterp source tree (online at
 * https://github.com/atcupps/Jupiterp/LICENSE).
 * Copyright (C) 2026 Andrew Cupps
 *
 * @fileoverview Loads grade data for courses into `CourseGradesStore`.
 *
 * Previously this fetched raw per-section records from PlanetTerp directly
 * from the browser and summed them client-side. It now calls the Jupiterp API,
 * which serves pre-aggregated distributions from UMD registrar data with a
 * twelve-hour server-side cache in front.
 *
 * Kept from the PlanetTerp version:
 *
 *   * the `gradesAutoload` action and its 300ms dwell, which is a good pattern
 *     and directly reduces load -- a card scrolled past quickly never fetches,
 *     so a department search rendering hundreds of them costs almost nothing;
 *   * in-flight deduplication;
 *   * the loading/loaded/none/error status union.
 *
 * Dropped:
 *
 *   * the three-request concurrency limiter, which existed to be polite to
 *     PlanetTerp. Our own API has server-side caching and does not need it;
 *   * the `status === 400` special case, which was a PlanetTerp quirk. Ours
 *     returns 200 with an empty array.
 */

import { get } from 'svelte/store';
import { CourseGradesStore } from '../../stores/CoursePlannerStores';
import type { CourseGradesEntry } from '../../stores/CoursePlannerStores';
import { courseGradeSummary, courseInstructorGradeSummary } from '../api/JupiterpApi';
import { toDistribution, type GradeDistribution } from './Grades';

/** How long a course card must stay visible before grades are fetched */
const AUTOLOAD_DWELL_MS = 300;

const inFlight: Map<string, Promise<void>> = new Map();

function setEntry(courseCode: string, entry: CourseGradesEntry): void {
  CourseGradesStore.update((store) => ({ ...store, [courseCode]: entry }));
}

/**
 * Grade data for one course: the course-wide distribution and one per
 * professor who has taught it.
 */
export interface CourseGrades {
  course: GradeDistribution;
  /** Keyed by instructor slug, which is stable across name spellings */
  byInstructorSlug: Record<string, GradeDistribution>;
  /**
   * Display name per slug, so a listing can match a Testudo-spelled name to a
   * distribution without depending on the two spellings agreeing.
   */
  namesBySlug: Record<string, string>;
}

/**
 * Load grade data for a course into `CourseGradesStore`.
 *
 * No-ops if the course already has an entry, unless that entry is an error and
 * `opts.retryError` is set. Failures are logged and swallowed: grade data is
 * supplementary, and a grades outage must not take the planner with it.
 */
export async function loadCourseGrades(courseCode: string, opts: { retryError?: boolean } = {}): Promise<void> {
  const entry = get(CourseGradesStore)[courseCode];
  if (entry !== undefined && (entry.status !== 'error' || !opts.retryError)) {
    return;
  }
  const pending = inFlight.get(courseCode);
  if (pending !== undefined) {
    return pending;
  }
  const promise = fetchCourseGrades(courseCode);
  inFlight.set(courseCode, promise);
  try {
    await promise;
  } finally {
    inFlight.delete(courseCode);
  }
}

async function fetchCourseGrades(courseCode: string): Promise<void> {
  setEntry(courseCode, { status: 'loading' });
  try {
    // Two requests rather than one: the course-wide distribution includes
    // sections with no attributed instructor, so it is not the sum of the
    // per-professor rows and cannot be derived from them. About 26% of
    // historical rows have no registrar-named instructor.
    const [coursePage, instructorPage] = await Promise.all([
      courseGradeSummary({ courseCodes: courseCode }),
      courseInstructorGradeSummary({ courseCodes: courseCode }),
    ]);

    const courseRow = coursePage.data[0];
    if (courseRow === undefined) {
      setEntry(courseCode, { status: 'none' });
      return;
    }

    const byInstructorSlug: Record<string, GradeDistribution> = {};
    const namesBySlug: Record<string, string> = {};
    for (const row of instructorPage.data) {
      if (row.instructor_slug === null || row.instructor_slug === undefined) {
        continue;
      }
      byInstructorSlug[row.instructor_slug] = toDistribution(row);
      namesBySlug[row.instructor_slug] = row.instructor;
    }

    setEntry(courseCode, {
      status: 'loaded',
      grades: {
        course: toDistribution(courseRow),
        byInstructorSlug,
        namesBySlug,
      },
    });
  } catch (error) {
    console.error('Error fetching Jupiterp grade data:', error);
    setEntry(courseCode, { status: 'error' });
  }
}

/**
 * Svelte action that loads grades for a course once its element has been
 * visible for `AUTOLOAD_DWELL_MS`.
 *
 * Usage: `<div use:gradesAutoload={course.courseCode}>`
 */
export function gradesAutoload(node: HTMLElement, courseCode: string): { destroy(): void } {
  if (typeof IntersectionObserver === 'undefined' || get(CourseGradesStore)[courseCode] !== undefined) {
    return {
      destroy() {},
    };
  }
  let dwellTimer: ReturnType<typeof setTimeout> | null = null;
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          if (dwellTimer === null) {
            dwellTimer = setTimeout(() => {
              observer.disconnect();
              void loadCourseGrades(courseCode);
            }, AUTOLOAD_DWELL_MS);
          }
        } else if (dwellTimer !== null) {
          clearTimeout(dwellTimer);
          dwellTimer = null;
        }
      }
    },
    { threshold: 0.1 }
  );
  observer.observe(node);
  return {
    destroy() {
      if (dwellTimer !== null) {
        clearTimeout(dwellTimer);
      }
      observer.disconnect();
    },
  };
}
