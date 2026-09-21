/**
 * This file is part of Jupiterp. For terms of use, please see the file
 * called LICENSE at the top level of the Jupiterp source tree (online at
 * https://github.com/atcupps/Jupiterp/LICENSE).
 *
 *
 * @fileoverview Unit tests for constraint relaxation.
 */

import { describe, expect, test } from '@jest/globals';
import { singleRelaxations } from './Relaxation';
import { defaultConstraints } from './types';
import type { EngineDay } from './types';

describe('singleRelaxations', () => {
  test('lists one relaxation per active constraint', () => {
    const daysOff = new Set<EngineDay>(['M', 'F']);
    const relaxations = singleRelaxations({
      earliestStartMinutes: 9 * 60,
      latestEndMinutes: 17 * 60,
      daysOff,
      onlyOpenSeats: true,
      minGapMinutes: 15,
      minCredits: 12,
    });
    const kinds = relaxations.map((r) => r.kind).sort();
    // earliestStart, latestEnd, dayOff x2, openSeats, minGap, minCredits
    expect(relaxations).toHaveLength(7);
    expect(kinds).toEqual(['dayOff', 'dayOff', 'earliestStart', 'latestEnd', 'minCredits', 'minGap', 'openSeats']);
  });

  test('relaxes each day off individually', () => {
    const relaxations = singleRelaxations({
      ...defaultConstraints(),
      daysOff: new Set<EngineDay>(['M', 'F']),
    });
    const dayOffs = relaxations.filter((r) => r.kind === 'dayOff');
    expect(dayOffs.map((r) => r.day).sort()).toEqual(['F', 'M']);
    // Each relaxation removes exactly that one day.
    const forM = dayOffs.find((r) => r.day === 'M');
    expect(forM?.constraints.daysOff.has('M')).toBe(false);
    expect(forM?.constraints.daysOff.has('F')).toBe(true);
  });

  test('min credits listed as a relaxation', () => {
    const relaxations = singleRelaxations({
      ...defaultConstraints(),
      onlyOpenSeats: false,
      minCredits: 15,
    });
    expect(relaxations).toHaveLength(1);
    expect(relaxations[0].kind).toBe('minCredits');
    expect(relaxations[0].constraints.minCredits).toBeNull();
  });

  test('no relaxations for unconstrained input', () => {
    const relaxations = singleRelaxations({
      ...defaultConstraints(),
      onlyOpenSeats: false,
    });
    expect(relaxations).toHaveLength(0);
  });

  test('only-open-seats is its own relaxation', () => {
    const relaxations = singleRelaxations(defaultConstraints());
    expect(relaxations).toHaveLength(1);
    expect(relaxations[0].kind).toBe('openSeats');
    expect(relaxations[0].constraints.onlyOpenSeats).toBe(false);
  });
});
