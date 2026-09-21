/**
 * This file is part of Jupiterp. For terms of use, please see the file
 * called LICENSE at the top level of the Jupiterp source tree (online at
 * https://github.com/atcupps/Jupiterp/LICENSE).
 *
 *
 * @fileoverview Encodes and decodes a schedule as a short, shareable URL
 * token ("permalink"). A schedule is fully reconstructable from an ordered
 * list of (courseCode, sectionCode) pairs; all other section data is
 * re-fetched live from the API when the link is opened. These functions are
 * pure (no API / `$lib` imports) so they can be unit tested directly; the
 * data-fetching reconstruction lives in `CourseLoad.ts`.
 */

import type { Course } from '@jupiterp/jupiterp';
import type { CourseSectionPair, ScheduleBlock, ScheduleSelection } from '../../types';
import { noDifferences } from './Schedule';

/** Query parameter that carries a shared schedule, e.g. `?s=2~CMSC4Aq8z`. */
export const SHARE_PARAM = 's';

/**
 * Schema version emitted by `encodeSchedule`. `decodeSchedule` understands
 * every version listed below, so links shared under an older format keep
 * working after a bump.
 *
 * - `1` — readable literal pairs: `1~CMSC131-0101.MATH140-0501`
 * - `2` — dept letters + a base62-packed number/section token (this version)
 */
const SCHEMA_VERSION = '2';

/** Separates encoded course segments from each other. */
const PAIR_SEPARATOR = '.';

/** Separates a courseCode from a sectionCode in a literal (fallback) segment. */
const FIELD_SEPARATOR = '-';

/** Separates the schema version from the payload. */
const VERSION_SEPARATOR = '~';

/**
 * Base62 alphabet (URL-unreserved, and notably free of `-`, which lets the v2
 * decoder tell a packed segment apart from a literal `course-section` one).
 */
const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

/**
 * Width of a packed token. A course packs into 29 bits (10 number + 5 suffix +
 * 14 section), and 62^5 comfortably covers that, so every packed token is
 * exactly 5 chars — which is what lets the decoder split dept (everything
 * before) from the packed value (the last 5 chars) without a delimiter.
 */
const PACKED_WIDTH = 5;

// Bit layout of a packed course: [ number:10 | suffix:5 | section:14 ].
const SECTION_BITS = 14;
const SUFFIX_BITS = 5;

/** Matches a "standard" course code: dept letters, a 3-digit number, optional 1-letter suffix. */
const PACKABLE_COURSE = /^([A-Za-z]+)(\d{3})([A-Za-z]?)$/;

/** A packable section is exactly four digits, e.g. `0101`. */
const PACKABLE_SECTION = /^\d{4}$/;

/** Encode `n` as a fixed-width base62 string (left-padded with `0`s). */
function toBase62(n: number, width: number): string {
  let out = '';
  for (let i = 0; i < width; i++) {
    out = BASE62[n % 62] + out;
    n = Math.floor(n / 62);
  }
  return out;
}

/** Decode a base62 string, or return `-1` if it contains an invalid character. */
function fromBase62(s: string): number {
  let n = 0;
  for (const ch of s) {
    const digit = BASE62.indexOf(ch);
    if (digit === -1) {
      return -1;
    }
    n = n * 62 + digit;
  }
  return n;
}

/**
 * Encode one selection as the shortest segment that round-trips exactly:
 * `DEPT` + a 5-char packed token for standard codes, or the literal
 * `courseCode-sectionCode` for anything that doesn't fit the packable shape
 * (4-digit numbers, lettered sections, etc.).
 */
function encodeSegment(courseCode: string, sectionCode: string): string {
  const course = PACKABLE_COURSE.exec(courseCode);
  if (course && PACKABLE_SECTION.test(sectionCode)) {
    const dept = course[1];
    const number = parseInt(course[2], 10);
    const suffix = course[3] ? course[3].toUpperCase().charCodeAt(0) - 64 : 0; // A=1..Z=26
    const section = parseInt(sectionCode, 10);
    const packed = (number << (SUFFIX_BITS + SECTION_BITS)) | (suffix << SECTION_BITS) | section;
    return dept + toBase62(packed, PACKED_WIDTH);
  }
  return `${courseCode}${FIELD_SEPARATOR}${sectionCode}`;
}

/**
 * Encode a schedule's course selections into a compact, URL-safe token.
 *
 * Only real (non-preview) course sections are included; custom `UserEvent`s
 * are intentionally excluded. The token uses only RFC 3986 "unreserved"
 * characters, so it never needs percent-encoding.
 *
 * @param selections The schedule blocks to encode.
 * @returns A token like `2~CMSC4Aq8z.MATH...`, or `''` if there are no course
 *          sections to share.
 */
export function encodeSchedule(selections: ScheduleBlock[]): string {
  const segments = selections
    .filter((s): s is ScheduleSelection => 'course' in s && !s.hover)
    .map((s) => encodeSegment(s.course.courseCode, s.section.sectionCode));

  if (segments.length === 0) {
    return '';
  }

  return `${SCHEMA_VERSION}${VERSION_SEPARATOR}${segments.join(PAIR_SEPARATOR)}`;
}

/** Decode a literal `courseCode-sectionCode` segment, or `null` if malformed. */
function decodeLiteralSegment(token: string): CourseSectionPair | null {
  // Course codes never contain `-`, so the last `-` splits course/section.
  const split = token.lastIndexOf(FIELD_SEPARATOR);
  if (split <= 0 || split === token.length - 1) {
    return null;
  }
  return {
    courseCode: token.slice(0, split),
    sectionCode: token.slice(split + 1),
  };
}

/** Decode a `DEPT` + packed-token segment, or `null` if malformed. */
function decodePackedSegment(token: string): CourseSectionPair | null {
  const dept = token.slice(0, -PACKED_WIDTH);
  if (!dept) {
    return null;
  }
  const packed = fromBase62(token.slice(-PACKED_WIDTH));
  if (packed < 0) {
    return null;
  }

  const number = (packed >> (SUFFIX_BITS + SECTION_BITS)) & 0x3ff; // 10 bits
  const suffix = (packed >> SECTION_BITS) & 0x1f; // 5 bits
  const section = packed & 0x3fff; // 14 bits
  const suffixLetter = suffix >= 1 && suffix <= 26 ? String.fromCharCode(64 + suffix) : '';

  return {
    courseCode: dept + String(number).padStart(3, '0') + suffixLetter,
    sectionCode: String(section).padStart(4, '0'),
  };
}

/** v1 payload: literal pairs only. */
function decodeV1(payload: string): CourseSectionPair[] {
  const pairs: CourseSectionPair[] = [];
  for (const token of payload.split(PAIR_SEPARATOR)) {
    const pair = decodeLiteralSegment(token);
    if (pair) {
      pairs.push(pair);
    }
  }
  return pairs;
}

/** v2 payload: a segment with `-` is literal; otherwise it is packed. */
function decodeV2(payload: string): CourseSectionPair[] {
  const pairs: CourseSectionPair[] = [];
  for (const token of payload.split(PAIR_SEPARATOR)) {
    const pair = token.includes(FIELD_SEPARATOR)
      ? decodeLiteralSegment(token)
      : token.length > PACKED_WIDTH
        ? decodePackedSegment(token)
        : null;
    if (pair) {
      pairs.push(pair);
    }
  }
  return pairs;
}

/**
 * Decode a share token back into the course/section pairs it represents.
 *
 * Tolerant of malformed input: an unrecognized version or any unparseable
 * segment yields `[]` (or skips just that segment) rather than throwing, so a
 * broken or truncated link degrades gracefully instead of crashing load.
 * Older schema versions still decode, so previously-shared links keep working.
 *
 * @param param The raw token from the `s` query parameter.
 * @returns The decoded `CourseSectionPair[]` (possibly empty).
 */
export function decodeSchedule(param: string): CourseSectionPair[] {
  if (!param) {
    return [];
  }

  const versionEnd = param.indexOf(VERSION_SEPARATOR);
  if (versionEnd === -1) {
    return [];
  }

  const version = param.slice(0, versionEnd);
  const payload = param.slice(versionEnd + 1);
  if (!payload) {
    return [];
  }

  if (version === '1') {
    return decodeV1(payload);
  }
  if (version === '2') {
    return decodeV2(payload);
  }
  return [];
}

/**
 * Reconstruct full `ScheduleSelection`s from decoded pairs and freshly-fetched
 * course data. Pairs whose course or section no longer exist are silently
 * skipped, so a stale link still opens whatever is still valid. Selections are
 * built directly from the live section (with `noDifferences()`) so the opened
 * schedule never shows a spurious "section changed" warning.
 *
 * This is pure: the caller is responsible for fetching `courses`.
 *
 * @param pairs Decoded course/section pairs, in display order.
 * @param courses Up-to-date course data keyed by course code.
 * @returns The reconstructed selections (color numbers assigned by index).
 */
export function buildSharedSelections(
  pairs: CourseSectionPair[],
  courses: Record<string, Course>
): ScheduleSelection[] {
  const result: ScheduleSelection[] = [];

  pairs.forEach((pair) => {
    const course = courses[pair.courseCode];
    if (!course || !course.sections) {
      return;
    }

    const section = course.sections.find((s) => s.sectionCode === pair.sectionCode);
    if (!section) {
      return;
    }

    result.push({
      course: {
        courseCode: course.courseCode,
        name: course.name,
        minCredits: course.minCredits,
        maxCredits: course.maxCredits,
        description: course.description,
        genEds: course.genEds,
        conditions: course.conditions,
      },
      section,
      hover: false,
      differences: noDifferences(),
      colorNumber: result.length,
    });
  });

  return result;
}
