/**
 * This file is part of Jupiterp. For terms of use, please see the file
 * called LICENSE at the top level of the Jupiterp source tree (online at
 * https://github.com/atcupps/Jupiterp/LICENSE).
 *
 *
 * @fileoverview Presentation helpers for the schedule generator: converting
 * between minutes-since-midnight and time-input strings, labelling days,
 * overridden filters, and relaxation hints.
 */

import type { EngineDay, OverriddenFilter, Relaxation } from './types';

/** Days of the week in display order. */
export const ENGINE_DAYS: EngineDay[] = ['M', 'Tu', 'W', 'Th', 'F', 'Sa', 'Su'];

const DAY_LONG: Record<EngineDay, string> = {
  M: 'Monday',
  Tu: 'Tuesday',
  W: 'Wednesday',
  Th: 'Thursday',
  F: 'Friday',
  Sa: 'Saturday',
  Su: 'Sunday',
};

/** Full day name, e.g. "Friday". */
export function engineDayLong(day: EngineDay): string {
  return DAY_LONG[day];
}

/** Format minutes-since-midnight as a 12-hour time, e.g. 570 -> "9:00 AM". */
export function minutesToLabel(minutes: number): string {
  const hour24 = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const period = hour24 < 12 ? 'AM' : 'PM';
  let hour12 = hour24 % 12;
  if (hour12 === 0) {
    hour12 = 12;
  }
  const mm = minute.toString().padStart(2, '0');
  return `${hour12}:${mm} ${period}`;
}

/**
 * Build dropdown options for a time-of-day selector, in minutes since
 * midnight, from `startHour` to `endHour` inclusive at `stepMinutes` spacing.
 */
export function timeSlotOptions(startHour = 7, endHour = 22, stepMinutes = 30): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  for (let m = startHour * 60; m <= endHour * 60; m += stepMinutes) {
    options.push({ value: String(m), label: minutesToLabel(m) });
  }
  return options;
}

/** A short, human-readable label for an overridden per-section filter. */
export function overriddenFilterLabel(filter: OverriddenFilter): string {
  switch (filter) {
    case 'earliestStart':
      return 'starts earlier than your earliest-start time';
    case 'latestEnd':
      return 'ends later than your latest-end time';
    case 'dayOff':
      return 'meets on a day you marked off';
    case 'openSeats':
      return 'has no open seats';
  }
}

/** A short call-to-action describing a single constraint relaxation. */
export function relaxationLabel(relaxation: Relaxation): string {
  switch (relaxation.kind) {
    case 'earliestStart':
      return 'Allow earlier classes';
    case 'latestEnd':
      return 'Allow later classes';
    case 'dayOff':
      return relaxation.day ? `Allow ${engineDayLong(relaxation.day)} classes` : 'Allow classes on a day off';
    case 'openSeats':
      return 'Include full (closed) sections';
    case 'minGap':
      return 'Remove the minimum gap between classes';
    case 'minCredits':
      return 'Allow fewer credits';
  }
}
