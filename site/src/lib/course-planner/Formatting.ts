/**
 * This file is part of Jupiterp. For terms of use, please see the file
 * called LICENSE at the top level of the Jupiterp source tree (online at
 * https://github.com/atcupps/Jupiterp/LICENSE).
 *
 *
 * @fileoverview Functions for formatting various Jupiterp objects as strings.
 */

import { TERM_ID } from '../term';
import type { Classtime, Location } from '@jupiterp/jupiterp';

/**
 * Format a `Classtime` as a `string`, including the days
 * @param time A `Classtime` to be formatted
 * @returns A `string` representation of `time`, including days
 */
export function formatClassDayTime(time: Classtime): string {
  return time.days + ' ' + formatClasstime(time);
}

/**
 * Format just the time portion of a `Classtime` as a `string`
 * @returns A `string` representation of the time portion of a `Classtime`
 */
export function formatClasstime(time: Classtime): string {
  const startTimeNumber = time.start;
  const endTimeNumber = time.end;

  let startHours = Math.floor(startTimeNumber) % 12;
  if (startHours === 0) startHours = 12; // handle midnight and noon
  const startMinutes = Math.round((startTimeNumber - Math.floor(startTimeNumber)) * 60);

  let endHours = Math.floor(endTimeNumber) % 12;
  if (endHours === 0) endHours = 12; // handle midnight and noon
  const endMinutes = Math.round((endTimeNumber - Math.floor(endTimeNumber)) * 60);

  const startAmPm = startTimeNumber >= 12 ? 'pm' : 'am';
  const endAmPm = endTimeNumber >= 12 ? 'pm' : 'am';

  // format-check exempt 1
  return `${startHours}:${('0' + startMinutes).slice(-2)}${startAmPm} - ${endHours}:${('0' + endMinutes).slice(-2)}${endAmPm}`;
}

/**
 * Format a range of credits as a string
 * @param minCredits A minimum number of credits
 * @param maxCredits A maximum number of credits
 * @returns A string representation of the credit range
 */
export function formatCredits(minCredits: number, maxCredits: number | null): string {
  if (maxCredits !== null && maxCredits !== minCredits) {
    return minCredits + ' - ' + maxCredits;
  } else {
    return minCredits.toString();
  }
}

/**
 * Format a building name, converting 'OnlineSync' to 'Online'
 * @param building A building name to format
 * @returns A formatted building name
 */
function formatPossibleOnlineSync(building: string): string {
  if (building === 'OnlineSync') {
    return 'Online';
  }

  return building;
}

/**
 * Format a `Location` as a `string`
 * @param location A `Location` to format
 * @returns A `string` representation of the `Location`
 */
export function formatLocation(location: Location): string {
  return location.room
    ? formatPossibleOnlineSync(location.building) + ' ' + location.room
    : formatPossibleOnlineSync(location.building);
}

/**
 * Formats `instructors` as a single `string`
 * @param instructors An array of `string`s, each representing an instructor
 * @returns Instructors formatted as a single `string`
 */
export function formatInstructors(instructors: string[]): string {
  return instructors.join(', ');
}

/**
 * Generates a link to the UMD Testudo page for a given course code
 * @param courseCode The course code for which to generate a link
 */
export function testudoLink(courseCode: string): string {
  // format-check exempt 1
  return (
    'https://app.testudo.umd.edu/soc/search?courseId=' +
    courseCode +
    '&sectionId=&termId=' +
    TERM_ID +
    '&_openSectionsOnly=on&creditCompare=%3E%3D&credits=0.0&courseLevelFilter=ALL&instructor=&_facetoface=on&_blended=on&_online=on&courseStartCompare=&courseStartHour=&courseStartMin=&courseStartAM=&courseEndHour=&courseEndMin=&courseEndAM=&teachingCenter=ALL&_classDay1=on&_classDay2=on&_classDay3=on&_classDay4=on&_classDay5=on'
  );
}

/**
 * Splits a `code` into its four letter department code and three numbers
 * as a single string, space delimited.
 * Example: `splitCourseCode('CMSC424') --> 'CMSC 424'
 * @param code A `string` code to split apart
 * @returns `code` split into
 */
export function splitCourseCode(code: string): string {
  return code.slice(0, 4) + ' ' + code.slice(4);
}
