/**
 * This file is part of Jupiterp. For terms of use, please see the file
 * called LICENSE at the top level of the Jupiterp source tree (online at
 * https://github.com/atcupps/Jupiterp/LICENSE).
 *
 *
 * @fileoverview Applies a generated schedule to the course planner. The
 * planner reads its state from local storage on mount, so this writes there
 * (through the planner's shared persistence layer), saving the generated
 * schedule as a new named schedule and preserving the user's existing
 * schedules.
 */

import {
  readStoredCurrentSchedule,
  readStoredNonselectedSchedules,
  saveCurrentSchedule,
  saveNonselectedSchedules,
} from '../course-planner/SchedulePersistence';
import { uniqueNumberedName } from '../course-planner/ScheduleSelector';
import type { GeneratedSchedule } from './types';

/**
 * Save `schedule` into the planner as a new named schedule (e.g. "Generated
 * 1"), demoting the user's existing active schedule to a saved one if it had
 * any selections. Returns the name assigned to the new schedule.
 */
export function applyGeneratedSchedule(schedule: GeneratedSchedule): string {
  const current = readStoredCurrentSchedule();
  const nonselected = readStoredNonselectedSchedules();

  // Preserve the existing active schedule alongside the others.
  const preserved = current.selections.length > 0 ? [current, ...nonselected] : nonselected;

  // Name the new schedule against what is actually being kept, so a discarded
  // empty active schedule never forces an unnecessary suffix.
  const name = uniqueNumberedName('Generated', preserved, true);

  // The engine already assigned each selection its color number.
  saveCurrentSchedule({ scheduleName: name, selections: schedule.selections });
  saveNonselectedSchedules(preserved);

  return name;
}
