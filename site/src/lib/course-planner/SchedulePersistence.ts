/**
 * This file is part of Jupiterp. For terms of use, please see the file
 * called LICENSE at the top level of the Jupiterp source tree (online at
 * https://github.com/atcupps/Jupiterp/LICENSE).
 *
 *
 * @fileoverview The planner's local-storage contract: the keys and
 * serialization for the active schedule and the saved (non-selected)
 * schedules. Everything that reads or writes planner state in local storage
 * (the planner page itself, the schedule generator's "Apply") must go through
 * this module so the format only exists in one place.
 */

import type { ScheduleBlock, StoredSchedule } from '../../types';
import { resolveSelections, resolveStoredSchedules } from './CourseLoad';

const SELECTED_SECTIONS_KEY = 'selectedSections';
const SCHEDULE_NAME_KEY = 'scheduleName';
const NONSELECTED_SCHEDULES_KEY = 'nonselectedSchedules';

/**
 * Serialize schedule blocks for storage, dropping transient hover previews.
 */
export function jsonifySections(sections: ScheduleBlock[]): string {
  return JSON.stringify(sections.filter((s) => !('course' in s) || !s.hover));
}

/** Write the active schedule (selections and name) to local storage. */
export function saveCurrentSchedule(schedule: StoredSchedule): void {
  const sections = jsonifySections(schedule.selections);
  localStorage.setItem(SELECTED_SECTIONS_KEY, sections);
  localStorage.setItem(SCHEDULE_NAME_KEY, schedule.scheduleName);
}

/** Write the saved (non-selected) schedules to local storage. */
export function saveNonselectedSchedules(schedules: StoredSchedule[]): void {
  localStorage.setItem(NONSELECTED_SCHEDULES_KEY, JSON.stringify(schedules));
}

/** Read and modernize the active schedule from local storage. */
export function readStoredCurrentSchedule(): StoredSchedule {
  const rawSelections = localStorage.getItem(SELECTED_SECTIONS_KEY);
  return {
    scheduleName: localStorage.getItem(SCHEDULE_NAME_KEY) ?? 'Schedule 1',
    selections: rawSelections ? resolveSelections(rawSelections) : [],
  };
}

/** Read and modernize the saved (non-selected) schedules from local storage. */
export function readStoredNonselectedSchedules(): StoredSchedule[] {
  const raw = localStorage.getItem(NONSELECTED_SCHEDULES_KEY);
  return raw ? resolveStoredSchedules(raw) : [];
}
