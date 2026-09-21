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
