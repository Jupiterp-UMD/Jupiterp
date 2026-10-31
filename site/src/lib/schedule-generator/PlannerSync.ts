/**
 * This file is part of Jupiterp. For terms of use, please see the file
 * called LICENSE at the top level of the Jupiterp source tree (online at
 * https://github.com/atcupps/Jupiterp/LICENSE).
 *
 *
 * @fileoverview Keeps the generator wishlist a copy of the planner's active
 * schedule. The planner's stores are only filled on its own page, so this reads
 * the schedule from local storage, which also works after a refresh.
 */

import { get } from 'svelte/store';
import type { Course } from '@jupiterp/jupiterp';
import { GeneratorRequirementsStore } from '../../stores/GeneratorStores';
import { readStoredCurrentSchedule } from '../course-planner/SchedulePersistence';
import { fetchFullCourses } from './Generate';
import { chosenCourseCodes, hydrateRequirements, plannerCourses, syncRequirements } from './WishlistActions';

/**
 * The sorted planner course codes at the last sync. Only a change to these
 * replaces the wishlist, so hand edits survive client-side navigation. Like the
 * wishlist itself, this resets on a full page load.
 */
let lastPlannerCodes: string | null = null;

/**
 * Sync the wishlist with the planner if the planner's courses have changed.
 * New courses appear immediately with the sections the planner stored, then
 * take their full course data, which the pin dropdowns need, once it arrives.
 */
export async function syncFromPlanner(): Promise<void> {
  let courses: Course[];
  try {
    courses = plannerCourses(readStoredCurrentSchedule().selections);
  } catch (error) {
    console.error('Could not read the planner schedule:', error);
    return;
  }

  const courseCodes = courses.map((course) => course.courseCode);
  const plannerCodes = [...courseCodes].sort().join(',');
  if (plannerCodes === lastPlannerCodes) {
    return;
  }
  lastPlannerCodes = plannerCodes;

  const existingCodes = chosenCourseCodes(get(GeneratorRequirementsStore));
  GeneratorRequirementsStore.update((reqs) => syncRequirements(reqs, courses));

  const addedCodes = new Set(courseCodes.filter((code) => !existingCodes.has(code)));
  if (addedCodes.size === 0) {
    return;
  }

  try {
    const fullCourses = await fetchFullCourses(addedCodes);
    GeneratorRequirementsStore.update((reqs) => hydrateRequirements(reqs, addedCodes, fullCourses));
  } catch (error) {
    // The wishlist still works: a generation run refetches courses itself.
    console.error('Could not load full course data:', error);
  }
}
