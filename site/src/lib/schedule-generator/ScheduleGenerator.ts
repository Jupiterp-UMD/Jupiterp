/**
 * This file is part of Jupiterp. For terms of use, please see the file
 * called LICENSE at the top level of the Jupiterp source tree (online at
 * https://github.com/atcupps/Jupiterp/LICENSE).
 *
 *
 * @fileoverview The automatic schedule generator engine: a pure, synchronous,
 * constraint-filtered depth-first search with backtracking and fail-first
 * variable ordering. Given a list of `CourseRequest`s plus `HardConstraints`,
 * it returns every conflict-free way to pick one section per course, with
 * precomputed metrics for ranking. Ported from the mobile app's
 * `ScheduleGenerator`.
 */

import type { Course, Section } from '@jupiterp/jupiterp';
import type { ScheduleSelection } from '../../types';
import { noDifferences } from '../course-planner/Schedule';
import type {
  CourseRequest,
  EngineDay,
  GeneratedSchedule,
  GenerationResult,
  HardConstraints,
  OverriddenFilter,
  PinNotice,
  ScheduleMetrics,
} from './types';

/** Default cap on the number of schedules returned. */
export const DEFAULT_MAX_RESULTS = 1000;

/** Hard cap on explored search nodes so degenerate inputs can't hang. */
const MAX_NODES = 500_000;

/** A single day/time block, in integer minutes since midnight. */
interface MinuteSlot {
  day: EngineDay;
  start: number;
  end: number;
}

/** A course section paired with its conflict-detection time slots. */
interface Candidate {
  course: Course;
  section: Section;
  slots: MinuteSlot[];
}

/** A course's surviving candidates, plus whether the course is optional. */
interface CourseCandidates {
  candidates: Candidate[];
  optional: boolean;
}

/**
 * Two slots conflict only when they share a day and their [start, end)
 * intervals overlap once expanded by the required gap.
 */
function slotsConflict(a: MinuteSlot, b: MinuteSlot, minGapMinutes: number): boolean {
  return a.day === b.day && a.start - minGapMinutes < b.end && a.end + minGapMinutes > b.start;
}

/**
 * Two-letter day codes (Tu, Th, Sa, Su) are matched before the single-letter
 * ones so "Th" is never read as "T" + "h".
 */
const DAY_TOKENS: ReadonlyArray<readonly [string, EngineDay]> = [
  ['Tu', 'Tu'],
  ['Th', 'Th'],
  ['Sa', 'Sa'],
  ['Su', 'Su'],
  ['M', 'M'],
  ['W', 'W'],
  ['F', 'F'],
];

/**
 * Parse a day code into the exact days it represents, keeping all seven days
 * of the week distinct (unlike the planner's renderer).
 * @param days A day code, e.g. "MWF" or "TuTh".
 */
function parseDaysExact(days: string): EngineDay[] {
  const result: EngineDay[] = [];
  let i = 0;
  while (i < days.length) {
    let matched = false;
    for (const [token, day] of DAY_TOKENS) {
      if (days.startsWith(token, i)) {
        result.push(day);
        i += token.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      i += 1;
    }
  }
  return result;
}

/**
 * Flatten a section's meetings into integer-minute time slots. Only timed
 * (object) meetings produce slots; string meetings (async, TBA, unknown)
 * produce none, which is why async sections never conflict with anything.
 */
function minuteSlots(section: Section): MinuteSlot[] {
  const result: MinuteSlot[] = [];
  for (const meeting of section.meetings) {
    if (typeof meeting === 'string') {
      continue;
    }
    const start = Math.round(meeting.classtime.start * 60);
    const end = Math.round(meeting.classtime.end * 60);
    for (const day of parseDaysExact(meeting.classtime.days)) {
      result.push({ day, start, end });
    }
  }
  return result;
}

/** Narrow a request's course to the sections selected by its pin. */
function pinnedSections(request: CourseRequest): Section[] {
  const sections = request.course.sections ?? [];
  const pin = request.pin;
  switch (pin.kind) {
    case 'none':
      return sections;
    case 'bySection':
      return sections.filter((s) => s.sectionCode === pin.sectionCode);
    case 'byInstructor':
      return sections.filter((s) => s.instructors.includes(pin.name));
  }
}

/** Whether a candidate survives the per-section hard constraints. */
function candidatePasses(candidate: Candidate, constraints: HardConstraints): boolean {
  if (constraints.onlyOpenSeats && candidate.section.openSeats <= 0) {
    return false;
  }
  const earliest = constraints.earliestStartMinutes;
  const latest = constraints.latestEndMinutes;
  return candidate.slots.every((slot) => {
    if (constraints.daysOff.has(slot.day)) {
      return false;
    }
    if (earliest !== null && slot.start < earliest) {
      return false;
    }
    if (latest !== null && slot.end > latest) {
      return false;
    }
    return true;
  });
}

/** Which per-section filters a (pinned) candidate violates. */
function overriddenFilters(candidate: Candidate, constraints: HardConstraints): OverriddenFilter[] {
  const result: OverriddenFilter[] = [];
  if (constraints.onlyOpenSeats && candidate.section.openSeats <= 0) {
    result.push('openSeats');
  }
  const earliest = constraints.earliestStartMinutes;
  if (earliest !== null && candidate.slots.some((s) => s.start < earliest)) {
    result.push('earliestStart');
  }
  const latest = constraints.latestEndMinutes;
  if (latest !== null && candidate.slots.some((s) => s.end > latest)) {
    result.push('latestEnd');
  }
  if (candidate.slots.some((s) => constraints.daysOff.has(s.day))) {
    result.push('dayOff');
  }
  return result;
}

/** Build a planner `ScheduleSelection` from an engine candidate. */
function toScheduleSelection(candidate: Candidate, colorNumber: number): ScheduleSelection {
  const course = candidate.course;
  return {
    course: {
      courseCode: course.courseCode,
      name: course.name,
      minCredits: course.minCredits,
      maxCredits: course.maxCredits,
      description: course.description,
      genEds: course.genEds,
      conditions: course.conditions,
    },
    section: candidate.section,
    hover: false,
    differences: noDifferences(),
    colorNumber,
  };
}

/** Sum of the minimum credits across a combination of candidates. */
function sumMinCredits(combo: Candidate[]): number {
  return combo.reduce((total, c) => total + c.course.minCredits, 0);
}

/** Compute, once, the ranking metrics for a found combination. */
function computeMetrics(combo: Candidate[], ratings: Map<string, number>): ScheduleMetrics {
  const slots = combo.flatMap((c) => c.slots);

  const slotsByDay = new Map<EngineDay, MinuteSlot[]>();
  for (const slot of slots) {
    const existing = slotsByDay.get(slot.day);
    if (existing) {
      existing.push(slot);
    } else {
      slotsByDay.set(slot.day, [slot]);
    }
  }

  // Idle minutes between classes on each day, summed across the week. A
  // running max-end keeps nested or multi-meeting sections from producing
  // negative or double-counted gaps.
  let totalGapMinutes = 0;
  for (const daySlots of slotsByDay.values()) {
    const sorted = [...daySlots].sort((a, b) => a.start - b.start);
    let coveredUntil = sorted[0].end;
    for (let i = 1; i < sorted.length; i++) {
      const slot = sorted[i];
      if (slot.start > coveredUntil) {
        totalGapMinutes += slot.start - coveredUntil;
      }
      coveredUntil = Math.max(coveredUntil, slot.end);
    }
  }

  // A section's rating is the mean of its rated instructors; unrated
  // sections are excluded from the average rather than counted as zero.
  const sectionRatings: number[] = [];
  for (const candidate of combo) {
    const rated = candidate.section.instructors
      .map((name) => ratings.get(name))
      .filter((r): r is number => r !== undefined);
    if (rated.length > 0) {
      const sum = rated.reduce((a, b) => a + b, 0);
      sectionRatings.push(sum / rated.length);
    }
  }
  const avgInstructorRating =
    sectionRatings.length === 0 ? null : sectionRatings.reduce((a, b) => a + b, 0) / sectionRatings.length;

  const starts = slots.map((s) => s.start);
  const ends = slots.map((s) => s.end);

  return {
    avgInstructorRating,
    ratedSectionCount: sectionRatings.length,
    sectionCount: combo.length,
    minCredits: sumMinCredits(combo),
    maxCredits: combo.reduce((total, c) => total + (c.course.maxCredits ?? c.course.minCredits), 0),
    daysWithClasses: slotsByDay.size,
    totalGapMinutes,
    earliestStartMinutes: starts.length ? Math.min(...starts) : null,
    latestEndMinutes: ends.length ? Math.max(...ends) : null,
    minOpenSeats: Math.min(...combo.map((c) => c.section.openSeats)),
  };
}

/** Remove pin notices that are exact duplicates. */
function dedupePinNotices(notices: PinNotice[]): PinNotice[] {
  const seen = new Set<string>();
  const result: PinNotice[] = [];
  for (const notice of notices) {
    const key = JSON.stringify(notice);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(notice);
    }
  }
  return result;
}

/**
 * Generate every conflict-free schedule for the given course requests under
 * the given hard constraints.
 *
 * @param requests The courses to schedule, with required/optional and pins.
 * @param constraints Hard constraints every schedule must satisfy.
 * @param instructorRatings Instructor name -> average rating, for metrics.
 * @param maxResults Cap on returned schedules.
 * @param maxNodes Hard cap on explored search nodes; defaults to MAX_NODES.
 *   Pass a smaller value for lightweight probes (e.g. relaxation hints) to
 *   bound their cost. The primary generation run should use the default.
 */
export function generate(
  requests: CourseRequest[],
  constraints: HardConstraints,
  instructorRatings: Map<string, number> = new Map(),
  maxResults: number = DEFAULT_MAX_RESULTS,
  maxNodes: number = MAX_NODES
): GenerationResult {
  const pinNotices: PinNotice[] = [];

  // STAGE 1 — Pre-filter. Drop sections that violate per-section
  // constraints. Pinned courses skip the filter (the pin wins) but report
  // what each pinned section overrode.
  const perCourse = requests.map((request) => {
    const candidates: Candidate[] = pinnedSections(request).map((section) => ({
      course: request.course,
      section,
      slots: minuteSlots(section),
    }));
    let kept: Candidate[];
    if (request.pin.kind === 'none') {
      kept = candidates.filter((c) => candidatePasses(c, constraints));
    } else {
      for (const candidate of candidates) {
        const overridden = overriddenFilters(candidate, constraints);
        if (overridden.length > 0) {
          pinNotices.push({
            courseCode: request.course.courseCode,
            sectionCode: candidate.section.sectionCode,
            overriddenFilters: overridden,
          });
        }
      }
      kept = candidates;
    }
    return { request, candidates: kept };
  });

  // STAGE 2 — Impossibility check. Only required courses with zero valid
  // sections make generation impossible; optional ones are simply dropped.
  const coursesWithoutSections = perCourse
    .filter((p) => p.request.required && p.candidates.length === 0)
    .map((p) => p.request.course.courseCode);
  if (requests.length === 0 || coursesWithoutSections.length > 0) {
    return {
      schedules: [],
      truncated: false,
      coursesWithNoValidSections: coursesWithoutSections,
      pinNotices: dedupePinNotices(pinNotices),
    };
  }

  // STAGE 3 — Fail-first ordering. Courses with the fewest candidates go
  // first so dead branches are pruned as early as possible.
  const ordered: CourseCandidates[] = perCourse
    .filter((p) => p.candidates.length > 0)
    .map((p) => ({
      candidates: p.candidates,
      optional: !p.request.required,
    }))
    .sort((a, b) => a.candidates.length - b.candidates.length);

  const found: Candidate[][] = [];
  const chosen: Candidate[] = [];
  // Placed slots bucketed by day: slotsConflict requires matching days, so
  // each candidate slot only needs to be checked against its own day.
  const placedSlotsByDay = new Map<EngineDay, MinuteSlot[]>();
  let nodes = 0;
  let truncated = false;
  const minCredits = constraints.minCredits;

  // STAGE 4 — Depth-first search with backtracking.
  function dfs(courseIndex: number): void {
    if (truncated) {
      return;
    }
    if (courseIndex === ordered.length) {
      // Leaf: skip the empty schedule and any below the credit floor.
      const creditsOk = minCredits === null || sumMinCredits(chosen) >= minCredits;
      if (chosen.length > 0 && creditsOk) {
        found.push([...chosen]);
        if (found.length >= maxResults) {
          truncated = true;
        }
      }
      return;
    }
    const courseCandidates = ordered[courseIndex];
    for (const candidate of courseCandidates.candidates) {
      if (++nodes > maxNodes) {
        truncated = true;
        return;
      }
      const conflicts = candidate.slots.some((slot) => {
        const sameDay = placedSlotsByDay.get(slot.day);
        return (
          sameDay !== undefined && sameDay.some((placed) => slotsConflict(slot, placed, constraints.minGapMinutes))
        );
      });
      if (conflicts) {
        continue;
      }
      chosen.push(candidate);
      for (const slot of candidate.slots) {
        const bucket = placedSlotsByDay.get(slot.day);
        if (bucket) {
          bucket.push(slot);
        } else {
          placedSlotsByDay.set(slot.day, [slot]);
        }
      }
      dfs(courseIndex + 1);
      chosen.pop();
      for (const slot of candidate.slots) {
        placedSlotsByDay.get(slot.day)?.pop();
      }
      if (truncated) {
        return;
      }
    }
    // Optional courses can be left out. Explore the skip branch AFTER the
    // include branches so fuller schedules are found (and kept on
    // truncation) first.
    if (courseCandidates.optional) {
      dfs(courseIndex + 1);
    }
  }
  dfs(0);

  // STAGE 5 — Present selections in the caller's course order.
  const orderIndex = new Map<string, number>();
  requests.forEach((request, i) => {
    orderIndex.set(request.course.courseCode, i);
  });
  const schedules: GeneratedSchedule[] = found.map((combo) => {
    const selections = [...combo]
      .sort((a, b) => (orderIndex.get(a.course.courseCode) ?? 0) - (orderIndex.get(b.course.courseCode) ?? 0))
      .map((candidate, i) => toScheduleSelection(candidate, i));
    return {
      selections,
      metrics: computeMetrics(combo, instructorRatings),
    };
  });

  return {
    schedules,
    truncated,
    coursesWithNoValidSections: [],
    pinNotices: dedupePinNotices(pinNotices),
  };
}

/**
 * Convenience overload: generate from a plain list of courses, treating every
 * course as required with no pin.
 */
export function generateFromCourses(
  courses: Course[],
  constraints: HardConstraints,
  instructorRatings: Map<string, number> = new Map(),
  maxResults: number = DEFAULT_MAX_RESULTS
): GenerationResult {
  const requests: CourseRequest[] = courses.map((course) => ({
    course,
    required: true,
    pin: { kind: 'none' },
  }));
  return generate(requests, constraints, instructorRatings, maxResults);
}
