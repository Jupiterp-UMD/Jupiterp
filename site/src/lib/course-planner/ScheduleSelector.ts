/**
 * This file is part of Jupiterp. For terms of use, please see the file
 * called LICENSE at the top level of the Jupiterp source tree (online at
 * https://github.com/atcupps/Jupiterp/LICENSE).
 *
 *
 * @fileoverview Functions for switching between schedules. Many functions
 * are in `ScheduleSelector.svelte` or `ScheduleOptionsDropdown.svelte`,
 * but in this file there are some that are used by both.
 */

import { NonselectedScheduleStore } from '../../stores/CoursePlannerStores';
import type { StoredSchedule } from '../../types';

/**
 * Ensure that a schedule name is unique by appending another string if
 * necessary.
 *
 * @param schedules The schedules to compare `defaultName` with
 * @param uniquifier The string to append to the beginning
 * @returns A unique schedule name based on `defaultname`
 */
export function uniqueScheduleName(defaultName: string, uniquifier: string, schedules: StoredSchedule[]): string {
  const scheduleNames: Set<string> = new Set<string>();
  schedules.forEach((elt) => {
    scheduleNames.add(elt.scheduleName);
  });
  if (scheduleNames.has(defaultName)) {
    let curName = defaultName;
    while (scheduleNames.has(curName)) {
      curName = uniquifier + curName;
    }
    return curName;
  } else {
    return defaultName;
  }
}

/**
 * The first numbered name of the form `base`, `base 2`, `base 3`, … not taken
 * by an existing schedule. With `alwaysNumber`, counting starts at `base 1`
 * and the bare `base` is never used.
 *
 * @param base The name to uniquify, e.g. "Shared schedule"
 * @param existing The schedules whose names are already taken
 * @param alwaysNumber Whether the first candidate is `base 1` instead of `base`
 */
export function uniqueNumberedName(base: string, existing: StoredSchedule[], alwaysNumber: boolean = false): string {
  const taken = new Set(existing.map((s) => s.scheduleName));
  if (!alwaysNumber && !taken.has(base)) {
    return base;
  }
  let n = alwaysNumber ? 1 : 2;
  while (taken.has(`${base} ${n}`)) {
    n++;
  }
  return `${base} ${n}`;
}

/**
 * Delete a specific schedule from an array of non-selected schedules.
 * @param schedule The schedule to be deleted
 * @param nonselectedSchedules The array from which to delete `schedule`.
 * Because the actual value being taken as a parameter is a pointer to the
 * array, this function will cause a side effect in the `nonselectedSchedules`
 * array used as an argument to this function.
 */
export function deleteNonselectedSchedule(schedule: StoredSchedule, nonselectedSchedules: StoredSchedule[]) {
  const index = nonselectedSchedules.indexOf(schedule);
  if (index === -1) {
    // This should not be possible
    console.log('Could not find schedule: ' + schedule.scheduleName);
  } else {
    nonselectedSchedules.splice(index, 1);
    NonselectedScheduleStore.set(nonselectedSchedules);
  }
}
