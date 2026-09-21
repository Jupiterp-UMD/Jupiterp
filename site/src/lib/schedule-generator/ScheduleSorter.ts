/**
 * This file is part of Jupiterp. For terms of use, please see the file
 * called LICENSE at the top level of the Jupiterp source tree (online at
 * https://github.com/atcupps/Jupiterp/LICENSE).
 *
 *
 * @fileoverview Comparators for ranking generated schedules by a
 * `SortCriterion`. Every criterion has explicit tie-breakers, and unrated
 * schedules always sort below rated ones. Ported from the mobile app's
 * `ScheduleSorter`.
 */

import type { GeneratedSchedule, SortCriterion } from './types';

type Comparator = (a: GeneratedSchedule, b: GeneratedSchedule) => number;

/** Unrated schedules map to -1 so they sort below any rated schedule. */
function ratingOrUnrated(schedule: GeneratedSchedule): number {
  return schedule.metrics.avgInstructorRating ?? -1;
}

/** Ascending comparator on a numeric selector. */
function byAsc(selector: (s: GeneratedSchedule) => number): Comparator {
  return (a, b) => selector(a) - selector(b);
}

/** Descending comparator on a numeric selector. */
function byDesc(selector: (s: GeneratedSchedule) => number): Comparator {
  return (a, b) => selector(b) - selector(a);
}

/** Compose comparators, applying each as a tie-breaker for the previous. */
function chain(...comparators: Comparator[]): Comparator {
  return (a, b) => {
    for (const comparator of comparators) {
      const result = comparator(a, b);
      if (result !== 0) {
        return result;
      }
    }
    return 0;
  };
}

/** Build the comparator for a given sort criterion. */
function comparatorFor(criterion: SortCriterion): Comparator {
  switch (criterion) {
    case 'mostClasses':
      return chain(
        byDesc((s) => s.metrics.sectionCount),
        byDesc(ratingOrUnrated),
        byAsc((s) => s.metrics.totalGapMinutes)
      );
    case 'bestRating':
      return chain(
        byDesc(ratingOrUnrated),
        byAsc((s) => s.metrics.totalGapMinutes),
        byAsc((s) => s.metrics.daysWithClasses)
      );
    case 'mostCompact':
      return chain(
        byAsc((s) => s.metrics.totalGapMinutes),
        byAsc((s) => s.metrics.daysWithClasses),
        byDesc(ratingOrUnrated)
      );
    case 'fewestDays':
      return chain(
        byAsc((s) => s.metrics.daysWithClasses),
        byAsc((s) => s.metrics.totalGapMinutes),
        byDesc(ratingOrUnrated)
      );
    case 'latestStart':
      // No timed meetings at all is the latest possible start.
      return chain(
        byDesc((s) => s.metrics.earliestStartMinutes ?? Number.MAX_SAFE_INTEGER),
        byDesc(ratingOrUnrated)
      );
    case 'earliestEnd':
      // No timed meetings means there is no "finish" to rank; sort last.
      return chain(
        byAsc((s) => s.metrics.latestEndMinutes ?? Number.MAX_SAFE_INTEGER),
        byDesc(ratingOrUnrated)
      );
    case 'mostCredits':
      return chain(
        byDesc((s) => s.metrics.maxCredits),
        byDesc((s) => s.metrics.minCredits),
        byDesc(ratingOrUnrated)
      );
  }
}

/**
 * Return a new array of schedules sorted by the given criterion. The input
 * array is not mutated.
 */
export function sortedByCriterion(schedules: GeneratedSchedule[], criterion: SortCriterion): GeneratedSchedule[] {
  return [...schedules].sort(comparatorFor(criterion));
}
