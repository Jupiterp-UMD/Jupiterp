/**
 * This file is part of Jupiterp. For terms of use, please see the file
 * called LICENSE at the top level of the Jupiterp source tree (online at
 * https://github.com/atcupps/Jupiterp/LICENSE).
 * Copyright (C) 2026 Andrew Cupps
 *
 * @fileoverview Functions relating to searching for courses in Jupiterp.
 */

import type { Course, Instructor, InstructorsResponse } from '@jupiterp/jupiterp';
import { client } from '$lib/client';
import { CourseDataCache, type RequestInput } from './CourseDataCache';
import {
  DepartmentsStore,
  DeptSuggestionsStore,
  SearchResultsStore,
  ProfsLookupStore,
  CourseSearchFilterStore,
} from '../../stores/CoursePlannerStores';
import type { FilterParams } from '../../types';

const cache = new CourseDataCache();

// Load department list data
let deptCodes: string[];
export let deptCodeToName: Record<string, string> = {};
DepartmentsStore.subscribe((depts) => {
  deptCodes = depts.map((dept) => dept.deptCode);
  deptCodeToName = {};
  depts.forEach((dept) => {
    deptCodeToName[dept.deptCode] = dept.name;
  });
});

// Load professor name data
let profNames: string[] = [];
let profNamesReverse: string[] = [];
ProfsLookupStore.subscribe((profs) => {
  // The store is keyed by slug now, so the names for the `@professor` search
  // come from the values.
  //
  // Filtered rather than mapped straight across. A subscriber that throws takes
  // every subscriber registered after it down with it, because `set` notifies
  // them in order -- so when the column list stopped requesting `name`, this
  // callback did not just lose the professor search, it silently stopped the
  // rest of the planner being told the lookup had loaded at all. Skipping a row
  // with no name degrades to "that professor is unsearchable", which is a
  // proportionate failure for a missing field.
  profNames = Object.values(profs)
    .map((prof) => prof.name)
    .filter((name): name is string => typeof name === 'string' && name.length > 0);
  profNames.sort();

  profNamesReverse = profNames.map((name) => {
    const parts = name.split(' ');
    if (parts.length < 2) {
      return name;
    }

    const lastName = parts.pop();
    const firstNames = parts.join(' ');
    return `${lastName}, ${firstNames}`;
  });
  profNamesReverse.sort();
});

let mostRecentInput: string = '';

/**
 * Parses a raw search input for an @-prefix professor token, returning the
 * course-only query and any professor name extracted from `@"Full Name"` or
 * `@Word` tokens.
 * @param input Raw search input from the user
 */
function parseSearchInput(input: string): {
  courseQuery: string;
  professorQuery: string | null;
  isQuotedProfessor: boolean;
} {
  // @"Full Name" — quoted, complete professor name
  const quotedMatch = /@"([^"]+)"/.exec(input);
  if (quotedMatch) {
    return {
      courseQuery: input.replace(quotedMatch[0], '').trim(),
      professorQuery: quotedMatch[1],
      isQuotedProfessor: true,
    };
  }

  // @Word — unquoted, partial or single-word professor name
  const unquotedMatch = /@(\S+)/.exec(input);
  if (unquotedMatch) {
    return {
      courseQuery: input.replace(unquotedMatch[0], '').trim(),
      professorQuery: unquotedMatch[1],
      isQuotedProfessor: false,
    };
  }

  return { courseQuery: input, professorQuery: null, isQuotedProfessor: false };
}

// Filtering data
let filters: FilterParams = {
  serverSideFilters: {},
  clientSideFilters: {},
};
CourseSearchFilterStore.subscribe((newFilters) => {
  filters = newFilters;
  setSearchResults(mostRecentInput);
});

/**
 * Given an `input` (which should already be simplified to remove whitespace
 * and convert to uppercase), returns a list of department codes that match the
 * input.
 * @param input
 */
function resolveInputToDepartment(input: string): string[] {
  if (!deptCodes || input.length < 1) {
    return [];
  }

  // You may think that if the input length is 4 or longer, we should just
  // use that as the input to get from the cache. But consider that we need
  // to check that the input is a valid department code, which is an O(n)
  // operation anyway. So there's no point in adding additional logic for the
  // case where the input length is a full department code.
  const deptInput = input.length > 4 ? input.substring(0, 4) : input;
  const possibleDepts: string[] = deptCodes.filter((dept) => dept.startsWith(deptInput));

  return possibleDepts;
}

function filterAndSortCourseArray(courses: Course[]): Course[] {
  const sorted = courses.sort((a, b) => {
    return a.courseCode.localeCompare(b.courseCode);
  });

  const fs = filters.clientSideFilters;

  const filtered =
    fs.onlyOpen !== true
      ? sorted
      : sorted.map((course) => {
          if (course.sections === null || course.sections.length === 0) {
            return course;
          }

          const openSections = course.sections.filter((section) => {
            return section.openSeats > 0;
          });

          return {
            ...course,
            sections: openSections,
          };
        });

  if (
    fs.maxCredits === undefined &&
    fs.minCredits === undefined &&
    (fs.onlyOpen === undefined || fs.onlyOpen === false)
  ) {
    return sorted;
  }

  return filtered.filter((course) => {
    if (fs.onlyOpen === true && (course.sections === null || course.sections.length === 0)) {
      return false;
    }

    const maxCredits = fs.maxCredits ?? Number.MAX_SAFE_INTEGER;
    const minCredits = fs.minCredits ?? 0;

    if (course.maxCredits === null) {
      return course.minCredits >= minCredits && course.minCredits <= maxCredits;
    } else {
      return course.minCredits <= maxCredits && course.maxCredits >= minCredits;
    }
  });
}

/**
 * Given an `input`, search for any matching courses in the course data cache
 * (which retrieves from the API if necessary) and sets the `SearchResultsStore`
 * to the list of matching courses.
 * @param input A search input string
 */
export async function setSearchResults(input: string) {
  mostRecentInput = input;

  if (input.toLowerCase() === 'minecraft') {
    const isMono = localStorage.font === 'minecraft';
    localStorage.setItem('font', isMono ? 'default' : 'minecraft');
    document.documentElement.classList.toggle('minecraft');
  }

  const { courseQuery, professorQuery, isQuotedProfessor } = parseSearchInput(input);

  // Resolve the effective instructor from the @-prefix token.
  // A quoted @"Name" is used directly; an unquoted @Word is applied only
  // when it narrows down to exactly one professor match.
  let effectiveInstructor: string | undefined = undefined;
  if (isQuotedProfessor && professorQuery) {
    effectiveInstructor = professorQuery;
  } else if (professorQuery) {
    const matches = matchingStandardizedProfessorNames(professorQuery);
    if (matches.length === 1) {
      effectiveInstructor = matches[0];
    }
  }

  // Merge the @-prefix instructor with any other active server-side filters
  // (e.g. GenEd selections from the filters panel).
  const serverSideFilters = {
    ...filters.serverSideFilters,
    instructor: effectiveInstructor,
  };

  // Don't care about case or whitespace in course code searches
  const simpleInput: string = courseQuery.toUpperCase().replace(/\s/g, '');

  // If the search input matches a department code, get the courses for that
  // department and then filter by course number.
  const matchingDepts = resolveInputToDepartment(simpleInput);
  const shouldShowSuggestions = simpleInput.length > 0 && matchingDepts.length > 1;
  DeptSuggestionsStore.set(shouldShowSuggestions ? matchingDepts : []);

  if (matchingDepts.length === 1) {
    DeptSuggestionsStore.set([]);
    console.log(`Searching for dept: ${matchingDepts[0]}`);

    // Generate cache request input
    const requestInput: RequestInput = {
      type: 'deptCode',
      value: matchingDepts[0],
      filters: serverSideFilters,
    };

    // Get from cache/API
    const deptCourses: Course[] = filterAndSortCourseArray(await cache.getCoursesAndSections(requestInput));

    // Ensure that the department for this search is still the most recent
    // search. If not, abort to avoid displaying outdated results.
    if (cache.getMostRecentAccess() !== requestInput) {
      return;
    }

    // If the input contains no numbers, all dept courses are matching.
    if (simpleInput.length <= 4) {
      SearchResultsStore.set(deptCourses);
      return;
    }

    // Otherwise, filter by course number
    const inputCode = simpleInput.substring(4);
    const matchingCourses = deptCourses.filter((course) => {
      return course.courseCode.startsWith(inputCode, 4);
    });
    SearchResultsStore.set(matchingCourses);
    return;
  }

  // If we reach here, the input does not match a single department code.
  // This could be because the input is just numbers, or because it is
  // not a valid department code.

  // If the search is 3 numbers and optionally a letter,
  // match courses with the number (+ letter).
  if (simpleInput.length >= 3 && /^[0-9]{3}[A-Z]?$/i.test(simpleInput)) {
    const numberInput = simpleInput.substring(0, 3);

    const requestInput: RequestInput = {
      type: 'courseNumber',
      value: numberInput,
      filters: serverSideFilters,
    };

    const courses: Course[] = filterAndSortCourseArray(
      (await cache.getCoursesAndSections(requestInput)).filter((course) => {
        // API only matches the number, but the input may
        // include a letter suffix as well. Filter that here.
        return course.courseCode.substring(4).toUpperCase().startsWith(simpleInput);
      })
    );

    // Ensure that the course number for this search is still the most
    // recent search. If not, abort to avoid displaying outdated results.
    if (cache.getMostRecentAccess() !== requestInput) {
      return;
    }

    SearchResultsStore.set(courses);
    return;
  }

  // If we reach here, the input is not a valid department code or a course
  // number. If a professor or GenEd filter is active, search all courses.
  // Only trigger this broad search when the course query portion is empty.
  if (
    simpleInput.length === 0 &&
    ((serverSideFilters.genEds !== undefined && serverSideFilters.genEds.length > 0) ||
      effectiveInstructor !== undefined)
  ) {
    const requestInput: RequestInput = {
      type: 'deptCode',
      value: '', // Empty prefix to get all courses
      filters: serverSideFilters,
    };

    const courses: Course[] = filterAndSortCourseArray(await cache.getCoursesAndSections(requestInput));

    // Ensure that the course number for this search is still the most
    // recent search. If not, abort to avoid displaying outdated results.
    if (cache.getMostRecentAccess() !== requestInput) {
      return;
    }

    SearchResultsStore.set(courses);
    return;
  }

  // No matching search pattern and no active filters — clear results.
  SearchResultsStore.set([]);
  return;
}

/**
 * Creates and returns an object mapping instructor *slugs* to `Instructor`s.
 *
 * Keyed on slug rather than name. A name is not an identifier: Testudo's
 * spelling and the canonical instructor record disagree often enough to matter
 * ("Aaron Kyei-Asare" against "Aaron Kyei-asare"), and two real professors can
 * share one name outright -- there are two Douglas Hamiltons and two William
 * Martins. The previous version keyed on name and deleted both entries on a
 * collision, so those four professors were unreachable from the planner
 * entirely, and every spelling mismatch silently lost its link.
 *
 * Callers get the slug from `section.instructorSlugs`, which the API resolves
 * through the alias table rather than by matching strings.
 *
 * @param profs An array `Instructor[]` to be included in a lookup
 * @returns A `Record<string, Instructor>` keyed by slug.
 */
export function getProfsLookup(profs: Instructor[]): Record<string, Instructor> {
  const result: Record<string, Instructor> = {};
  for (const prof of profs) {
    if (prof.slug) {
      result[prof.slug] = prof;
    }
  }
  return result;
}

/**
 * Returns true if the most recent request is still awaiting results.
 */
export function pendingResults(): boolean {
  const result = cache.isPending();
  return result;
}

/**
 * Given a partial or un-formatted professor name, returns an array of
 * all matching standardized professor names. Also searches by last name.
 * @param partial A partial or un-formatted professor name
 */
export function matchingStandardizedProfessorNames(partial: string): string[] {
  const simpleInput: string = partial.toUpperCase().replace(/\s/g, '');
  const matches: string[] = [];
  for (const profName of profNames) {
    const simpleProfName: string = profName.toUpperCase().replace(/\s/g, '');
    if (simpleProfName.startsWith(simpleInput)) {
      matches.push(profName);
    }
  }
  for (const profName of profNamesReverse) {
    const simpleProfName: string = profName.toUpperCase().replace(/\s/g, '');
    if (simpleProfName.startsWith(simpleInput)) {
      // Convert back to normal name order
      const parts = profName.split(', ');
      if (parts.length < 2) {
        continue;
      }
      const firstNames = parts[1];
      const lastName = parts[0];
      const normalName = `${firstNames} ${lastName}`;
      if (!matches.includes(normalName)) {
        matches.push(normalName);
      }
    }
  }
  return matches;
}

/**
 * Fetch all active instructors from the API (paginated) and populate the
 * `ProfsLookupStore` with a name -> `Instructor` lookup. Used by both the
 * course planner and the schedule generator pages so instructor ratings are
 * available wherever they are needed. Errors are logged and swallowed so a
 * ratings failure never blocks the rest of the page.
 */
export async function loadInstructorLookup(): Promise<void> {
  try {
    const limit = 500;

    // Only the columns this lookup reads. The rest of the row -- the PlanetTerp
    // provenance columns, the timestamps, the normalized name -- was being
    // downloaded and discarded, which was about 94% of 1.3MB.
    //
    // `name` is one of them, and leaving it out broke the planner outright.
    // Two of the three consumers of `ProfsLookupStore` need only the slug and
    // the rating, which is what this list was trimmed to; the third is the
    // subscriber above that builds `profNames` for the `@professor` search, and
    // it reads `prof.name`. Without it every name was `undefined`, and the
    // `.split(' ')` that builds the reversed "Last, First" list threw inside
    // `ProfsLookupStore.set`, so every subscriber registered after that one
    // stopped being notified.
    const columns = ['slug', 'name', 'average_rating'];

    // The first page also asks for the total, which is what makes the rest
    // parallel. Without it the only way to find the end is to request pages
    // until one comes back short, and that is necessarily sequential: six
    // round trips, each waiting on the last, before the planner has any
    // ratings at all.
    const first: InstructorsResponse = await client.activeInstructors({
      limit,
      offset: 0,
      columns,
      count: true,
    });
    if (!first.ok() || first.data == null) {
      // format-check exempt 3
      throw new Error(
        `Failed to fetch instructors: ${first.statusCode} ` + `${first.statusMessage} ${first.errorBody}`
      );
    }

    const pages: Instructor[][] = [first.data];

    // `total` comes from the `Content-Range` header. It is null if the header
    // is unreadable -- it was, until the API started sending
    // `Access-Control-Expose-Headers`, because `Content-Range` is not exposed
    // to cross-origin JavaScript by default. Falling back to the sequential
    // walk keeps this working against an older API rather than silently
    // loading only the first 500 professors.
    if (first.total == null) {
      let offset = limit;
      let previous = first.data;
      while (previous.length === limit) {
        const next: InstructorsResponse = await client.activeInstructors({ limit, offset, columns });
        if (!next.ok() || next.data == null) {
          break;
        }
        pages.push(next.data);
        previous = next.data;
        offset += limit;
      }
    } else {
      const remaining: Promise<InstructorsResponse>[] = [];
      for (let offset = limit; offset < first.total; offset += limit) {
        remaining.push(client.activeInstructors({ limit, offset, columns }));
      }
      // A single rating page failing should cost its own rows, not the whole
      // lookup -- every professor it would have covered simply shows no rating,
      // which is already how an unrated professor renders.
      const settled = await Promise.allSettled(remaining);
      for (const result of settled) {
        if (result.status === 'fulfilled' && result.value.ok() && result.value.data != null) {
          pages.push(result.value.data);
        }
      }
    }

    ProfsLookupStore.set(getProfsLookup(pages.flat()));
  } catch (error) {
    console.error('Error fetching professor data:', error);
  }
}
