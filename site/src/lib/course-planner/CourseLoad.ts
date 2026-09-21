/**
 * This file is part of Jupiterp. For terms of use, please see the file
 * called LICENSE at the top level of the Jupiterp source tree (online at
 * https://github.com/atcupps/Jupiterp/LICENSE).
 *
 *
 * @fileoverview This file contains a function `retrieveCourses` which is
 * used as part of loading courses from local storage.
 */

import type { Course, CoursesConfig, CoursesResponse } from '@jupiterp/jupiterp';
import type {
  LegacyScheduleSelection,
  LegacyStoredSchedule,
  ScheduleBlock,
  ScheduleSelection,
  SelectionDifferences,
  StoredSchedule,
} from '../../types';
import { assignColorNumbers, modernizeSelections } from './Modernization';
import { uniqueNumberedName } from './ScheduleSelector';
import { buildSharedSelections, decodeSchedule } from './ShareLink';
import { client } from '$lib/client';
import { CurrentScheduleStore, NonselectedScheduleStore } from '../../stores/CoursePlannerStores';

/**
 * Resolve a stored schedule selection array from a string in local storage,
 * and convert to modernized format if necessary.
 * @param selectionsRaw A string from local storage
 * @returns The parsed and modernized `ScheduleSelection[]`
 */
export function resolveSelections(selectionsRaw: string): ScheduleBlock[] {
  const parsed = JSON.parse(selectionsRaw);
  if (!Array.isArray(parsed)) {
    return [];
  }

  if (parsed.length === 0) {
    return [];
  }

  if ('credits' in parsed[0]) {
    // If 'credits' is a property, this is legacy
    return modernizeSelections(parsed as LegacyScheduleSelection[]);
  }

  return parsed as ScheduleBlock[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isLegacyStoredSchedule(parsed: any[]): boolean {
  for (const schedule of parsed) {
    if (schedule.selections && Array.isArray(schedule.selections)) {
      for (const selection of schedule.selections) {
        if ('credits' in selection) {
          return true;
        }
      }
    }
  }

  return false;
}

export function resolveStoredSchedules(storedRaw: string): StoredSchedule[] {
  const parsed = JSON.parse(storedRaw);
  if (!Array.isArray(parsed)) {
    return [];
  }

  if (parsed.length === 0) {
    return [];
  }

  if (isLegacyStoredSchedule(parsed)) {
    return (parsed as LegacyStoredSchedule[]).map((legacy) => {
      return {
        scheduleName: legacy.scheduleName,
        selections: modernizeSelections(legacy.selections),
      };
    });
  }

  return (parsed as StoredSchedule[]).map((stored) => {
    return {
      scheduleName: stored.scheduleName,
      selections: stored.selections,
    };
  });
}

function diffAndUpdate(old: ScheduleSelection, upToDateCourse: Course): ScheduleSelection | null {
  const differences: SelectionDifferences = {
    instructors: false,
    numMeetings: false,
    meetingType: false,
    meetingTime: false,
    meetingLocation: false,
  };

  if (!upToDateCourse.sections) {
    // Course has no sections, nothing to compare
    return old;
  }

  // Test for pseudo section used for courses with no section
  if (old.section.sectionCode === 'N/A' && upToDateCourse.sections.length === 0) {
    return old;
  }

  const upToDateSection = upToDateCourse.sections.find((section) => {
    return section.sectionCode === old.section.sectionCode;
  });

  if (!upToDateSection) {
    // Section no longer exists!
    return null;
  }

  // Compare instructors
  const oldInstructors = old.section.instructors.sort();
  const newInstructors = upToDateSection.instructors.sort();
  if (oldInstructors.length !== newInstructors.length) {
    differences.instructors = true;
  } else {
    for (let i = 0; i < oldInstructors.length; i++) {
      if (oldInstructors[i] !== newInstructors[i]) {
        differences.instructors = true;
        break;
      }
    }
  }

  // Compare class meetings
  const oldMeetings = old.section.meetings;
  const newMeetings = upToDateSection.meetings;
  if (oldMeetings.length !== newMeetings.length) {
    differences.numMeetings = true;
  } else {
    for (let i = 0; i < oldMeetings.length; i++) {
      const oldMeeting = oldMeetings[i];
      const newMeeting = newMeetings[i];

      const oldIsString = typeof oldMeeting === 'string';
      const newIsString = typeof newMeeting === 'string';

      if (oldIsString && newIsString) {
        if (oldMeeting !== newMeeting) {
          differences.meetingType = true;
          continue;
        }
      }

      if (oldIsString !== newIsString) {
        differences.meetingType = true;
        continue;
      }

      if (typeof oldMeeting === 'object' && typeof newMeeting === 'object') {
        // Compare classtime
        if (JSON.stringify(oldMeeting.classtime) !== JSON.stringify(newMeeting.classtime)) {
          differences.meetingTime = true;
        }

        // Compare location
        if (JSON.stringify(oldMeeting.location) !== JSON.stringify(newMeeting.location)) {
          differences.meetingLocation = true;
        }
      }
    }
  }

  return {
    course: {
      courseCode: upToDateCourse.courseCode,
      name: upToDateCourse.name,
      minCredits: upToDateCourse.minCredits,
      maxCredits: upToDateCourse.maxCredits,
      description: upToDateCourse.description,
      genEds: upToDateCourse.genEds,
      conditions: upToDateCourse.conditions,
    },
    section: upToDateSection,
    hover: false,
    differences,
    colorNumber: old.colorNumber,
  };
}

function getCoursesToRetrieve(current: StoredSchedule, nonselected: StoredSchedule[]): Set<string> {
  const result: Set<string> = new Set<string>();

  current.selections.forEach((selection) => {
    if ('course' in selection) result.add(selection.course.courseCode);
  });

  nonselected.forEach((stored) => {
    stored.selections.forEach((selection) => {
      if ('course' in selection) result.add(selection.course.courseCode);
    });
  });

  return result;
}

async function getUpToDateCourses(courseCodes: Set<string>): Promise<Record<string, Course>> {
  const cfg: CoursesConfig = {
    courseCodes,
  };

  const courses: CoursesResponse = await client.coursesWithSections(cfg);
  if (!courses.ok() || !courses.data) {
    throw new Error('Failed to retrieve course data');
  }

  const courseRecord: Record<string, Course> = {};
  courses.data.forEach((course) => {
    courseRecord[course.courseCode] = course;
  });
  return courseRecord;
}

/**
 * Reconcile stored selections against up-to-date course data: refresh each
 * course selection via `diffAndUpdate` (dropping ones whose course or section
 * no longer exists) and pass UserEvents through untouched.
 */
function updateSelections(selections: ScheduleBlock[], upToDateCourses: Record<string, Course>): ScheduleBlock[] {
  const updatedSelections: ScheduleBlock[] = [];
  selections.forEach((selection) => {
    // Push UserEvents through without updates
    if (!('course' in selection)) {
      updatedSelections.push(selection);
      return;
    }
    const upToDate: Course = upToDateCourses[selection.course.courseCode];
    if (!upToDate) {
      // Course no longer exists, skip
      return;
    }
    const updated = diffAndUpdate(selection, upToDate);
    if (updated !== null) {
      updatedSelections.push(updated);
    }
  });
  return updatedSelections;
}

export async function ensureUpToDateAndSetStores(current: StoredSchedule, nonselected: StoredSchedule[]) {
  if (current.selections.length === 0 && nonselected.length === 0) {
    // Nothing to do
    return;
  }

  const coursesToRetrieve = getCoursesToRetrieve(current, nonselected);

  let upToDateCourses: Record<string, Course>;
  try {
    upToDateCourses = await getUpToDateCourses(coursesToRetrieve);
  } catch (e) {
    console.error('Failed to retrieve up-to-date course data:', e);
    return;
  }

  CurrentScheduleStore.set({
    scheduleName: current.scheduleName,
    selections: assignColorNumbers(updateSelections(current.selections, upToDateCourses)),
  });

  NonselectedScheduleStore.set(
    nonselected.map((stored) => {
      return {
        scheduleName: stored.scheduleName,
        selections: assignColorNumbers(updateSelections(stored.selections, upToDateCourses)),
      };
    })
  );
}

/**
 * Apply a shared schedule (from a `?s=` link) as a new named schedule, keeping
 * the user's existing schedules intact by demoting them to non-selected ones.
 * If the token yields no valid sections, falls back to the normal load so the
 * user's own schedules still appear.
 *
 * @returns `true` if the share param was consumed (the caller should strip it),
 *          or `false` if a transient course-data fetch failed (the caller should
 *          keep the param so a refresh can retry the import).
 * @param param The raw `s` query parameter from a shared link.
 * @param existingCurrent The active schedule read from local storage.
 * @param existingNonselected The saved schedules read from local storage.
 */
export async function applySharedScheduleToStores(
  param: string,
  existingCurrent: StoredSchedule,
  existingNonselected: StoredSchedule[]
): Promise<boolean> {
  const pairs = decodeSchedule(param);
  if (pairs.length === 0) {
    // Empty or unparseable token: nothing to retry. Load the user's own
    // schedules and let the caller drop the useless param.
    await ensureUpToDateAndSetStores(existingCurrent, existingNonselected);
    return true;
  }

  // Fetch the shared schedule's courses together with the user's own, so
  // the preserved schedules get the same up-to-date reconciliation a normal
  // (non-shared) load performs.
  const coursesToRetrieve = getCoursesToRetrieve(existingCurrent, existingNonselected);
  pairs.forEach((p) => coursesToRetrieve.add(p.courseCode));

  let courses: Record<string, Course>;
  try {
    courses = await getUpToDateCourses(coursesToRetrieve);
  } catch (e) {
    console.error('Failed to load shared schedule course data:', e);
    // Transient failure: show the user's own schedules but keep the param so
    // a refresh can retry the import.
    await ensureUpToDateAndSetStores(existingCurrent, existingNonselected);
    return false;
  }

  const shared = buildSharedSelections(pairs, courses);
  if (shared.length === 0) {
    // Decoded and fetched fine, but none of the sections still exist.
    // Nothing to retry — drop the param.
    await ensureUpToDateAndSetStores(existingCurrent, existingNonselected);
    return true;
  }

  // Preserve the user's existing active schedule alongside their saved ones,
  // reconciled against current course data like any other load.
  const preserved = (
    existingCurrent.selections.length > 0 ? [existingCurrent, ...existingNonselected] : existingNonselected
  ).map((stored) => {
    return {
      scheduleName: stored.scheduleName,
      selections: assignColorNumbers(updateSelections(stored.selections, courses)),
    };
  });

  CurrentScheduleStore.set({
    scheduleName: uniqueNumberedName('Shared schedule', preserved),
    selections: assignColorNumbers(shared),
  });

  NonselectedScheduleStore.set(preserved);
  return true;
}
