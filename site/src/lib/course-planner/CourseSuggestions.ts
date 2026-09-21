/**
 * This file is part of Jupiterp. For terms of use, please see the file
 * called LICENSE at the top level of the Jupiterp source tree (online at
 * https://github.com/atcupps/Jupiterp/LICENSE).
 *
 *
 * @fileoverview Pure helpers for the course-search professor suggestions,
 * shared by the planner and generator search boxes. Kept free of Svelte and
 * `$lib` imports so the token parsing/rewriting can be unit-tested directly.
 */

/**
 * Returns the partial professor name from an unquoted `@word` token in `input`,
 * or null if no such token is present. Complete `@"..."` tokens are ignored
 * since they are already resolved.
 * @param input Raw search input string
 */
export function getProfPartial(input: string): string | null {
  const withoutQuoted = input.replace(/@"[^"]*"/g, '');
  const match = /@(\S*)/.exec(withoutQuoted);
  return match && match[1].length >= 1 ? match[1] : null;
}

/**
 * Replaces the unquoted `@partial` token in `input` with the standardized
 * professor `name` — `@"Full Name"` for multi-word names or `@Name` for
 * single-word names. Returns `input` unchanged when there is no partial token.
 * @param input Raw search input string
 * @param name The standardized professor name to insert
 */
export function applyProfessorSelection(input: string, name: string): string {
  const partial = getProfPartial(input);
  if (partial === null) return input;
  const token = `@${partial}`;
  const replacement = name.includes(' ') ? `@"${name}"` : `@${name}`;
  return input.replace(token, replacement);
}
