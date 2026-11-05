/**
 * This file is part of Jupiterp. For terms of use, please see the file
 * called LICENSE at the top level of the Jupiterp source tree (online at
 * https://github.com/atcupps/Jupiterp/LICENSE).
 * Copyright (C) 2026 Andrew Cupps
 *
 * @fileoverview Which rating a professor page shows.
 */

import { describe, expect, jest, test } from '@jest/globals';
import type { InstructorFull } from '../api/types';
import { displayRating, rankingRating, ratingBreakdown, withDisplayRating } from './Rating';

function instructor(overrides: Partial<InstructorFull>): InstructorFull {
  return {
    id: 1,
    slug: 'joseph-conroy',
    name: 'Joseph Conroy',
    average_rating: null,
    pt_average_rating: null,
    pt_review_count: null,
    pt_snapshot_at: null,
    jupiterp_rating: null,
    jupiterp_review_count: 0,
    display_rating: null,
    combined_rating: null,
    first_seen_term: null,
    last_seen_term: null,
    is_active: true,
    ...overrides,
  };
}

describe('ratingBreakdown', () => {
  // The case that prompted `display_rating`: one 5-star PlanetTerp review,
  // shown as 3.9 because the ranking score is mostly the site-wide mean.
  test('shows the reviews average, not the ranking score', () => {
    const rating = ratingBreakdown(
      instructor({
        pt_average_rating: 5,
        pt_review_count: 1,
        pt_snapshot_at: '2026-09-13T03:03:48+00:00',
        display_rating: 5,
        combined_rating: 3.92,
        average_rating: 3.92,
      })
    );
    expect(rating.display).toBe(5);
    expect(rating.displayIsRanking).toBe(false);
    expect(rating.combined).toBe(3.92);
    expect(rating.planetterpCount).toBe(1);
    expect(rating.jupiterpCount).toBe(0);
    expect(rating.count).toBe(1);
  });

  // Before the migration adding the column is applied, the API omits it.
  test('falls back to the ranking score when display_rating is absent, and says so', () => {
    const row = instructor({ combined_rating: 3.92, average_rating: 3.92 });
    delete row.display_rating;
    const rating = ratingBreakdown(row);
    expect(rating.display).toBe(3.92);
    expect(rating.displayIsRanking).toBe(true);
  });

  // `combined_rating` is gated on `min_weight_to_display`; `display_rating`
  // is not, and a low review count is no reason to hide an honest average.
  test('shows the display rating when there is no ranking score', () => {
    const rating = ratingBreakdown(instructor({ display_rating: 4.5, jupiterp_rating: 4.5, jupiterp_review_count: 1 }));
    expect(rating.display).toBe(4.5);
    expect(rating.combined).toBeNull();
  });

  test('has nothing to show with no reviews at all', () => {
    const rating = ratingBreakdown(instructor({}));
    expect(rating.display).toBeNull();
    expect(rating.displayIsRanking).toBe(false);
    expect(rating.count).toBe(0);
  });

  test('counts reviews from both sources', () => {
    const rating = ratingBreakdown(instructor({ jupiterp_review_count: 3, pt_review_count: 9, display_rating: 4 }));
    expect(rating.count).toBe(12);
  });
});

describe('displayRating', () => {
  test('a present null is nothing to show, not a reason to fall back', () => {
    expect(displayRating({ display_rating: null, combined_rating: 3.9, average_rating: 3.9 })).toBeNull();
  });

  test('falls back through the ranking score to its legacy alias', () => {
    // The planner's lookup carries `average_rating` and not `combined_rating`.
    expect(displayRating({ average_rating: 4.1 })).toBe(4.1);
  });

  test('treats a non-finite value as no rating', () => {
    expect(displayRating({ display_rating: NaN })).toBeNull();
    expect(rankingRating({ combined_rating: null, average_rating: NaN })).toBeNull();
  });
});

describe('withDisplayRating', () => {
  type Response = { status: number };

  test('asks for display_rating alongside the given columns', async () => {
    const request = jest.fn(async (): Promise<Response> => ({ status: 200 }));
    const { columns } = await withDisplayRating(['slug', 'name'], request, (r) => r.status === 400);
    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith(['slug', 'name', 'display_rating']);
    expect(columns).toEqual(['slug', 'name', 'display_rating']);
  });

  // An API without the column rejects the whole request. Losing the new column
  // is fine; losing every rating with it is not.
  test('retries without display_rating when the API rejects it', async () => {
    const request = jest.fn(async (columns: string[]): Promise<Response> => ({
      status: columns.includes('display_rating') ? 400 : 200,
    }));
    const { response, columns } = await withDisplayRating(['slug'], request, (r) => r.status === 400);
    expect(request).toHaveBeenCalledTimes(2);
    expect(response.status).toBe(200);
    expect(columns).toEqual(['slug']);
  });

  test('does not retry other failures', async () => {
    const request = jest.fn(async (): Promise<Response> => ({ status: 500 }));
    const { response } = await withDisplayRating(['slug'], request, (r) => r.status === 400);
    expect(request).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(500);
  });
});
