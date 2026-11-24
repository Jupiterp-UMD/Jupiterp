/**
 * This file is part of Jupiterp. For terms of use, please see the file
 * called LICENSE at the top level of the Jupiterp source tree (online at
 * https://github.com/atcupps/Jupiterp/LICENSE).
 *
 *
 * @fileoverview Unit tests for the generated-schedule preview's layout and
 * gesture rules.
 */

import { describe, expect, test } from '@jest/globals';
import { formatHour, previewHourWindow, swipeStep, weekGridHeightPercent } from './SchedulePreview';
import { noDifferences } from '../course-planner/Schedule';
import type { ClassMeetingExtended, Schedule } from '../../types';

/** A meeting from `start` to `end`, in decimal hours (13.5 is 1:30 PM). */
function meeting(start: number, end: number): ClassMeetingExtended {
  return {
    courseCode: 'TST101',
    sectionCode: '0101',
    meeting: {
      classtime: { days: 'M', start, end },
      location: { building: 'TST', room: '101' },
    },
    conflictIndex: 1,
    conflictTotal: 1,
    instructors: [],
    hover: false,
    colorNumber: 0,
    differences: noDifferences(),
  };
}

/** A schedule holding `monday`'s meetings and nothing else. */
function scheduleWith(monday: ClassMeetingExtended[], other: ClassMeetingExtended[] = []): Schedule {
  return { monday, tuesday: [], wednesday: [], thursday: [], friday: [], other };
}

describe('previewHourWindow', () => {
  test('a schedule with no timed meetings shows 8 AM to 4 PM', () => {
    expect(previewHourWindow(scheduleWith([]))).toEqual({ start: 8, end: 16 });
  });

  test('meetings with no set time do not move the window', () => {
    const online: ClassMeetingExtended = { ...meeting(0, 0), meeting: 'OnlineAsync' };
    expect(previewHourWindow(scheduleWith([], [online]))).toEqual({ start: 8, end: 16 });
  });

  test('a short day is widened evenly to eight hours', () => {
    // 12:00-3:15 rounds out to 12-4, four hours short: two more on each side.
    expect(previewHourWindow(scheduleWith([meeting(12, 12.83), meeting(14, 15.25)]))).toEqual({ start: 10, end: 18 });
  });

  test('an odd shortfall stays one hour short, as in the planner', () => {
    // 9:30-3:15 rounds out to 9-4, seven hours: the planner leaves it as is.
    expect(previewHourWindow(scheduleWith([meeting(9.5, 10.33), meeting(14, 15.25)]))).toEqual({ start: 9, end: 16 });
    // 11-4 is three hours short: one more on each side, seven in all.
    expect(previewHourWindow(scheduleWith([meeting(11, 16)]))).toEqual({ start: 10, end: 17 });
  });

  test('a day of eight hours or more is shown as is', () => {
    expect(previewHourWindow(scheduleWith([meeting(8, 8.83), meeting(19, 21.5)]))).toEqual({ start: 8, end: 22 });
    expect(previewHourWindow(scheduleWith([meeting(9, 17)]))).toEqual({ start: 9, end: 17 });
  });

  test('every weekday counts towards the window', () => {
    const schedule = scheduleWith([meeting(13, 14)]);
    schedule.friday = [meeting(8, 9)];
    expect(previewHourWindow(schedule)).toEqual({ start: 7, end: 15 });
  });
});

describe('weekGridHeightPercent', () => {
  test('a day of up to ten hours fits the space available', () => {
    expect(weekGridHeightPercent({ start: 8, end: 16 })).toBe(100);
    expect(weekGridHeightPercent({ start: 9, end: 16 })).toBe(100);
    expect(weekGridHeightPercent({ start: 8, end: 18 })).toBe(100);
  });

  test('a longer day keeps the ten-hour scale and grows past the space', () => {
    expect(weekGridHeightPercent({ start: 8, end: 19 })).toBeCloseTo(110);
    expect(weekGridHeightPercent({ start: 8, end: 22 })).toBeCloseTo(140);
  });
});

describe('formatHour', () => {
  test('morning, noon and afternoon hours', () => {
    expect(formatHour(8)).toBe('8 AM');
    expect(formatHour(11)).toBe('11 AM');
    expect(formatHour(12)).toBe('12 PM');
    expect(formatHour(13)).toBe('1 PM');
    expect(formatHour(23)).toBe('11 PM');
  });

  test('midnight, including a window that runs up to it', () => {
    expect(formatHour(0)).toBe('12 AM');
    expect(formatHour(24)).toBe('12 AM');
  });
});

describe('swipeStep', () => {
  test('a swipe left moves to the next schedule, a swipe right to the previous', () => {
    expect(swipeStep(-120, 5)).toBe(1);
    expect(swipeStep(120, -5)).toBe(-1);
  });

  test('a short movement is not a swipe', () => {
    expect(swipeStep(-49, 0)).toBeNull();
    expect(swipeStep(0, 0)).toBeNull();
    expect(swipeStep(-50, 0)).toBe(1);
  });

  test('a mostly vertical movement is left to scrolling', () => {
    expect(swipeStep(-60, 200)).toBeNull();
    expect(swipeStep(100, 61)).toBeNull();
    expect(swipeStep(100, 60)).toBe(-1);
  });
});
