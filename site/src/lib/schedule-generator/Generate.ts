/**
 * This file is part of Jupiterp. For terms of use, please see the file
 * called LICENSE at the top level of the Jupiterp source tree (online at
 * https://github.com/atcupps/Jupiterp/LICENSE).
 * Copyright (C) 2026 Andrew Cupps
 *
 * @fileoverview Orchestrates a generation run for the generator page: refetch
 * full course data, build instructor ratings, run the (pure) engine, and on a
 * zero-result run compute single-constraint relaxation hints. This is the web
 * analog of the mobile app's generator view model.
 */

import { get } from 'svelte/store';
import type { Course, CoursesConfig } from '@jupiterp/jupiterp';
import { client } from '$lib/client';
import { ProfsLookupStore } from '../../stores/CoursePlannerStores';
import {
  GenerationStateStore,
  GeneratorConstraintsStore,
  GeneratorRequirementsStore,
  GeneratorSortChosenByUserStore,
  GeneratorSortStore,
  type GeneratorRequirement,
  type RelaxationHint,
} from '../../stores/GeneratorStores';
import { generate } from './ScheduleGenerator';
import { singleRelaxations } from './Relaxation';
import type { CourseRequest } from './types';

/**
 * Node budget for relaxation probes. Each zero-result generation re-runs the
 * engine once per active constraint; capping the search keeps that bounded and
 * off the critical path. A probe that exceeds this budget may under-report or
 * omit a hint — acceptable, since hints are advisory.
 */
const RELAXATION_MAX_NODES = 50_000;

/** Fetch full, up-to-date courses (with all sections) by course code. */
async function fetchFullCourses(courseCodes: Set<string>): Promise<Record<string, Course>> {
  const config: CoursesConfig = { courseCodes };
  const response = await client.coursesWithSections(config);
  if (!response.ok() || !response.data) {
    throw new Error('Could not load course data');
  }
  const record: Record<string, Course> = {};
  for (const course of response.data) {
    record[course.courseCode] = course;
  }
  return record;
}

/**
 * Build a name -> average-rating map from the loaded instructor lookup.
 *
 * Keyed by name because that is what the engine matches sections on, but
 * *resolved* by slug: `section.instructorSlugs[i]` is the instructor the API
 * resolved for slot i, so a professor whose Testudo spelling differs from
 * their canonical record still gets their rating, and two professors sharing
 * a name are no longer both dropped.
 */
function buildRatings(requests: CourseRequest[]): Map<string, number> {
  const lookup = get(ProfsLookupStore);
  const ratings = new Map<string, number>();
  for (const request of requests) {
    for (const section of request.course.sections ?? []) {
      section.instructors.forEach((name, index) => {
        if (ratings.has(name)) {
          return;
        }
        const slug = section.instructorSlugs?.[index];
        if (!slug) {
          return;
        }
        // `average_rating` is a number: the column is a Postgres `real` and
        // PostgREST sends it as JSON. It was declared `string` in the client
        // until now, so this used to go through parseFloat, which coerced it
        // and hid the mismatch. The finite check stays -- a null or a NaN
        // should leave the professor unrated rather than poison the sort.
        const raw = lookup[slug]?.average_rating;
        if (raw != null && Number.isFinite(raw)) {
          ratings.set(name, raw);
        }
      });
    }
  }
  return ratings;
}

/** Build engine requests from the wishlist using refetched full courses. */
function buildRequests(requirements: GeneratorRequirement[], fullCourses: Record<string, Course>): CourseRequest[] {
  const requests: CourseRequest[] = [];
  for (const requirement of requirements) {
    const course = fullCourses[requirement.course.courseCode];
    if (course) {
      requests.push({
        course,
        required: requirement.required,
        pin: requirement.pin,
      });
    }
  }
  return requests;
}

/**
 * Run a full generation using the current wishlist, constraints, and loaded
 * instructor ratings, updating `GenerationStateStore` with the outcome.
 */
export async function runGeneration(): Promise<void> {
  const requirements = get(GeneratorRequirementsStore);
  if (requirements.length === 0) {
    return;
  }
  const constraints = get(GeneratorConstraintsStore);

  GenerationStateStore.set({ kind: 'loading' });

  let fullCourses: Record<string, Course>;
  try {
    const courseCodes = new Set(requirements.map((r) => r.course.courseCode));
    fullCourses = await fetchFullCourses(courseCodes);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not load courses';
    GenerationStateStore.set({ kind: 'failed', message });
    return;
  }

  const missing = requirements.filter((r) => !fullCourses[r.course.courseCode]).map((r) => r.course.courseCode);
  if (missing.length > 0) {
    GenerationStateStore.set({
      kind: 'failed',
      message: `Couldn't find: ${missing.join(', ')}`,
    });
    return;
  }

  const requests = buildRequests(requirements, fullCourses);
  const ratings = buildRatings(requests);

  try {
    const result = generate(requests, constraints, ratings);

    if (result.schedules.length > 0) {
      // With optional courses in play, lead with the fullest schedules —
      // but never override a sort the user picked themselves.
      if (requests.some((r) => !r.required) && !get(GeneratorSortChosenByUserStore)) {
        GeneratorSortStore.set('mostClasses');
      }
      GenerationStateStore.set({
        kind: 'done',
        schedules: result.schedules,
        truncated: result.truncated,
        pinNotices: result.pinNotices,
      });
      return;
    }

    // Nothing fits: explain which single constraint to loosen.
    const hints: RelaxationHint[] = [];
    for (const relaxation of singleRelaxations(constraints)) {
      const rerun = generate(requests, relaxation.constraints, ratings, 50, RELAXATION_MAX_NODES);
      if (rerun.schedules.length > 0) {
        hints.push({
          relaxation,
          scheduleCount: rerun.schedules.length,
          truncated: rerun.truncated,
        });
      }
    }
    GenerationStateStore.set({
      kind: 'noSchedules',
      hints,
      coursesWithNoValidSections: result.coursesWithNoValidSections,
    });
  } catch (error) {
    console.error('Schedule generation failed:', error);
    GenerationStateStore.set({
      kind: 'failed',
      message: 'Something went wrong while generating schedules.',
    });
  }
}
