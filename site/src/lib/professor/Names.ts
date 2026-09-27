/**
 * This file is part of Jupiterp. For terms of use, please see the file
 * called LICENSE at the top level of the Jupiterp source tree (online at
 * https://github.com/atcupps/Jupiterp/LICENSE).
 * Copyright (C) 2026 Andrew Cupps
 *
 * @fileoverview Name normalization, the TypeScript third of a three-way
 * contract.
 *
 * The other two are:
 *
 *     SQL     normalize_name() / slugify()   scraper/db/migrations/0001_*.sql
 *     Python  normalize_name() / slugify()   scraper/names.py
 *
 * All three are exercised against the same fixture set. A drift between any
 * two of them produces duplicate instructor records, and -- because the slug
 * comes from the same normalization -- permanently broken professor URLs once
 * pages are indexed. Change the fixtures first, then all three.
 *
 * The site needs this because the API matches `nameSearch` against a
 * normalized column: an un-normalized query finds nothing, since searching
 * "O'Brien" against the stored "o brien" fails on the apostrophe.
 */

/**
 * Characters PostgreSQL's `unaccent` maps but Unicode NFKD decomposition does
 * not, because they are not composed characters at all. Without these the
 * three implementations disagree on exactly the names most likely to be
 * spelled inconsistently in the first place.
 */
const UNACCENT_EXTRA: Record<string, string> = {
  Ø: 'O',
  ø: 'o',
  Đ: 'D',
  đ: 'd',
  Ł: 'L',
  ł: 'l',
  Æ: 'AE',
  æ: 'ae',
  Œ: 'OE',
  œ: 'oe',
  Þ: 'TH',
  þ: 'th',
  Ð: 'D',
  ð: 'd',
  ß: 'ss',
  ı: 'i',
};

/**
 * Combining marks left behind by NFKD decomposition.
 *
 * `\p{M}` rather than the U+0300-U+036F block. Python's half of this contract
 * uses `unicodedata.combining()`, which covers every combining mark in every
 * script, while the block covers only Combining Diacritical Marks. The two
 * agree on Latin names -- NFKD of a Latin letter never produces a mark outside
 * that block, which is why the shared fixtures never caught it -- and disagree
 * on names in scripts the fixtures do not reach. Matching Python here removes
 * a drift the tests could not see.
 */
const COMBINING_MARKS = /\p{M}/gu;

/** Anything that is not an ASCII letter or digit, after unaccenting. */
const NON_ALNUM = /[^a-z0-9]+/g;

/**
 * Values Testudo prints where no real instructor has been assigned. Compared
 * whole and never as a substring: "Stafford Jones" is a person, and "Tabatha
 * Bacon" must not be caught by a test for "tba".
 */
export const DENYLIST: ReadonlySet<string> = new Set([
  'tba',
  'tbd',
  'staff',
  'instructor',
  'instructor tba',
  'instructor tbd',
  'instructor staff',
  'no instructor',
  'unknown',
  'not assigned',
  'to be announced',
  'to be determined',
]);

function unaccent(value: string): string {
  let mapped = '';
  for (const char of value) {
    mapped += UNACCENT_EXTRA[char] ?? char;
  }
  return mapped.normalize('NFKD').replace(COMBINING_MARKS, '');
}

/**
 * Canonical form of a name for matching.
 *
 * Unaccent, lowercase, replace every run of non-alphanumeric characters with a
 * single space, trim. Returns null for anything that normalizes to nothing.
 *
 *     'Walsh, Shane Bolles' -> 'walsh shane bolles'
 *     "Erin O'Brien"        -> 'erin o brien'
 *     'José García'         -> 'jose garcia'
 *
 * Punctuation collapses to a space rather than to nothing so that "O'Brien"
 * and "O Brien" agree; deleting it would give "obrien", which then fails to
 * match the spaced spelling Testudo prints.
 *
 * Does not reorder "Last, First" and does not drop middle names. The first is
 * the caller's job because only the caller knows the source; the second is a
 * matching step with its own confidence level, not a normalization step.
 */
export function normalizeName(raw: string | null | undefined): string | null {
  if (raw === null || raw === undefined) {
    return null;
  }
  const collapsed = unaccent(raw).toLowerCase().replace(NON_ALNUM, ' ').trim();
  return collapsed === '' ? null : collapsed;
}

/**
 * Professor page URL slug.
 *
 * Frozen once professor pages are indexed: changing it breaks every shared
 * link. Defined as `normalizeName` with spaces as hyphens so the two cannot
 * drift apart.
 *
 * Collision handling ('david-levin', 'david-levin-2') needs to see the
 * instructors table and lives in SQL. This function never produces a suffix,
 * so it must not be used to *derive* a professor's URL -- read `slug` from the
 * API. It exists for tests and for building a search term.
 */
export function slugify(raw: string | null | undefined): string | null {
  const normalized = normalizeName(raw);
  return normalized === null ? null : normalized.replaceAll(' ', '-');
}

/** True for placeholder values that are not real instructors. */
export function isDenylisted(raw: string | null | undefined): boolean {
  const normalized = normalizeName(raw);
  return normalized === null || DENYLIST.has(normalized);
}

/** Last whitespace-separated token of an already-normalized name. */
export function surname(normalized: string): string {
  const parts = normalized.split(' ');
  return parts[parts.length - 1];
}

/** Drop middle names: 'shane bolles walsh' -> 'shane walsh'. */
export function firstLast(normalized: string): string {
  const parts = normalized.split(' ');
  if (parts.length < 2) {
    return normalized;
  }
  return `${parts[0]} ${parts[parts.length - 1]}`;
}
