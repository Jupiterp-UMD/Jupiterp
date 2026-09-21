/**
 * This file is part of Jupiterp. For terms of use, please see the file
 * called LICENSE at the top level of the Jupiterp source tree (online at
 * https://github.com/atcupps/Jupiterp/LICENSE).
 *
 *
 * @fileoverview When nothing fits, the generator loosens one constraint at a
 * time and re-runs to report how many schedules each single change would
 * unlock. This module enumerates those single relaxations. Ported from the
 * mobile app's relaxation logic.
 */

import type { HardConstraints, Relaxation } from './types';

/**
 * Every constraint set that differs from `constraints` by removing exactly
 * one restriction. A day off is relaxed individually so each blocked day
 * becomes its own actionable suggestion.
 */
export function singleRelaxations(constraints: HardConstraints): Relaxation[] {
  const relaxations: Relaxation[] = [];

  if (constraints.earliestStartMinutes !== null) {
    relaxations.push({
      kind: 'earliestStart',
      day: null,
      constraints: { ...constraints, earliestStartMinutes: null },
    });
  }

  if (constraints.latestEndMinutes !== null) {
    relaxations.push({
      kind: 'latestEnd',
      day: null,
      constraints: { ...constraints, latestEndMinutes: null },
    });
  }

  for (const day of constraints.daysOff) {
    const daysOff = new Set(constraints.daysOff);
    daysOff.delete(day);
    relaxations.push({
      kind: 'dayOff',
      day,
      constraints: { ...constraints, daysOff },
    });
  }

  if (constraints.onlyOpenSeats) {
    relaxations.push({
      kind: 'openSeats',
      day: null,
      constraints: { ...constraints, onlyOpenSeats: false },
    });
  }

  if (constraints.minGapMinutes > 0) {
    relaxations.push({
      kind: 'minGap',
      day: null,
      constraints: { ...constraints, minGapMinutes: 0 },
    });
  }

  if (constraints.minCredits !== null) {
    relaxations.push({
      kind: 'minCredits',
      day: null,
      constraints: { ...constraints, minCredits: null },
    });
  }

  return relaxations;
}
