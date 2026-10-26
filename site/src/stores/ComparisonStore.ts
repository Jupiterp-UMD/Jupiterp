/**
 * This file is part of Jupiterp. For terms of use, please see LICENSE at
 * https://github.com/atcupps/Jupiterp/LICENSE.
 */
import { writable } from 'svelte/store';

export interface ComparisonSelection {
  slug: string;
  name: string;
  courses: string[];
  course?: string | null;
}

export const ComparisonStore = writable<ComparisonSelection[]>([]);

export function addToComparison(professor: ComparisonSelection) {
  ComparisonStore.update((selected) =>
    selected.some((entry) => entry.slug === professor.slug) || selected.length >= 2
      ? selected
      : [...selected, professor]
  );
}

export function removeFromComparison(slug: string) {
  ComparisonStore.update((selected) => selected.filter((professor) => professor.slug !== slug));
}
