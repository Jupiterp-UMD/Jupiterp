/**
 * This file is part of Jupiterp. For terms of use, please see the file
 * called LICENSE at the top level of the Jupiterp source tree (online at
 * https://github.com/atcupps/Jupiterp/LICENSE).
 *
 *
 * @fileoverview Svelte stores backing the schedule generator page: the course
 * wishlist, the hard constraints, the chosen sort criterion, and the current
 * generation state.
 */

import type { Course } from '@jupiterp/jupiterp';
import { writable, type Writable } from 'svelte/store';
import { defaultConstraints } from '$lib/schedule-generator/types';
import type {
  GeneratedSchedule,
  HardConstraints,
  PinNotice,
  Relaxation,
  SectionPin,
  SortCriterion,
} from '$lib/schedule-generator/types';

/**
 * One course the user wants the generator to schedule around, plus whether it
 * is required and any pin narrowing it to a section or professor.
 */
export interface GeneratorRequirement {
  course: Course;
  required: boolean;
  pin: SectionPin;
}

/**
 * A single constraint relaxation paired with how many schedules it would
 * unlock, used to explain zero-result generations.
 */
export interface RelaxationHint {
  relaxation: Relaxation;
  scheduleCount: number;
  truncated: boolean;
}

/** The outcome of a generation run, used to drive the results UI. */
export type GenerationState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | {
      kind: 'done';
      schedules: GeneratedSchedule[];
      truncated: boolean;
      pinNotices: PinNotice[];
    }
  | {
      kind: 'noSchedules';
      hints: RelaxationHint[];
      coursesWithNoValidSections: string[];
    }
  | { kind: 'failed'; message: string };

/** The course wishlist the generator builds schedules from. */
export const GeneratorRequirementsStore: Writable<GeneratorRequirement[]> = writable([]);

/** The hard constraints every generated schedule must satisfy. */
export const GeneratorConstraintsStore: Writable<HardConstraints> = writable(defaultConstraints());

/** The criterion by which results are currently ranked. */
export const GeneratorSortStore: Writable<SortCriterion> = writable('bestRating');

/**
 * Whether the user has explicitly picked a sort criterion. While false,
 * a generation run with optional courses may switch the sort to
 * "most classes"; once true, the user's choice is never overridden.
 */
export const GeneratorSortChosenByUserStore: Writable<boolean> = writable(false);

/** The current generation state. */
export const GenerationStateStore: Writable<GenerationState> = writable({
  kind: 'idle',
});
