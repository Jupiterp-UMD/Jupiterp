/**
 * This file is part of Jupiterp. For terms of use, please see the file
 * called LICENSE at the top level of the Jupiterp source tree (online at
 * https://github.com/atcupps/Jupiterp/LICENSE).
 *
 *
 * @fileoverview Contains functions used to modernize legacy schedule types
 * to current formats.
 */

import {
  GenEd,
  type ClassMeeting,
  type Classtime,
  type CourseBasic,
  type Location,
  type Section,
} from '@jupiterp/jupiterp';
import type {
  CreditCount,
  LegacyClassMeeting,
  LegacyCourse,
  LegacyScheduleSelection,
  LegacySection,
  ScheduleBlock,
  ScheduleSelection,
  TimeComponent,
} from '../../types';
import { noDifferences } from './Schedule';

function extractMinCredits(legacy: CreditCount): number {
  if ('Amount' in legacy) {
    return legacy.Amount;
  }

  return legacy.Range[0];
}

function extractMaxCredits(legacy: CreditCount): number | null {
  if ('Amount' in legacy) {
    return null;
  }

  return legacy.Range[1];
}

function modernizeCourse(legacy: LegacyCourse): CourseBasic {
  return {
    courseCode: legacy.code,
    name: legacy.name,
    minCredits: extractMinCredits(legacy.credits),
    maxCredits: extractMaxCredits(legacy.credits),
    genEds: legacy.gen_eds?.map(GenEd.fromCode) ?? null,
    conditions: legacy.conditions,
    description: legacy.description,
  };
}

function timeComponentsToNumber(time: TimeComponent[]): number {
  let result: number = 0;
  if (typeof time[0] == 'number') {
    result += time[0];
  }
  if (typeof time[1] == 'number') {
    result += time[1] / 60;
  }
  if (time[2] === 'Pm' && time[0] != 12) {
    result += 12;
  }
  return result;
}

function modernizeMeeting(legacy: LegacyClassMeeting): ClassMeeting {
  if (typeof legacy === 'string') {
    switch (legacy) {
      case 'TBA':
        return 'TBA';
      case 'OnlineAsync':
        return 'OnlineAsync';
      case 'Unspecified':
        return 'Unspecified';
      default:
        return 'Unknown';
    }
  }

  let classtime: Classtime;
  let location: Location;
  if ('OnlineSync' in legacy) {
    classtime = {
      days: legacy.OnlineSync.days,
      start: timeComponentsToNumber(legacy.OnlineSync.start_time),
      end: timeComponentsToNumber(legacy.OnlineSync.end_time),
    };
    location = {
      building: 'OnlineSync',
      room: null,
    };
  } else {
    classtime = {
      days: legacy.InPerson.classtime?.days ?? 'TBA',
      start: legacy.InPerson.classtime == null ? 8 : timeComponentsToNumber(legacy.InPerson.classtime.start_time),
      end: legacy.InPerson.classtime == null ? 8 : timeComponentsToNumber(legacy.InPerson.classtime.end_time),
    };
    location = {
      building:
        legacy.InPerson.location == null || legacy.InPerson.location.length === 0 ? 'TBA' : legacy.InPerson.location[0],
      room:
        legacy.InPerson.location == null || legacy.InPerson.location.length < 2 ? null : legacy.InPerson.location[1],
    };
  }

  return {
    classtime,
    location,
  };
}

function modernizeMeetings(legacy: LegacyClassMeeting[]): ClassMeeting[] {
  return legacy.map(modernizeMeeting);
}

function modernizeSection(courseCode: string, legacy: LegacySection): Section {
  return {
    courseCode,
    sectionCode: legacy.sec_code,
    instructors: legacy.instructors,
    meetings: modernizeMeetings(legacy.class_meetings),
    openSeats: 0, // set later
    totalSeats: 0, // set later
    waitlist: 0, // set later
    holdfile: null, // set later
  };
}

function modernizeSelection(selection: LegacyScheduleSelection): ScheduleSelection {
  return {
    course: modernizeCourse(selection.course),
    section: modernizeSection(selection.courseCode, selection.section),
    hover: false,
    differences: noDifferences(), // set these later
    colorNumber: 0, // set later
  };
}

export function assignColorNumbers(selections: ScheduleBlock[]): ScheduleBlock[] {
  for (let i = 0; i < selections.length; i++) {
    selections[i].colorNumber = i;
  }
  return selections;
}

export function modernizeSelections(selections: LegacyScheduleSelection[]): ScheduleSelection[] {
  return selections.map(modernizeSelection);
}
