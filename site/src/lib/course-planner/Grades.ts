/**
 * This file is part of Jupiterp. For terms of use, please see the file
 * called LICENSE at the top level of the Jupiterp source tree (online at
 * https://github.com/atcupps/Jupiterp/LICENSE).
 * Copyright (C) 2026 Andrew Cupps
 *
 * @fileoverview Shaping and formatting for grade distributions.
 *
 * Grade data comes from UMD's Office of the Registrar, obtained by MPIA
 * request, and is aggregated by the database. This module used to fetch raw
 * per-section records from PlanetTerp and sum them in the browser; that
 * aggregation is gone, along with its GPA formula.
 *
 * ## Why the GPA formula changed
 *
 * There were two of them, and they disagreed. The client-side
 * `gpaFromLetters()` counted withdrawals in the denominator with weight zero;
 * the database's `umd_gpa()` excludes them. Both comments cited PlanetTerp as
 * their source, so at most one was right.
 *
 * The gap is not a rounding difference. For a 100-student course with 90
 * letter grades averaging 3.00 and 10 withdrawals, excluding W gives 3.00 and
 * including it gives 2.70 -- and the gap is widest in high-withdrawal courses,
 * which are exactly the hard ones students look up. Shipping both would have
 * put two different numbers for the same course on screen at once.
 *
 * The database is right, so the site now takes `gpa` from the API and does not
 * compute one. A W does not appear in a transcript GPA, which is what students
 * are comparing against. Withdrawals are still shown, as their own bar, where
 * a 20% withdrawal rate is a signal in its own right rather than something
 * blended into an average.
 *
 * ## Two denominators
 *
 * They are not interchangeable, and the popover says which is which:
 *
 *   GPA         over `graded`     -- letter grades only, no W
 *   Bar percent over `graded + w` -- so the bars sum to 100% and W is visible
 *
 * Neither is `total`. Before Fall 2017 the registrar's total includes students
 * whose outcome was never categorized, so it is not comparable across eras.
 */

import type { GradeSummary } from '../api/types';

export type LetterGrade =
  'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D+' | 'D' | 'D-' | 'F' | 'W' | 'Other';

/** Coarse buckets used for the grade distribution bars */
export type GradeBucket = 'A' | 'B' | 'C' | 'D' | 'F' | 'W';

/** Counts of students per letter grade */
export type LetterCounts = Record<LetterGrade, number>;

/** Tier used to color-code average GPAs */
/**
 * A grade distribution ready to render.
 *
 * `gpa` comes from the database and is never recomputed here.
 */
export interface GradeDistribution {
  /** Counts per letter grade */
  letters: LetterCounts;
  /** Coarse counts; e.g. bucket 'A' = A+ + A + A- */
  buckets: Record<GradeBucket, number>;
  /** Students who received a letter grade. The GPA denominator; excludes W. */
  graded: number;
  /** `graded + w`. The denominator for the bar percentages. */
  barTotal: number;
  /** Enrollment as reported. Not a percentage denominator; see the note above. */
  total: number;
  otherCount: number;
  /** Average GPA on the UMD 4.0 scale, or null when nobody got a letter grade */
  gpa: number | null;
  /** Term codes, as `YYYYMM` numbers; null when the source carries no range */
  firstTerm: number | null;
  lastTerm: number | null;
  /** How many sections this distribution sums over */
  sectionCount: number;
}

/** Letters belonging to each bucket, ordered best grade first */
export const BUCKET_LETTERS: Record<GradeBucket, LetterGrade[]> = {
  A: ['A+', 'A', 'A-'],
  B: ['B+', 'B', 'B-'],
  C: ['C+', 'C', 'C-'],
  D: ['D+', 'D', 'D-'],
  F: ['F'],
  W: ['W'],
};

/** Ordered buckets for rendering distribution bars */
export const GRADE_BUCKETS: GradeBucket[] = ['A', 'B', 'C', 'D', 'F', 'W'];

/**
 * Below this many graded students, a GPA is noise rather than signal.
 *
 * A three-student section with a 4.0 says nothing about a course. Figures
 * under this threshold are shown as a "limited data" state instead of a
 * number, so the page does not present a confident-looking average built on
 * almost nothing.
 */
export const MIN_GRADED_FOR_GPA = 20;

/**
 * Map an API grade summary onto the render shape.
 *
 * The API returns the fifteen buckets in snake_case exactly as the database
 * stores them, so this is a rename plus the two derived totals -- there is no
 * summing left to do.
 */
export function toDistribution(summary: GradeSummary): GradeDistribution {
  const letters: LetterCounts = {
    'A+': summary.a_plus ?? 0,
    A: summary.a ?? 0,
    'A-': summary.a_minus ?? 0,
    'B+': summary.b_plus ?? 0,
    B: summary.b ?? 0,
    'B-': summary.b_minus ?? 0,
    'C+': summary.c_plus ?? 0,
    C: summary.c ?? 0,
    'C-': summary.c_minus ?? 0,
    'D+': summary.d_plus ?? 0,
    D: summary.d ?? 0,
    'D-': summary.d_minus ?? 0,
    F: summary.f ?? 0,
    W: summary.w ?? 0,
    Other: summary.other ?? 0,
  };

  const buckets = {} as Record<GradeBucket, number>;
  for (const bucket of GRADE_BUCKETS) {
    buckets[bucket] = BUCKET_LETTERS[bucket].reduce((sum, letter) => sum + letters[letter], 0);
  }

  const graded = summary.graded ?? 0;

  const withTerms = summary as GradeSummary & {
    first_term?: number;
    last_term?: number;
    term?: number;
  };

  return {
    letters,
    buckets,
    graded,
    barTotal: graded + letters.W,
    total: summary.total ?? 0,
    otherCount: letters.Other,
    // Taken from the database, never computed here. See the note above.
    gpa: summary.gpa === null || summary.gpa === undefined ? null : Number(summary.gpa),
    firstTerm: withTerms.first_term ?? withTerms.term ?? null,
    lastTerm: withTerms.last_term ?? withTerms.term ?? null,
    sectionCount: summary.section_count ?? 0,
  };
}

/**
 * Format a term code as a human-readable string.
 * @param code A term code such as 201801, as a number or string
 * @returns e.g. 'Spring 2018'; returns the input unchanged if malformed
 */
export function formatSemester(code: string | number): string {
  const text = String(code);
  if (!/^\d{6}$/.test(text)) {
    return text;
  }
  const year = text.slice(0, 4);
  const seasons: Record<string, string> = {
    '01': 'Spring',
    '05': 'Summer',
    '08': 'Fall',
    '12': 'Winter',
  };
  const season = seasons[text.slice(4)];
  if (season === undefined) {
    return text;
  }
  return `${season} ${year}`;
}

/**
 * Format the span a distribution covers, e.g. 'Fall 2016 – Spring 2026'.
 * @returns null when the distribution carries no term range
 */
export function formatSemesterRange(dist: GradeDistribution): string | null {
  if (dist.firstTerm === null || dist.lastTerm === null) {
    return null;
  }
  if (dist.firstTerm === dist.lastTerm) {
    return formatSemester(dist.firstTerm);
  }
  return `${formatSemester(dist.firstTerm)} – ${formatSemester(dist.lastTerm)}`;
}

/**
 * Whether a distribution has enough graded students to show a GPA.
 *
 * The alternative is presenting a confident-looking 4.00 computed from three
 * students, which is worse than showing nothing.
 */
export function hasEnoughForGpa(dist: GradeDistribution): boolean {
  return dist.gpa !== null && dist.graded >= MIN_GRADED_FOR_GPA;
}

/**
 * Format a bucket's share of students as a whole-number percentage.
 *
 * Over `graded + w`, so the six bars sum to 100% and withdrawals are visible
 * as their own share. 'Other' is excluded: it is uncategorized outcomes rather
 * than a grade, and including it would make the bars sum to less than 100 for
 * reasons no reader could infer.
 *
 * @returns e.g. '62', or '<1' for nonzero counts that round to 0
 */
export function bucketPercent(dist: GradeDistribution, bucket: GradeBucket): string {
  if (dist.barTotal === 0) {
    return '0';
  }
  const count = dist.buckets[bucket];
  const percent = Math.round((count / dist.barTotal) * 100);
  if (percent === 0 && count > 0) {
    return '<1';
  }
  return percent.toString();
}
