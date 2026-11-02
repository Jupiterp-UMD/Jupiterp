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
 * Courses requested within `BATCH_WINDOW_MS` of each other share one pair of
 * requests. Every card on screen finishes its dwell at almost the same moment,
 * so fetching per card sent two requests per visible course -- Sentry flagged
 * it as an N+1 on `/v1/grades/summary`.
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
import type { CourseInstructorGradeSummary } from '../api/types';
import { toDistribution, type GradeDistribution } from './Grades';

/** How long a course card must stay visible before grades are fetched */
const AUTOLOAD_DWELL_MS = 300;

/** How long to wait for more courses before sending a batch */
const BATCH_WINDOW_MS = 50;

/**
 * Most courses per request. Keeps URLs short and keeps the per-professor
 * rows for one batch to a page or two.
 */
const MAX_BATCH_SIZE = 25;

/** The API's maximum `limit` */
const PAGE_SIZE = 500;

const inFlight: Map<string, Promise<void>> = new Map();

interface QueuedCourse {
  courseCode: string;
  resolve: () => void;
}

let queue: QueuedCourse[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

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
export function loadCourseGrades(courseCode: string, opts: { retryError?: boolean } = {}): Promise<void> {
  const entry = get(CourseGradesStore)[courseCode];
  if (entry !== undefined && (entry.status !== 'error' || !opts.retryError)) {
    return Promise.resolve();
  }
  const pending = inFlight.get(courseCode);
  if (pending !== undefined) {
    return pending;
  }
  setEntry(courseCode, { status: 'loading' });
  const promise = new Promise<void>((resolve) => {
    queue.push({ courseCode, resolve });
  });
  inFlight.set(courseCode, promise);
  flushTimer ??= setTimeout(flushQueue, BATCH_WINDOW_MS);
  return promise;
}

function flushQueue(): void {
  flushTimer = null;
  const queued = queue;
  queue = [];
  for (let i = 0; i < queued.length; i += MAX_BATCH_SIZE) {
    void fetchBatch(queued.slice(i, i + MAX_BATCH_SIZE));
  }
}

async function fetchBatch(batch: QueuedCourse[]): Promise<void> {
  // Sorted so the same set of visible courses always produces the same URL,
  // which is what the API's response cache is keyed on.
  const courseCodes = batch
    .map((queued) => queued.courseCode)
    .sort()
    .join(',');
  try {
    // Two requests rather than one: the course-wide distribution includes
    // sections with no attributed instructor, so it is not the sum of the
    // per-professor rows and cannot be derived from them. About 26% of
    // historical rows have no registrar-named instructor.
    const [coursePage, instructorRows] = await Promise.all([
      courseGradeSummary({ courseCodes, limit: PAGE_SIZE }),
      allCourseInstructorRows(courseCodes),
    ]);

    const grades: Record<string, CourseGrades> = {};
    for (const row of coursePage.data) {
      grades[row.course_code] = {
        course: toDistribution(row),
        byInstructorSlug: {},
        namesBySlug: {},
      };
    }
    for (const row of instructorRows) {
      const courseGrades = grades[row.course_code];
      if (courseGrades === undefined || row.instructor_slug === null || row.instructor_slug === undefined) {
        continue;
      }
      courseGrades.byInstructorSlug[row.instructor_slug] = toDistribution(row);
      courseGrades.namesBySlug[row.instructor_slug] = row.instructor;
    }

    for (const { courseCode } of batch) {
      const courseGrades = grades[courseCode];
      setEntry(
        courseCode,
        courseGrades === undefined ? { status: 'none' } : { status: 'loaded', grades: courseGrades }
      );
    }
  } catch (error) {
    console.error('Error fetching Jupiterp grade data:', error);
    for (const { courseCode } of batch) {
      setEntry(courseCode, { status: 'error' });
    }
  } finally {
    for (const { courseCode, resolve } of batch) {
      inFlight.delete(courseCode);
      resolve();
    }
  }
}

/**
 * Every per-professor row for the given courses. A batch of large courses can
 * exceed one page, so this follows offsets until a short page comes back.
 */
async function allCourseInstructorRows(courseCodes: string): Promise<CourseInstructorGradeSummary[]> {
  const rows: CourseInstructorGradeSummary[] = [];
  for (;;) {
    const page = await courseInstructorGradeSummary({
      courseCodes,
      // A total order, so rows cannot shift between pages.
      sortBy: 'course_code.asc,instructor_id.asc',
      limit: PAGE_SIZE,
      offset: rows.length,
    });
    rows.push(...page.data);
    if (page.data.length < PAGE_SIZE) {
      return rows;
    }
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
