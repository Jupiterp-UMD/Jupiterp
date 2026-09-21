/**
 * This file is part of Jupiterp. For terms of use, please see the file
 * called LICENSE at the top level of the Jupiterp source tree (online at
 * https://github.com/atcupps/Jupiterp/LICENSE).
 *
 *
 * @fileoverview Types and interfaces used in Jupiterp
 */

import type { ClassMeeting, CourseBasic, GenEd, Section } from '@jupiterp/jupiterp';

/**
 * A section of a class selected by the user, along with metadata used for
 * displaying it on the schedule.
 */
// Any changes to `ScheduleSelection` need to be typechecked in `courseLoad.ts`
interface ScheduleSelection {
  /**
   * The course this selection belongs to
   */
  course: CourseBasic;

  /**
   * The section selected by the user
   */
  section: Section;

  /**
   * If this is true, the user has not actually selected this yet, but it is
   * being previewed on the schedule.
   */
  hover: boolean;

  /**
   * A list of strings that track how this selection differs from the most
   * up-to-date version of the section. This is used to display a warning
   * icon in the UI if the section has changed since the user added it to
   * their schedule.
   */
  differences: SelectionDifferences;

  /**
   * The number used to color-code this selection in the UI.
   */
  colorNumber: number;
}

interface SelectionDifferences {
  instructors: boolean;
  numMeetings: boolean;
  meetingType: boolean;
  meetingTime: boolean;
  meetingLocation: boolean;
}

/**
 * A selection stored in local storage, along with the name of the schedule
 */
interface StoredSchedule {
  scheduleName: string;
  selections: ScheduleBlock[];
}

/**
 * A ClassMeeting, with additional metadata used for displaying it on the
 * schedule.
 */
interface ClassMeetingExtended {
  /**
   * The course code of this meeting
   */
  courseCode: string;

  /**
   * The section code of this meeting
   */
  sectionCode: string;

  /**
   * Meeting data
   */
  meeting: ClassMeeting;

  /**
   * When there are multiple meetings that have overlapping times, they
   * conflict. To display them side-by-side, the meetings are sorted into
   * a minimal number of columns. The `conflictIndex` indicates which column
   * this meeting is in.
   */
  conflictIndex: number;

  /**
   * Indicates the total number of columns needed to display all conflicting
   * meetings.
   */
  conflictTotal: number;

  /**
   * Instructors for this meeting
   */
  instructors: string[];

  /**
   * If this is true, the user has not actually selected this yet, but it is
   * being previewed on the schedule.
   */
  hover: boolean;

  /**
   * The number used to color-code this meeting in the UI.
   */
  colorNumber: number;

  /**
   * A list of strings that track how this meeting differs from the most
   * up-to-date version of the section. This is used to display a warning
   * icon in the UI if the section has changed since the user added it to
   * their schedule.
   */
  differences: SelectionDifferences;

  /**
   * Notes added by the user for this event block, which are displayed on the schedule.
   *
   * This is only really used for user-created events (`UserEvent`) but is
   * included here so that this type can be used for both course and user events
   * to simplify rendering logic.
   */
  notes?: string;

  /**
   * For user-created events, the ID of the originating `UserEvent`.
   * Used to match a rendered block back to its store entry for removal.
   */
  id?: string;

  /**
   * If this is a user-created event block
   * Helps differentiate between standard course meetings and user-created events when rendering
   */
  userEvent?: boolean;
}

/**
 * A schedule, organized by day of the week.
 */
interface Schedule {
  monday: ClassMeetingExtended[];
  tuesday: ClassMeetingExtended[];
  wednesday: ClassMeetingExtended[];
  thursday: ClassMeetingExtended[];
  friday: ClassMeetingExtended[];
  other: ClassMeetingExtended[];
}

interface ClasstimeBound {
  earliestStart: number;
  latestEnd: number;
}

/**
 * Legacy version of course selections used in local storage.
 * @deprecated Use `ScheduleSelection` instead.
 */
interface LegacyScheduleSelection {
  course: LegacyCourse;
  section: LegacySection;
  courseCode: string;
  hover: boolean;
  differences: string[];
  credits: number;
  colorNumber: number;
}

/**
 * Legacy version of StoredSchedule used in local storage.
 * @deprecated Use `StoredSchedule` instead.
 */
interface LegacyStoredSchedule {
  scheduleName: string;
  selections: LegacyScheduleSelection[];
}

/**
 * Legacy version of Course used in local storage.
 * @deprecated Use `Course` from @jupiterp/jupiterp instead.
 */
interface LegacyCourse {
  code: string;
  name: string;
  credits: CreditCount;
  gen_eds: string[] | null;
  conditions: string[] | null;
  description: string;
  sections: LegacySection[] | null;
}

/**
 * Legacy version of Section used in local storage.
 * @deprecated Use `Section` from @jupiterp/jupiterp instead.
 */
interface LegacySection {
  sec_code: string;
  instructors: string[];
  class_meetings: LegacyClassMeeting[];
}

/**
 * Number of credits, either a fixed amount or a range.
 * @deprecated Use `Course` from @jupiterp/jupiterp instead.
 */
type CreditCount = { Amount: number } | { Range: number[] };

/**
 * Legacy version of ClassMeeting used in local storage.
 * @deprecated Use `ClassMeeting` from @jupiterp/jupiterp instead.
 */
type LegacyClassMeeting = string | { OnlineSync: LegacyClasstime } | { InPerson: InPersonClass };

/**
 * Legacy version of InPersonClass used in local storage.
 * @deprecated Use `ClassMeeting` from @jupiterp/jupiterp instead.
 */
interface InPersonClass {
  classtime: LegacyClasstime | null;
  location: string[] | null;
}

/**
 * Legacy version of Classtime used in local storage.
 * @deprecated Use `Classtime` from @jupiterp/jupiterp instead.
 */
interface LegacyClasstime {
  days: string;
  start_time: TimeComponent[];
  end_time: TimeComponent[];
}

/**
 * A component of time, either a number (for hours and minutes) or a string
 * (for "AM" and "PM").
 * @deprecated Use `Classtime` from @jupiterp/jupiterp instead.
 */
type TimeComponent = number | string;

interface UserEvent {
  id: string;
  name: string;
  days: string[];
  startTime: number;
  endTime: number;
  location: string;
  notes: string;
  colorNumber: number;
}

type ScheduleBlock = UserEvent | ScheduleSelection;

export interface CourseSectionPair {
  courseCode: string;
  sectionCode: string;
}

/**
 * Parameters for filtering course search results.
 */
export interface FilterParams {
  serverSideFilters: ServerSideFilterParams;
  clientSideFilters: ClientSideFilterParams;
}

export interface ServerSideFilterParams {
  genEds?: GenEd[];
  instructor?: string;
}

export interface ClientSideFilterParams {
  minCredits?: number;
  maxCredits?: number;
  onlyOpen?: boolean;
}
