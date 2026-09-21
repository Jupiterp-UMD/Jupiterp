/**
 * This file is part of Jupiterp. For terms of use, please see the file
 * called LICENSE at the top level of the Jupiterp source tree (online at
 * https://github.com/atcupps/Jupiterp/LICENSE).
 *
 *
 * @fileoverview Input and output types for the automatic schedule generator.
 * These are the web analogs of the mobile app's scheduler models. All times
 * are in minutes since midnight (e.g. 9:30 AM = 570) so that conflict and gap
 * arithmetic is exact integer math.
 */

import type { Course } from '@jupiterp/jupiterp';
import type { ScheduleSelection } from '../../types';

/**
 * The seven distinct days of the week a class can meet on. Unlike the
 * planner's `Day` enum (which collapses Saturday and Sunday into a single
 * `Other` bucket for rendering), the generator keeps all seven days distinct
 * so that, for example, a Saturday class never conflicts with a Sunday one.
 */
export type EngineDay = 'M' | 'Tu' | 'W' | 'Th' | 'F' | 'Sa' | 'Su';

/**
 * Hard constraints a generated schedule must satisfy. Times are minutes since
 * midnight (9:30 AM = 570).
 */
export interface HardConstraints {
  earliestStartMinutes: number | null;
  latestEndMinutes: number | null;
  daysOff: Set<EngineDay>;
  onlyOpenSeats: boolean;
  minGapMinutes: number;
  minCredits: number | null;
}

/**
 * @returns A `HardConstraints` with sensible defaults (only open sections,
 * no time window, no days off, no gap or credit floor).
 */
export function defaultConstraints(): HardConstraints {
  return {
    earliestStartMinutes: null,
    latestEndMinutes: null,
    daysOff: new Set<EngineDay>(),
    onlyOpenSeats: true,
    minGapMinutes: 0,
    minCredits: null,
  };
}

/**
 * A way to narrow a course to a single section or a single professor,
 * overriding the per-section filters.
 */
export type SectionPin =
  { kind: 'none' } | { kind: 'bySection'; sectionCode: string } | { kind: 'byInstructor'; name: string };

/**
 * One course to schedule, plus how strictly to place it. Required courses
 * appear in every schedule; optional ones are included only when they fit.
 */
export interface CourseRequest {
  course: Course;
  required: boolean;
  pin: SectionPin;
}

/** A per-section filter that a pinned section was kept despite violating. */
export type OverriddenFilter = 'earliestStart' | 'latestEnd' | 'dayOff' | 'openSeats';

/** Raised when a pinned section was kept despite violating active filters. */
export interface PinNotice {
  courseCode: string;
  sectionCode: string;
  overriddenFilters: OverriddenFilter[];
}

/**
 * Computed once per schedule so re-sorting never regenerates. Time metrics
 * are null when all meetings are async/TBA.
 */
export interface ScheduleMetrics {
  avgInstructorRating: number | null;
  ratedSectionCount: number;
  sectionCount: number;
  minCredits: number;
  maxCredits: number;
  daysWithClasses: number;
  totalGapMinutes: number;
  earliestStartMinutes: number | null;
  latestEndMinutes: number | null;
  minOpenSeats: number;
}

/** A generated schedule: planner selections plus precomputed metrics. */
export interface GeneratedSchedule {
  selections: ScheduleSelection[];
  metrics: ScheduleMetrics;
}

/** The full result of a generation run. */
export interface GenerationResult {
  /** Found schedules (already capped at `maxResults`). */
  schedules: GeneratedSchedule[];

  /** True if a result/node cap was hit; more schedules may exist. */
  truncated: boolean;

  /** Required courses that made generation impossible. */
  coursesWithNoValidSections: string[];

  /** Pins forced in despite violating active filters. */
  pinNotices: PinNotice[];
}

/** A single constraint loosened from a `HardConstraints`. */
export type RelaxationKind = 'earliestStart' | 'latestEnd' | 'dayOff' | 'openSeats' | 'minGap' | 'minCredits';

/** A constraint set differing from the original by one loosened restriction. */
export interface Relaxation {
  kind: RelaxationKind;
  day: EngineDay | null;
  constraints: HardConstraints;
}

/** The criteria by which generated schedules can be ranked. */
export type SortCriterion =
  'mostClasses' | 'bestRating' | 'mostCompact' | 'fewestDays' | 'latestStart' | 'earliestEnd' | 'mostCredits';

/** Human-readable labels for each `SortCriterion`. */
export const SORT_CRITERION_LABELS: Record<SortCriterion, string> = {
  mostClasses: 'Most classes',
  bestRating: 'Top rated',
  mostCompact: 'Fewest gaps',
  fewestDays: 'Fewest days',
  latestStart: 'Latest start',
  earliestEnd: 'Earliest finish',
  mostCredits: 'Most credits',
};

/** The ordered list of sort criteria, for rendering a sort selector. */
export const SORT_CRITERIA: SortCriterion[] = [
  'bestRating',
  'mostClasses',
  'mostCompact',
  'fewestDays',
  'latestStart',
  'earliestEnd',
  'mostCredits',
];
