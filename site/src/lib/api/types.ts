/**
 * This file is part of Jupiterp. For terms of use, please see the file
 * called LICENSE at the top level of the Jupiterp source tree (online at
 * https://github.com/atcupps/Jupiterp/LICENSE).
 * Copyright (C) 2026 Andrew Cupps
 *
 * @fileoverview Types for the Jupiterp API's grade and instructor endpoints.
 *
 * These belong in `@jupiterp/jupiterp`, and are specified for it in
 * CHANGES_.md section 9. They live here for now because the package is
 * published from a separate repository and the site cannot reach the grade
 * endpoints at all until it ships -- which makes it the binding constraint on
 * every piece of frontend work. Written to be lifted into the package
 * unchanged when that happens.
 *
 * Field names are snake_case because that is what PostgREST returns and the
 * Go API forwards verbatim. Converting to camelCase here would mean a mapping
 * layer in front of every endpoint for no benefit.
 */

/** The fifteen grade buckets as the database stores and reports them. */
export interface GradeCounts {
  a_plus: number;
  a: number;
  a_minus: number;
  b_plus: number;
  b: number;
  b_minus: number;
  c_plus: number;
  c: number;
  c_minus: number;
  d_plus: number;
  d: number;
  d_minus: number;
  f: number;
  w: number;
  other: number;
}

/**
 * A grade distribution as returned by any of the summary views.
 *
 * Two denominators, and they are not interchangeable:
 *
 *   `graded`  students who received a letter grade (A+ through F). This is
 *             the GPA denominator, and W is NOT in it.
 *   `total`   enrollment as the registrar reported it. Before Fall 2017 this
 *             can exceed the sum of the fifteen buckets, because the older
 *             reports left some students uncategorized. Never use it as a
 *             percentage denominator across eras.
 */
export interface GradeSummary extends GradeCounts {
  total: number;
  graded: number;
  /** Null when nobody in the group received a letter grade. */
  gpa: number | null;
  section_count: number;
}

/** One row of `/v1/grades/summary?groupBy=course`. */
export interface CourseGradeSummary extends GradeSummary {
  course_code: string;
  term_count: number;
  first_term: number;
  last_term: number;
}

/** One row of `/v1/grades/summary?groupBy=term`. */
export interface CourseTermGradeSummary extends GradeSummary {
  course_code: string;
  term: number;
}

/** One row of `/v1/grades/summary?groupBy=instructor` (course x instructor). */
export interface CourseInstructorGradeSummary extends GradeSummary {
  course_code: string;
  instructor_id: number;
  instructor: string;
  instructor_slug: string;
  term_count: number;
  first_term: number;
  last_term: number;
}

/** One row of `/v1/grades/summary?groupBy=instructorOverall`. */
export interface InstructorGradeSummary extends GradeSummary {
  instructor_id: number;
  instructor: string;
  instructor_slug: string;
  course_count: number;
  term_count: number;
  first_term: number;
  last_term: number;
}

/** One row of `/v1/grades/summary?groupBy=instructorTerm`. */
export interface InstructorTermGradeSummary extends GradeSummary {
  instructor_id: number;
  instructor: string;
  instructor_slug: string;
  term: number;
  course_count: number;
}

/** One row of `/v1/grades/terms`. */
export interface GradeTerm {
  term: number;
  section_count: number;
  course_count: number;
  total: number;
  graded: number;
  gpa: number | null;
}

/**
 * An instructor, with the fields added by the PlanetTerp migration.
 *
 * Supersedes `Instructor` from `@jupiterp/jupiterp` v0.8.5, which had only
 * `{ slug, name, average_rating }`.
 *
 * `average_rating` is a number here, not a string. Both this interface and the
 * npm client declared it as a string on the belief that PostgREST returns
 * numerics that way; it does not for this column. `instructors.average_rating`
 * is a Postgres `real` -- see scraper migration 0020, which fixed a cast that
 * assumed otherwise -- so it arrives as a JSON number. The string typing was
 * survivable only because every consumer happened to run it through
 * `parseFloat`, which coerces.
 */
export interface InstructorFull {
  id: number;
  /**
   * Jupiterp's own slug, and the professor page URL segment. This used to be
   * PlanetTerp's slug; that value now lives in `pt_slug`.
   */
  slug: string;
  name: string;

  /** Retained for v0 compatibility. Prefer `combined_rating`. */
  average_rating: number | null;

  /** PlanetTerp's rating, frozen at `pt_snapshot_at` and never updated. */
  pt_average_rating: number | null;
  pt_review_count: number | null;
  pt_snapshot_at: string | null;

  /** Ratings from reviews submitted on Jupiterp. */
  jupiterp_rating: number | null;
  jupiterp_review_count: number;

  /** The blend of the two. See the rating model in CHANGES_.md section 11. */
  combined_rating: number | null;

  first_seen_term: number | null;
  last_seen_term: number | null;
  is_active: boolean;
}

/** A page of results, with the total when the caller asked for one. */
export interface Page<T> {
  data: T[];
  /**
   * Total matching rows, from the `Content-Range` header. Null unless the
   * request set `count: true`.
   */
  total: number | null;
}

/** A published review, as returned by `GET /v1/reviews`. */
export interface Review {
  id: string;
  instructor_id: number;
  instructor_slug: string;
  course_code: string | null;
  term: number | null;
  /** 1-5 in half steps. A decimal, never an integer. */
  rating: number;
  expected_grade: string | null;
  title: string | null;
  body: string | null;
  submitted_at: string;
  edited_at: string | null;
}

/** What the review form sends. */
export interface ReviewSubmission {
  instructor_slug: string;
  course_code?: string;
  term?: number;
  rating: number;
  expected_grade?: string;
  title?: string;
  body?: string;
  email: string;
  captcha_token?: string;
}
