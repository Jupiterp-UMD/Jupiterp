/**
 * This file is part of Jupiterp. For terms of use, please see the file
 * called LICENSE at the top level of the Jupiterp source tree (online at
 * https://github.com/atcupps/Jupiterp/LICENSE).
 * Copyright (C) 2026 Andrew Cupps
 */

import type { Course, Department, Instructor } from '@jupiterp/jupiterp';
import { writable, type Writable } from 'svelte/store';
import type { CourseSectionPair, FilterParams, ScheduleSelection, StoredSchedule } from '../types';
import type { CourseGrades } from '../lib/course-planner/GradesLoader';

/**
 * Shared planner state for components.
 */
export const PlannerState: Writable<{
  isDesktop: boolean;
  chainScrollParent: HTMLElement | null;
}> = writable({
  isDesktop: false,
  chainScrollParent: null,
});

/** `Record<string, Instructor>` for getting instructor data from names
/* Initially set to an empty record since the data used here is
/* loaded in `+page.svelte`.
 */
export const ProfsLookupStore: Writable<Record<string, Instructor>> = writable({});

/** Track which section is being hovered by the user in Course Search */
export const HoveredSectionStore: Writable<ScheduleSelection | null> = writable(null);

/** Track selected sections in current schedule */
export const CurrentScheduleStore: Writable<StoredSchedule> = writable({
  scheduleName: 'Schedule 1',
  selections: [],
});

/** Track stored schedules that are not the active current schedule */
export const NonselectedScheduleStore: Writable<StoredSchedule[]> = writable([]);

// Track current course displayed in course info section
export const CourseInfoPairStore: Writable<CourseSectionPair | null> = writable(null);

// Track current event displayed in edit event modal
export const EventEditStore: Writable<{ eventId: string } | null> = writable(null);

// Track whether the add custom event modal is open
export const AddCustomEventStore: Writable<boolean> = writable(false);

/** List of departments */
export const DepartmentsStore: Writable<Department[]> = writable([]);

/** Search results */
export const SearchResultsStore: Writable<Course[]> = writable([]);

/** Potential department suggestions for partial searches */
export const DeptSuggestionsStore: Writable<string[]> = writable([]);

/** Filter parameters for course search */
export const CourseSearchFilterStore: Writable<FilterParams> = writable({
  serverSideFilters: {},
  clientSideFilters: {},
});

/** State of grade data for a single course */
export type CourseGradesEntry =
  | { status: 'loading' }
  | { status: 'loaded'; grades: CourseGrades }
  /** No grade data exists for this course */
  | { status: 'none' }
  /** Network or server error; retryable on explicit user action */
  | { status: 'error' };

/** `CourseGradesEntry` per course code */
export type CourseGradesMap = Record<string, CourseGradesEntry>;

/**
 * Grade data keyed by course code, sourced from UMD's registrar via the
 * Jupiterp API. Written only by `GradesLoader.ts`.
 */
export const CourseGradesStore: Writable<CourseGradesMap> = writable({});
