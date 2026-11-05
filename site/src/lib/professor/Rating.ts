/**
 * This file is part of Jupiterp. For terms of use, please see the file
 * called LICENSE at the top level of the Jupiterp source tree (online at
 * https://github.com/atcupps/Jupiterp/LICENSE).
 * Copyright (C) 2026 Andrew Cupps
 *
 * @fileoverview Which rating to show for a professor, which to rank them by,
 * and what the shown one is made of.
 *
 * Kept apart from `ProfessorData`, which loads the page through the API
 * client, so this can be imported -- and tested -- without one.
 */

import type { InstructorFull } from '../api/types';

/** The rating columns a row may carry. A `columns=` request names only some. */
type RatingColumns = Partial<Pick<InstructorFull, 'display_rating' | 'combined_rating' | 'average_rating'>>;

/**
 * The number professors are ranked by: the reviews' average pulled toward the
 * site-wide mean until there are enough reviews to trust it, so one 5-star
 * review does not outrank sixty 4.8s. Never the number to show -- with one
 * review it is mostly the site-wide mean, which is how a single 5.0 appeared
 * as 3.9.
 *
 * `average_rating` is its legacy alias, and the only one of the two the
 * planner's lookup requests.
 */
export function rankingRating(row: RatingColumns): number | null {
  return numeric(row.combined_rating) ?? numeric(row.average_rating);
}

/**
 * The number to show: the average of the professor's reviews from both
 * sources, recent ones weighted more. Null when no review counts toward it.
 *
 * Falls back to the ranking score only when the row has no `display_rating`
 * at all, which is an API that predates the column. Present and null means
 * there is nothing to show, and the ranking score is null then too.
 */
export function displayRating(row: RatingColumns): number | null {
  return row.display_rating === undefined ? rankingRating(row) : numeric(row.display_rating);
}

/**
 * Make a request that names `display_rating` among its columns, and make it
 * once more without that column if the API rejects it.
 *
 * The API answers a column it does not know with a 400 for the whole request,
 * not with rows that lack it. Against an API that predates the column -- before
 * it is deployed, or after a rollback -- asking for `display_rating` by name
 * would cost everything else the request carries: for the planner, every star,
 * the generator's rating sort and the `@professor` search. Readers fall back to
 * the ranking score when the column is absent, and this is what lets them.
 *
 * Resolves to the response and the columns it was made with, so a paged reader
 * can ask for the same ones on every later page.
 */
export async function withDisplayRating<R>(
  columns: readonly string[],
  request: (columns: string[]) => Promise<R>,
  rejected: (response: R) => boolean
): Promise<{ response: R; columns: string[] }> {
  const withColumn = [...columns, 'display_rating'];
  const response = await request(withColumn);
  if (!rejected(response)) {
    return { response, columns: withColumn };
  }
  const without = [...columns];
  return { response: await request(without), columns: without };
}

/**
 * The rating to display, and what it is made of.
 *
 * Never a single opaque blended number. A reader seeing "4.3" deserves to know
 * that it is twelve Jupiterp reviews and a frozen PlanetTerp average from 2026,
 * because those are different claims with different reliability.
 */
export interface RatingBreakdown {
  /** See `displayRating`. Null when there is nothing to show. */
  display: number | null;
  /**
   * True when the row had no `display_rating` and `display` is the ranking
   * score standing in for it. Nothing may call `display` the reviews' average
   * then: for a professor with one 5-star review it reads 3.9.
   */
  displayIsRanking: boolean;
  /** See `rankingRating`. Shown only to explain a gap, never as the rating. */
  combined: number | null;
  jupiterp: number | null;
  jupiterpCount: number;
  planetterp: number | null;
  planetterpCount: number;
  planetterpAsOf: string | null;
  /** Reviews from both sources. */
  count: number;
}

/**
 * Whether there is a rating to show is the model's decision, not this
 * function's: `display` is null exactly when no review counts toward it.
 * `rating_config.min_weight_to_display` gates only the ranking score, so a
 * professor below it still shows their average, with its count beside it.
 *
 * There used to be a second threshold here -- a hardcoded three reviews --
 * which meant the policy lived in two places that could disagree. It did:
 * lowering the database threshold changed nothing on the page, because this
 * constant still demanded three. One source of truth, and it is the one that
 * can be tuned without a deploy.
 */
export function ratingBreakdown(instructor: InstructorFull): RatingBreakdown {
  const jupiterpCount = instructor.jupiterp_review_count ?? 0;
  const planetterpCount = instructor.pt_review_count ?? 0;

  return {
    display: displayRating(instructor),
    displayIsRanking: instructor.display_rating === undefined,
    combined: rankingRating(instructor),
    jupiterp: instructor.jupiterp_rating,
    jupiterpCount,
    planetterp: instructor.pt_average_rating,
    planetterpCount,
    planetterpAsOf: instructor.pt_snapshot_at,
    count: jupiterpCount + planetterpCount,
  };
}

function numeric(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }
  return value;
}
