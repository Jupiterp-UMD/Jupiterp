/**
 * This file is part of Jupiterp. For terms of use, please see the file
 * called LICENSE at the top level of the Jupiterp source tree (online at
 * https://github.com/atcupps/Jupiterp/LICENSE).
 *
 *
 * @fileoverview Layout and gesture rules for the preview of a generated
 * schedule, kept out of the components so they can be unit tested.
 */

import { getClasstimeBounds } from '../course-planner/Schedule';
import type { Schedule } from '../../types';

/** The first and last hour (0-24) drawn by the preview's week grid. */
export interface HourWindow {
  start: number;
  end: number;
}

/** The window shown for a schedule with no timed meetings. */
const EMPTY_WINDOW: HourWindow = { start: 8, end: 16 };

/** Shorter days are widened towards this many hours. */
const TARGET_HOURS = 8;

/**
 * The hours the preview's week grid shows for `schedule`: whole hours around
 * its classes, widened evenly towards eight hours. This is the window the
 * planner's schedule computes, so a schedule shows the same hours in the
 * preview as it will once applied.
 */
export function previewHourWindow(schedule: Schedule): HourWindow {
  const { earliestStart, latestEnd } = getClasstimeBounds(schedule);
  if (earliestStart === Number.MAX_SAFE_INTEGER) {
    return { ...EMPTY_WINDOW };
  }
  const missing = TARGET_HOURS - (latestEnd - earliestStart);
  if (missing <= 0) {
    return { start: earliestStart, end: latestEnd };
  }
  // The planner adds the same whole number of hours to both ends, so an odd
  // shortfall leaves the window one hour short of the target.
  const padding = Math.floor(missing / 2);
  return { start: earliestStart - padding, end: latestEnd + padding };
}

/** The longest day the week grid fits into the space it is given. */
const MAX_FITTED_HOURS = 10;

/**
 * How tall the week grid is drawn for `window`, as a percentage of the space
 * available to it. As in the planner's schedule, a day of up to ten hours is
 * fitted to that space; a longer day keeps the ten-hour scale, so the grid
 * grows past the space and scrolls instead of squeezing its classes.
 */
export function weekGridHeightPercent(window: HourWindow): number {
  return Math.max(1, (window.end - window.start) / MAX_FITTED_HOURS) * 100;
}

/** An hour of the day (0-24) as a grid label, e.g. `13` is "1 PM". */
export function formatHour(hour: number): string {
  const inDay = ((hour % 24) + 24) % 24;
  if (inDay === 0) {
    return '12 AM';
  }
  if (inDay < 12) {
    return inDay + ' AM';
  }
  return (inDay === 12 ? 12 : inDay - 12) + ' PM';
}

/** A touch must travel at least this far sideways to count as a swipe. */
const SWIPE_MIN_DISTANCE_PX = 50;

/** A swipe may drift at most this far vertically per pixel travelled sideways. */
const SWIPE_MAX_SLOPE = 0.6;

/**
 * Which way a touch that moved by (`dx`, `dy`) pixels steps through the
 * generated schedules: `1` to the next one (a swipe left, which brings it in
 * from the right), `-1` to the previous one, or `null` when the movement is
 * too short or too vertical to be a swipe, such as a tap or a scroll.
 */
export function swipeStep(dx: number, dy: number): 1 | -1 | null {
  if (Math.abs(dx) < SWIPE_MIN_DISTANCE_PX || Math.abs(dy) > Math.abs(dx) * SWIPE_MAX_SLOPE) {
    return null;
  }
  return dx < 0 ? 1 : -1;
}
