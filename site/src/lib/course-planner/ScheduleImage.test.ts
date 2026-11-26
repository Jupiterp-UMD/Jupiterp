/**
 * This file is part of Jupiterp. For terms of use, please see the file
 * called LICENSE at the top level of the Jupiterp source tree (online at
 * https://github.com/atcupps/Jupiterp/LICENSE).
 *
 *
 * @fileoverview Unit tests for ScheduleImage.ts
 */

import { describe, expect, test } from '@jest/globals';
import type { ClassMeeting } from '@jupiterp/jupiterp';
import {
  compactTimeRange,
  formatHourLabel,
  getImageHourBounds,
  imageFileName,
  layoutScheduleImage,
} from './ScheduleImage';
import { schedulify } from './Schedule';
import type { ScheduleSelection, UserEvent } from '../../types';

/** A `ScheduleSelection` with the given meetings. */
function selection(
  courseCode: string,
  meetings: ClassMeeting[] | string[],
  { hover = false, colorNumber = 0 } = {}
): ScheduleSelection {
  return {
    course: { courseCode } as ScheduleSelection['course'],
    section: {
      sectionCode: '0101',
      instructors: ['Jane Doe'],
      meetings,
    } as unknown as ScheduleSelection['section'],
    hover,
    differences: {
      instructors: false,
      numMeetings: false,
      meetingType: false,
      meetingTime: false,
      meetingLocation: false,
    },
    colorNumber,
  };
}

function meeting(days: string, start: number, end: number): ClassMeeting {
  return { classtime: { days, start, end }, location: { building: 'IRB', room: '0324' } };
}

function userEvent(name: string, days: string[], startTime: number, endTime: number): UserEvent {
  return { id: 'e1', name, days, startTime, endTime, location: 'Stamp', colorNumber: 3 } as UserEvent;
}

describe('getImageHourBounds', () => {
  test('defaults to 8 AM - 4 PM when nothing has a set time', () => {
    expect(getImageHourBounds(schedulify([]))).toEqual({ earliestHour: 8, latestHour: 16 });
    const asyncOnly = schedulify([selection('CMSC100', ['OnlineAsync'])]);
    expect(getImageHourBounds(asyncOnly)).toEqual({ earliestHour: 8, latestHour: 16 });
  });

  test('widens a short day to 8 hours around the classes', () => {
    const schedule = schedulify([selection('CMSC131', [meeting('MWF', 10, 10.833)])]);
    expect(getImageHourBounds(schedule)).toEqual({ earliestHour: 7, latestHour: 15 });
  });

  test('keeps a long day as is', () => {
    const schedule = schedulify([
      selection('CMSC131', [meeting('MWF', 8, 8.833)]),
      selection('MATH140', [meeting('TuTh', 17, 18.25)]),
    ]);
    expect(getImageHourBounds(schedule)).toEqual({ earliestHour: 8, latestHour: 19 });
  });
});

describe('layoutScheduleImage', () => {
  test('places a class once per meeting day', () => {
    const layout = layoutScheduleImage([selection('CMSC131', [meeting('MWF', 10, 11)])]);
    expect(layout.blocks).toHaveLength(3);
    expect(layout.columns.map((c) => c.name)).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
    expect(layout.blocks[0].title).toBe('CMSC131');
    expect(layout.blocks[0].details).toEqual(['10:00am - 11:00am', 'IRB 0324', 'Section 0101', 'Jane Doe']);
  });

  test('leaves out hover previews', () => {
    const layout = layoutScheduleImage([
      selection('CMSC131', [meeting('M', 10, 11)]),
      selection('MATH140', [meeting('M', 12, 13)], { hover: true }),
    ]);
    expect(layout.blocks.map((b) => b.title)).toEqual(['CMSC131']);
  });

  test('splits conflicting classes side by side', () => {
    const layout = layoutScheduleImage([
      selection('CMSC131', [meeting('M', 10, 11)]),
      selection('MATH140', [meeting('M', 10.5, 11.5)]),
    ]);
    const [first, second] = layout.blocks;
    expect(first.width).toBeCloseTo(second.width);
    expect(second.x).toBeGreaterThan(first.x + first.width);
  });

  test('adds an Other column for classes with no set time', () => {
    const layout = layoutScheduleImage([
      selection('CMSC131', [meeting('M', 10, 11)]),
      selection('ENGL101', ['OnlineAsync']),
    ]);
    expect(layout.columns.map((c) => c.name)).toContain('Other');
    const asyncBlock = layout.blocks.find((b) => b.title === 'ENGL101');
    expect(asyncBlock?.details[0]).toBe('Online async');
  });

  test('shows user events with their location and no section', () => {
    const layout = layoutScheduleImage([userEvent('Work', ['Tu'], 13, 15)]);
    expect(layout.blocks).toHaveLength(1);
    expect(layout.blocks[0].title).toBe('Work');
    expect(layout.blocks[0].details).toEqual(['1:00pm - 3:00pm', 'Stamp']);
  });
});

describe('layoutScheduleImage Other column', () => {
  test('shows a section with repeated untimed meetings once', () => {
    const layout = layoutScheduleImage([selection('PSYC100', ['OnlineAsync', 'OnlineAsync'])]);
    expect(layout.blocks.filter((b) => b.title === 'PSYC100')).toHaveLength(1);
  });
});

describe('compactTimeRange', () => {
  test('drops the start am/pm when it matches the end', () => {
    expect(compactTimeRange('9:00am - 9:50am')).toBe('9:00-9:50am');
    expect(compactTimeRange('11:00am - 12:15pm')).toBe('11:00am-12:15pm');
  });

  test('leaves other lines alone', () => {
    expect(compactTimeRange('IRB 0324')).toBe('IRB 0324');
  });
});

describe('formatHourLabel', () => {
  test('uses 12-hour time', () => {
    expect(formatHourLabel(0)).toBe('12 AM');
    expect(formatHourLabel(9)).toBe('9 AM');
    expect(formatHourLabel(12)).toBe('12 PM');
    expect(formatHourLabel(17)).toBe('5 PM');
  });
});

describe('imageFileName', () => {
  test('turns the schedule name into a safe file name', () => {
    expect(imageFileName('Plan B!')).toBe('Plan-B.png');
    expect(imageFileName('  Fall   2026 ')).toBe('Fall-2026.png');
    expect(imageFileName('???')).toBe('schedule.png');
  });
});
