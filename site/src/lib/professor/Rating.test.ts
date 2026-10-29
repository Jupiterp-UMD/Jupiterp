/**
 * This file is part of Jupiterp. For terms of use, please see the file
 * called LICENSE at the top level of the Jupiterp source tree (online at
 * https://github.com/atcupps/Jupiterp/LICENSE).
 * Copyright (C) 2026 Andrew Cupps
 *
 * @fileoverview Which rating a professor page shows.
 */

import { describe, expect, test } from '@jest/globals';
import type { InstructorFull } from '../api/types';
import { ratingBreakdown } from './Rating';

function instructor(overrides: Partial<InstructorFull>): InstructorFull {
  return {
    id: 1,
    slug: 'joseph-conroy',
    name: 'Joseph Conroy',
    average_rating: null,
    pt_slug: null,
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
    expect(rating.combined).toBe(3.92);
    expect(rating.displayable).toBe(true);
    expect(rating.planetterpCount).toBe(1);
    expect(rating.jupiterpCount).toBe(0);
  });

  // Before the migration adding the column is applied, the API omits it.
  test('falls back to the ranking score when display_rating is absent', () => {
    const row = instructor({ combined_rating: 3.92, average_rating: 3.92 });
    delete row.display_rating;
    const rating = ratingBreakdown(row);
    expect(rating.display).toBe(3.92);
    expect(rating.displayable).toBe(true);
  });

  // `combined_rating` is gated on `min_weight_to_display`; `display_rating`
  // is not, and a low review count is no reason to hide an honest average.
  test('is displayable when only the display rating exists', () => {
    const rating = ratingBreakdown(instructor({ display_rating: 4.5, jupiterp_rating: 4.5, jupiterp_review_count: 1 }));
    expect(rating.display).toBe(4.5);
    expect(rating.combined).toBeNull();
    expect(rating.displayable).toBe(true);
  });

  test('is not displayable with no reviews at all', () => {
    const rating = ratingBreakdown(instructor({}));
    expect(rating.display).toBeNull();
    expect(rating.displayable).toBe(false);
  });
});
