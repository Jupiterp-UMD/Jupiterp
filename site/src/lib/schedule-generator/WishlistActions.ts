/**
 * This file is part of Jupiterp. For terms of use, please see the file
 * called LICENSE at the top level of the Jupiterp source tree (online at
 * https://github.com/atcupps/Jupiterp/LICENSE).
 *
 *
 * @fileoverview Pure helpers for mutating the generator course wishlist. Kept
 * free of Svelte stores and `$lib` imports (type-only) so the add/remove logic
 * can be unit-tested directly; the store just wraps these in `.update(...)`.
 */

import type { Course } from '@jupiterp/jupiterp';
import type { GeneratorRequirement } from '../../stores/GeneratorStores';
import type { ScheduleBlock } from '../../types';

/** The set of course codes already present in the wishlist. */
export function chosenCourseCodes(reqs: GeneratorRequirement[]): Set<string> {
  return new Set(reqs.map((r) => r.course.courseCode));
}

/**
 * Appends `course` to the wishlist as a required, unpinned requirement. Returns
 * the array unchanged if the course is already present (matched by code).
 */
export function addRequirement(reqs: GeneratorRequirement[], course: Course): GeneratorRequirement[] {
  if (reqs.some((r) => r.course.courseCode === course.courseCode)) {
    return reqs;
  }
  return [...reqs, { course, required: true, pin: { kind: 'none' } }];
}

/** Removes the requirement matching `courseCode`, leaving others in order. */
export function removeRequirement(reqs: GeneratorRequirement[], courseCode: string): GeneratorRequirement[] {
  return reqs.filter((r) => r.course.courseCode !== courseCode);
}

/**
 * The courses on a planner schedule, one entry per course code. Each holds only
 * the sections chosen in the planner, since that is all a selection stores.
 */
export function plannerCourses(selections: ScheduleBlock[]): Course[] {
  const courses = new Map<string, Course>();
  for (const selection of selections) {
    if (!('course' in selection) || selection.hover) {
      continue;
    }
    const course = courses.get(selection.course.courseCode);
    if (course) {
      course.sections?.push(selection.section);
    } else {
      courses.set(selection.course.courseCode, {
        ...selection.course,
        sections: [selection.section],
      });
    }
  }
  return [...courses.values()];
}

/**
 * Makes the wishlist a copy of `courses`: requirements for other courses are
 * dropped, and new courses are appended. Courses already in the wishlist keep
 * their requirement unchanged, so the user's settings survive a sync.
 */
export function syncRequirements(reqs: GeneratorRequirement[], courses: Course[]): GeneratorRequirement[] {
  const courseCodes = new Set(courses.map((course) => course.courseCode));
  const kept = reqs.filter((r) => courseCodes.has(r.course.courseCode));
  return courses.reduce(addRequirement, kept);
}

/**
 * Applies a fetch of `requestedCodes` to the wishlist. The list may have changed
 * since the request was sent, so this only touches requested entries still in
 * it: each takes its full course data, or is dropped if the response lacks it.
 */
export function hydrateRequirements(
  reqs: GeneratorRequirement[],
  requestedCodes: Set<string>,
  fullCourses: Record<string, Course>
): GeneratorRequirement[] {
  return reqs.flatMap((r) => {
    if (!requestedCodes.has(r.course.courseCode)) {
      return [r];
    }
    const course = fullCourses[r.course.courseCode];
    return course ? [{ ...r, course }] : [];
  });
}
