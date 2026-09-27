/**
 * This file is part of Jupiterp. For terms of use, please see the file
 * called LICENSE at the top level of the Jupiterp source tree (online at
 * https://github.com/atcupps/Jupiterp/LICENSE).
 *
 *
 * @fileoverview Contains hardcoded term and start/end dates for the current semester.
 */

/** UMD term ID: `YYYY` + `01` spring, `05` summer, `08` fall, `12` winter. */
export const TERM_ID = '202701';

/** Human-readable term name shown in the UI. */
export const TERM_NAME = 'Spring 2027';

/** First and last day of classes. Month is 0-indexed, Jan = 0, and its YY, MM, DD. */
export const TERM_START = new Date(2027, 0, 27);
export const TERM_END = new Date(2027, 4, 11);
