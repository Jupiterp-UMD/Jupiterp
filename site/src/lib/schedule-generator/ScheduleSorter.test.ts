/**
 * This file is part of Jupiterp. For terms of use, please see the file
 * called LICENSE at the top level of the Jupiterp source tree (online at
 * https://github.com/atcupps/Jupiterp/LICENSE).
 *
 *
 * @fileoverview Unit tests for schedule ranking.
 */

import { describe, expect, test } from '@jest/globals';
import { sortedByCriterion } from './ScheduleSorter';
import type { GeneratedSchedule, ScheduleMetrics } from './types';

/** Build a schedule with only the metrics fields a test cares about. */
function withMetrics(metrics: Partial<ScheduleMetrics>): GeneratedSchedule {
  return {
    selections: [],
    metrics: {
      avgInstructorRating: null,
      ratedSectionCount: 0,
      sectionCount: 0,
      minCredits: 0,
      maxCredits: 0,
      daysWithClasses: 0,
      totalGapMinutes: 0,
      earliestStartMinutes: null,
      latestEndMinutes: null,
      minOpenSeats: 0,
      ...metrics,
    },
  };
}

describe('sortedByCriterion', () => {
  test('most classes sorts by section count descending', () => {
    const few = withMetrics({ sectionCount: 2 });
    const many = withMetrics({ sectionCount: 5 });
    const sorted = sortedByCriterion([few, many], 'mostClasses');
    expect(sorted[0]).toBe(many);
  });

  test('best rating sorts descending with unrated last', () => {
    const low = withMetrics({ avgInstructorRating: 3 });
    const high = withMetrics({ avgInstructorRating: 4.5 });
    const unrated = withMetrics({ avgInstructorRating: null });
    const sorted = sortedByCriterion([low, unrated, high], 'bestRating');
    expect(sorted).toEqual([high, low, unrated]);
  });

  test('most compact sorts by gap minutes ascending', () => {
    const gappy = withMetrics({ totalGapMinutes: 200 });
    const tight = withMetrics({ totalGapMinutes: 30 });
    const sorted = sortedByCriterion([gappy, tight], 'mostCompact');
    expect(sorted[0]).toBe(tight);
  });

  test('fewest days sorts by days with classes ascending', () => {
    const five = withMetrics({ daysWithClasses: 5 });
    const three = withMetrics({ daysWithClasses: 3 });
    const sorted = sortedByCriterion([five, three], 'fewestDays');
    expect(sorted[0]).toBe(three);
  });

  test('latest start puts untimed first', () => {
    const early = withMetrics({ earliestStartMinutes: 8 * 60 });
    const late = withMetrics({ earliestStartMinutes: 13 * 60 });
    const untimed = withMetrics({ earliestStartMinutes: null });
    const sorted = sortedByCriterion([early, late, untimed], 'latestStart');
    expect(sorted[0]).toBe(untimed);
    expect(sorted[1]).toBe(late);
  });

  test('earliest end sorts by latest end ascending', () => {
    const late = withMetrics({ latestEndMinutes: 18 * 60 });
    const early = withMetrics({ latestEndMinutes: 14 * 60 });
    const sorted = sortedByCriterion([late, early], 'earliestEnd');
    expect(sorted[0]).toBe(early);
  });

  test('earliest end puts untimed last', () => {
    const timed = withMetrics({ latestEndMinutes: 14 * 60 });
    const untimed = withMetrics({ latestEndMinutes: null });
    const sorted = sortedByCriterion([untimed, timed], 'earliestEnd');
    expect(sorted).toEqual([timed, untimed]);
  });

  test('most credits sorts by max credits descending', () => {
    const light = withMetrics({ maxCredits: 12 });
    const heavy = withMetrics({ maxCredits: 17 });
    const sorted = sortedByCriterion([light, heavy], 'mostCredits');
    expect(sorted[0]).toBe(heavy);
  });

  test('does not mutate the input array', () => {
    const a = withMetrics({ sectionCount: 1 });
    const b = withMetrics({ sectionCount: 2 });
    const input = [a, b];
    sortedByCriterion(input, 'mostClasses');
    expect(input).toEqual([a, b]);
  });
});
