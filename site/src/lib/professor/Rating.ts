/**
 * This file is part of Jupiterp. For terms of use, please see the file
 * called LICENSE at the top level of the Jupiterp source tree (online at
 * https://github.com/atcupps/Jupiterp/LICENSE).
 * Copyright (C) 2026 Andrew Cupps
 *
 * @fileoverview The rating a professor page shows, and what it is made of.
 *
 * Kept apart from `ProfessorData`, which loads the page through the API
 * client, so this can be imported -- and tested -- without one.
 */

import type { InstructorFull } from '../api/types';

/**
 * The rating to display, and what it is made of.
 *
 * Never a single opaque blended number. A reader seeing "4.3" deserves to know
 * that it is twelve Jupiterp reviews and a frozen PlanetTerp average from 2026,
 * because those are different claims with different reliability.
 */
export interface RatingBreakdown {
  /**
   * The number to show: the average of the professor's reviews from both
   * sources, recent ones weighted more.
   */
  display: number | null;
  /**
   * The number professors are ranked by: `display` pulled toward the
   * site-wide mean until there are enough reviews to trust it. Shown only as
   * an explanation, never as the rating -- with one review it is mostly the
   * site-wide mean, which is how a single 5.0 used to appear as 3.9.
   */
  combined: number | null;
  jupiterp: number | null;
  jupiterpCount: number;
  planetterp: number | null;
  planetterpCount: number;
  planetterpAsOf: string | null;
  /** False when there is not enough behind the number to show it at all. */
  displayable: boolean;
}

export function ratingBreakdown(instructor: InstructorFull): RatingBreakdown {
  const jupiterpCount = instructor.jupiterp_review_count ?? 0;
  const planetterpCount = instructor.pt_review_count ?? 0;
  const combined = instructor.combined_rating ?? numeric(instructor.average_rating);
  // `display_rating` is absent until the migration adding it is applied, and
  // the ranking score is the closest thing to it until then.
  const display = numeric(instructor.display_rating) ?? combined;

  return {
    display,
    combined,
    jupiterp: instructor.jupiterp_rating,
    jupiterpCount,
    planetterp: instructor.pt_average_rating,
    planetterpCount,
    planetterpAsOf: instructor.pt_snapshot_at,
    // Whether a rating is worth showing is the model's decision, not this
    // function's. `refresh_instructor_ratings` returns null unless the combined
    // weight clears `rating_config.min_weight_to_display`, and it already
    // returns null when there are no reviews at all.
    //
    // There used to be a second threshold here -- a hardcoded three reviews --
    // which meant the policy lived in two places that could disagree. It did:
    // lowering the database threshold changed nothing on the page, because this
    // constant still demanded three. One source of truth, and it is the one
    // that can be tuned without a deploy.
    //
    // Keyed on `display`, which the database leaves ungated: an honest average
    // of one review, shown with its count, is worth showing.
    displayable: display !== null,
  };
}

function numeric(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }
  return value;
}
