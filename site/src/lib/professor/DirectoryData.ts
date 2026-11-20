/** This file is part of Jupiterp. See LICENSE at the repository root.
 * Paged directory joins. Cache only visited professors; numeric sorts use
 * the API's global summary order, never a sort of just the visible page.
 */
import {
  searchInstructors,
  directoryGradeSummaries,
  instructorGradeSummary,
  instructorCourseGradeSummary,
  currentCourseCodesFor,
} from '../api/JupiterpApi';
import type { InstructorFull, InstructorGradeSummary } from '../api/types';
import { toDistribution } from '../course-planner/Grades';
import { matchesDirectory, type DirectoryProfessor, type DirectoryFilters } from './DirectoryModel';

interface Details {
  distribution: DirectoryProfessor['distribution'];
  courses: string[];
  gradesError: boolean;
}
const details = new Map<string, Promise<Details>>();

export function directoryDetails(slug: string, active = false): Promise<Details> {
  let pending = details.get(slug);
  if (!pending) {
    pending = Promise.allSettled([instructorGradeSummary(slug), instructorCourseGradeSummary(slug)]).then(
      async ([overall, courses]) => {
        let codes = courses.status === 'fulfilled' ? courses.value.data.map((row) => row.course_code) : [];
        if (!codes.length && active) codes = await currentCourseCodesFor(slug).catch(() => []);
        const result = {
          distribution: overall.status === 'fulfilled' && overall.value ? toDistribution(overall.value) : null,
          courses: [...new Set(codes)].sort(),
          gradesError: overall.status === 'rejected',
        };
        if (result.gradesError || courses.status === 'rejected') details.delete(slug);
        return result;
      }
    );
    if (details.size >= 250) details.delete(details.keys().next().value!);
    details.set(slug, pending);
  }
  return pending;
}

export interface DirectoryPage {
  rows: DirectoryProfessor[];
  cursor: number;
  more: boolean;
  total: number | null;
  warning: string;
}
export async function loadDirectoryPage(
  filters: DirectoryFilters,
  start: number,
  cancelled: () => boolean
): Promise<DirectoryPage> {
  const rows: DirectoryProfessor[] = [];
  let cursor = start;
  let more = true;
  let total: number | null = null;
  const numericSort = filters.sort.startsWith('gpa.') || filters.sort.startsWith('graded.');
  if (filters.letter && start === 0 && !numericSort) {
    // Seek directly into the server's alphabetic ordering instead of
    // downloading every earlier letter just to reach e.g. W or Z.
    const first = await searchInstructors({
      nameSearch: filters.query || undefined,
      activeOnly: filters.activeOnly,
      sortBy: 'name.asc',
      limit: 1,
      count: true,
    });
    if (first.total !== null) {
      let low = 0;
      let high = first.total;
      while (low < high && !cancelled()) {
        const middle = Math.floor((low + high) / 2);
        const page = await searchInstructors({
          nameSearch: filters.query || undefined,
          activeOnly: filters.activeOnly,
          sortBy: 'name.asc',
          limit: 1,
          offset: middle,
        });
        const name = page.data[0]?.name.toUpperCase() ?? '\uffff';
        if (name.localeCompare(filters.letter) < 0) low = middle + 1;
        else high = middle;
      }
      cursor = low;
    }
  }
  let batches = 0;
  // A bounded scan keeps sparse filters responsive. Show more continues it.
  while (rows.length < 10 && more && batches++ < 8 && !cancelled()) {
    let candidates: InstructorFull[];
    let summaries: InstructorGradeSummary[] = [];
    if (numericSort) {
      const page = await directoryGradeSummaries(`${filters.sort},instructor.asc`, cursor);
      summaries = page.data;
      more = summaries.length === 25;
      if (!summaries.length) break;
      const metadata = await searchInstructors({
        instructorSlugs: summaries.map((row) => row.instructor_slug).join(','),
        nameSearch: filters.query || undefined,
        activeOnly: filters.activeOnly,
        limit: 500,
      });
      const bySlug = new Map(metadata.data.map((row) => [row.slug, row]));
      candidates = summaries.flatMap((row) =>
        bySlug.has(row.instructor_slug) ? [bySlug.get(row.instructor_slug)!] : []
      );
    } else {
      const page = await searchInstructors({
        nameSearch: filters.query || undefined,
        activeOnly: filters.activeOnly,
        sortBy: `${filters.sort}${filters.sort.startsWith('name.') ? '' : ',name.asc'}`,
        ratings: filters.sort.startsWith('average_rating.') ? 'gte.0' : undefined,
        limit: 25,
        offset: cursor,
        count: true,
      });
      candidates = page.data;
      more = page.total !== null ? cursor + candidates.length < page.total : candidates.length === 25;
      if (filters.letter) {
        const boundary = candidates.findIndex(
          (row) => row.name.charAt(0).toUpperCase().localeCompare(filters.letter) > 0
        );
        if (boundary >= 0) {
          candidates = candidates.slice(0, boundary);
          more = false;
        }
      }
      if (!filters.hasRatings && !filters.hasGrades && !filters.letter) total = page.total;
    }
    const batchLength = numericSort ? summaries.length : candidates.length;
    if (!batchLength) break;
    // Four concurrent professors bound the number of supplementary grade requests.
    for (let index = 0; index < batchLength && !cancelled();) {
      const end = Math.min(batchLength, index + Math.min(4, 10 - rows.length));
      const slice = numericSort
        ? summaries.slice(index, end).flatMap((summary) => {
            const instructor = candidates.find((row) => row.slug === summary.instructor_slug);
            return instructor ? [{ instructor, summary }] : [];
          })
        : candidates.slice(index, end).map((instructor) => ({ instructor, summary: undefined }));
      const hydrated = await Promise.all(
        slice.map(async ({ instructor, summary }) => {
          const extra = await directoryDetails(instructor.slug, instructor.is_active);
          return {
            instructor,
            ...extra,
            distribution: summary ? toDistribution(summary) : extra.distribution,
            gradesError: summary ? false : extra.gradesError,
          };
        })
      );
      for (const row of hydrated) {
        if (filters.hasGrades && row.gradesError) throw new Error('Grade data could not be loaded.');
        if (matchesDirectory(row, filters)) rows.push(row);
      }
      cursor += end - index;
      index = end;
      if (rows.length >= 10)
        return {
          rows,
          cursor,
          more: more || index < batchLength,
          total,
          warning: rows.some((row) => row.gradesError)
            ? 'Some grade summaries are unavailable. Retry to load them.'
            : '',
        };
    }
  }
  return {
    rows,
    cursor,
    more,
    total,
    warning: more && rows.length < 10 ? 'More results may match. Select Show more to continue searching.' : '',
  };
}
