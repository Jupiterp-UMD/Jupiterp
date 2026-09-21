/**
 * This file is part of Jupiterp. For terms of use, please see the file
 * called LICENSE at the top level of the Jupiterp source tree (online at
 * https://github.com/atcupps/Jupiterp/LICENSE).
 * Copyright (C) 2026 Andrew Cupps
 *
 * @fileoverview Grade and instructor calls against the Jupiterp API.
 *
 * `@jupiterp/jupiterp` v0.8.5 has no grade methods, so the endpoints the API
 * already serves are unreachable from the site. This module fills that gap and
 * is written to be lifted into the package unchanged; see `types.ts`.
 *
 * Every function takes an optional `fetch`. SvelteKit passes its own during
 * SSR so that server-side requests are traced and relative URLs resolve, and
 * `+page.ts` load functions are required to use it. Defaulting to the global
 * keeps client-side callers from having to care.
 */

import { client } from '../client';
import { normalizeName } from '../professor/Names';
import type {
  CourseGradeSummary,
  CourseInstructorGradeSummary,
  CourseTermGradeSummary,
  GradeTerm,
  InstructorFull,
  InstructorGradeSummary,
  InstructorTermGradeSummary,
  Page,
  Review,
  ReviewSubmission,
} from './types';

type Fetch = typeof globalThis.fetch;

/** Thrown for any non-2xx response, so callers get one failure mode. */
export class JupiterpApiError extends Error {
  constructor(
    readonly status: number,
    readonly path: string,
    body: string
  ) {
    super(`Jupiterp API ${status} for ${path}${body ? `: ${body}` : ''}`);
    this.name = 'JupiterpApiError';
  }
}

async function get<T>(path: string, params: URLSearchParams, fetchFn: Fetch = fetch): Promise<Page<T>> {
  const url = `${client.dbUrl}${path}?${params.toString()}`;
  const response = await fetchFn(url);

  if (!response.ok) {
    throw new JupiterpApiError(response.status, path, await response.text().catch(() => ''));
  }

  return {
    data: (await response.json()) as T[],
    total: parseContentRange(response.headers.get('Content-Range')),
  };
}

/**
 * Read the total out of a PostgREST `Content-Range` header.
 *
 * The format is `0-49/4812`. The total is `*` when the request
 * did not ask for an exact count, which is not an error -- it means the
 * caller did not pay for one.
 */
export function parseContentRange(header: string | null): number | null {
  if (header === null) {
    return null;
  }
  const total = header.split('/')[1];
  if (total === undefined || total === '*') {
    return null;
  }
  const parsed = Number.parseInt(total, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function build(entries: Record<string, string | number | boolean | undefined>): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(entries)) {
    if (value !== undefined && value !== '' && value !== false) {
      params.set(key, String(value));
    }
  }
  return params;
}

/* ============================== grades ================================= */

export interface CourseGradesConfig {
  /** Comma-separated course codes. */
  courseCodes: string;
  minStudents?: number;
  sortBy?: string;
  limit?: number;
}

/** Course-wide grade distributions, one row per course. */
export async function courseGradeSummary(cfg: CourseGradesConfig, fetchFn?: Fetch): Promise<Page<CourseGradeSummary>> {
  return get<CourseGradeSummary>(
    '/v1/grades/summary',
    build({
      groupBy: 'course',
      courseCodes: cfg.courseCodes,
      minStudents: cfg.minStudents,
      sortBy: cfg.sortBy,
      limit: cfg.limit ?? 500,
    }),
    fetchFn
  );
}

export interface CourseInstructorGradesConfig extends CourseGradesConfig {
  /**
   * Also count sections whose instructor was carried across lecture groups or
   * into a differently-coded offering. Wider coverage, lower confidence; the
   * professor page exposes this as an explicit opt-in toggle.
   */
  includeCarried?: boolean;
}

/** Per-professor grade distributions within one or more courses. */
export async function courseInstructorGradeSummary(
  cfg: CourseInstructorGradesConfig,
  fetchFn?: Fetch
): Promise<Page<CourseInstructorGradeSummary>> {
  return get<CourseInstructorGradeSummary>(
    '/v1/grades/summary',
    build({
      groupBy: 'instructor',
      includeCarried: cfg.includeCarried,
      courseCodes: cfg.courseCodes,
      minStudents: cfg.minStudents,
      sortBy: cfg.sortBy,
      limit: cfg.limit ?? 500,
    }),
    fetchFn
  );
}

/**
 * One professor's grades across every course they have taught.
 *
 * Filtered by slug rather than name on purpose: the same professor is spelled
 * several ways across the registrar exports, Testudo, and PlanetTerp, and an
 * exact name match silently returns nothing for a large share of instructors.
 */
export async function instructorGradeSummary(
  instructorSlug: string,
  fetchFn?: Fetch
): Promise<InstructorGradeSummary | null> {
  const page = await get<InstructorGradeSummary>(
    '/v1/grades/summary',
    build({ groupBy: 'instructorOverall', instructorSlug, limit: 1 }),
    fetchFn
  );
  return page.data[0] ?? null;
}

/** One professor's grades per term, oldest first, for the trend chart. */
export async function instructorTermGradeSummary(
  instructorSlug: string,
  fetchFn?: Fetch
): Promise<Page<InstructorTermGradeSummary>> {
  return get<InstructorTermGradeSummary>(
    '/v1/grades/summary',
    build({
      groupBy: 'instructorTerm',
      instructorSlug,
      sortBy: 'term.asc',
      limit: 200,
    }),
    fetchFn
  );
}

/** One professor's grades per course, largest first. */
export async function instructorCourseGradeSummary(
  instructorSlug: string,
  options: { includeCarried?: boolean } = {},
  fetchFn?: Fetch
): Promise<Page<CourseInstructorGradeSummary>> {
  return get<CourseInstructorGradeSummary>(
    '/v1/grades/summary',
    build({
      groupBy: 'instructor',
      instructorSlug,
      includeCarried: options.includeCarried,
      sortBy: 'graded.desc',
      limit: 500,
    }),
    fetchFn
  );
}

/** Grade distributions for one course, per term. */
export async function courseTermGradeSummary(
  courseCodes: string,
  fetchFn?: Fetch
): Promise<Page<CourseTermGradeSummary>> {
  return get<CourseTermGradeSummary>(
    '/v1/grades/summary',
    build({ groupBy: 'term', courseCodes, sortBy: 'term.asc', limit: 200 }),
    fetchFn
  );
}

/** Every term for which grade data exists, newest first. */
export async function gradeTerms(fetchFn?: Fetch): Promise<Page<GradeTerm>> {
  return get<GradeTerm>('/v1/grades/terms', build({}), fetchFn);
}

/* ============================ instructors =============================== */

export interface InstructorSearchConfig {
  /** Case-insensitive substring match, normalized server-side. */
  nameSearch?: string;
  activeOnly?: boolean;
  sortBy?: string;
  limit?: number;
  offset?: number;
  /** Ask for a total row count in `Content-Range`. Costs an extra aggregate. */
  count?: boolean;
}

/**
 * Search instructors by partial name, server-side.
 *
 * The planner previously paged through every active instructor into a
 * client-side record on each page load -- several hundred KB, and untenable
 * once the directory covers the full historical instructor set.
 */
export async function searchInstructors(cfg: InstructorSearchConfig, fetchFn?: Fetch): Promise<Page<InstructorFull>> {
  return get<InstructorFull>(
    '/v1/instructors',
    build({
      // The server matches against a normalized column, so an
      // un-normalized query finds nothing: "O'Brien" against the stored
      // "o brien" fails on the apostrophe.
      nameSearch: normalizeName(cfg.nameSearch) ?? undefined,
      activeOnly: cfg.activeOnly,
      sortBy: cfg.sortBy,
      limit: cfg.limit ?? 50,
      offset: cfg.offset,
      count: cfg.count,
    }),
    fetchFn
  );
}

/**
 * Course codes this professor is scheduled to teach right now.
 *
 * Filtered by `instructorSlug`, not by name: the API resolves each section's
 * instructors through the alias table, so this finds a professor whose Testudo
 * spelling differs from their canonical record.
 *
 * Distinct from the courses on a professor page, which come from grade data
 * and are therefore always at least a term behind. A student writing a review
 * is usually writing about the course they are in now, which by definition has
 * no grades yet.
 */
export async function currentCourseCodesFor(slug: string, fetchFn?: Fetch): Promise<string[]> {
  const page = await get<{ course_code: string }>('/v1/sections', build({ instructorSlug: slug, limit: 500 }), fetchFn);
  return [...new Set(page.data.map((row) => row.course_code))].sort();
}

/** Fetch one instructor by slug, or null when there is no such professor. */
export async function instructorBySlug(slug: string, fetchFn?: Fetch): Promise<InstructorFull | null> {
  const page = await get<InstructorFull>('/v1/instructors', build({ instructorSlugs: slug, limit: 1 }), fetchFn);
  return page.data[0] ?? null;
}

export { normalizeName as normalizeSearchTerm };

/* =============================== reviews ================================ */

/**
 * Approved reviews for one professor.
 *
 * Served from a database view that cannot express an unapproved row and does
 * not contain the submitter's identity columns at all, so there is no filter
 * here that could be forgotten.
 */
export async function reviewsFor(
  instructorSlug: string,
  options: { courseCode?: string; limit?: number; offset?: number } = {},
  fetchFn?: Fetch
): Promise<Page<Review>> {
  return get<Review>(
    '/v1/reviews',
    build({
      instructorSlug,
      courseCode: options.courseCode,
      limit: options.limit ?? 25,
      offset: options.offset,
    }),
    fetchFn
  );
}

/** The API's reply to a submission, or to a validation failure. */
export interface SubmitResult {
  ok: boolean;
  /** Present on failure. Safe to show: the API writes these for humans. */
  error?: string;
  /** True when the caller should wait and retry rather than change anything. */
  rateLimited?: boolean;
}

/**
 * Submit a review.
 *
 * The API answers identically whether or not this address has already reviewed
 * this professor, so a caller cannot use it to find out. Do not try to
 * interpret the response as anything finer than "accepted".
 */
export async function submitReview(review: ReviewSubmission, fetchFn: Fetch = fetch): Promise<SubmitResult> {
  const response = await fetchFn(`${client.dbUrl}/v1/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(review),
  });

  if (response.ok) {
    return { ok: true };
  }
  const payload = await response.json().catch(() => ({ error: 'Something went wrong.' }));
  return {
    ok: false,
    error: payload.error ?? 'Something went wrong.',
    rateLimited: response.status === 429,
  };
}

/** Confirm an emailed verification link. Returns the manage key, once. */
export async function verifyReview(
  token: string,
  fetchFn: Fetch = fetch
): Promise<{ ok: boolean; manageKey?: string; message: string }> {
  const response = await fetchFn(`${client.dbUrl}/v1/reviews/verify/${encodeURIComponent(token)}`);
  const payload = await response.json().catch(() => ({}));
  return {
    ok: response.ok,
    manageKey: payload.manage_key,
    message: payload.message ?? payload.error ?? 'Something went wrong.',
  };
}

/** The review a manage key controls, as the withdrawal page needs to show it. */
export interface ManagedReview {
  id: string;
  instructor: string;
  instructor_slug: string;
  course_code: string | null;
  term: number | null;
  rating: number;
  title: string | null;
  body: string | null;
  status: string;
  submitted_at: string;
  /** False once there is nothing left to retract. */
  withdrawable: boolean;
}

/**
 * Look up the review a manage key controls.
 *
 * The key alone identifies it. A reviewer is never told their review's id — not
 * in the verification response, not in the email — so a withdrawal flow that
 * needed one could not be completed by the only person entitled to use it.
 *
 * Returns null for a key the server does not recognise, which is the same
 * answer it gives for a key that is simply wrong.
 */
export async function manageReview(manageKey: string, fetchFn: Fetch = fetch): Promise<ManagedReview | null> {
  const response = await fetchFn(`${client.dbUrl}/v1/reviews/manage`, {
    headers: { Authorization: `Bearer ${manageKey}` },
  });
  if (!response.ok) {
    return null;
  }
  return (await response.json()) as ManagedReview;
}

/** Withdraw a review using its manage key. */
export async function withdrawReview(id: string, manageKey: string, fetchFn: Fetch = fetch): Promise<boolean> {
  const response = await fetchFn(`${client.dbUrl}/v1/reviews/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${manageKey}` },
  });
  return response.ok;
}

/** Report a published review for breaching the content policy. */
export async function reportReview(
  id: string,
  reason: string,
  detail: string,
  fetchFn: Fetch = fetch
): Promise<boolean> {
  const response = await fetchFn(`${client.dbUrl}/v1/reviews/${encodeURIComponent(id)}/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason, detail }),
  });
  return response.ok;
}
