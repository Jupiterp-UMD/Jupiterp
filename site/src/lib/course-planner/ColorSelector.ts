/**
 * This file is part of Jupiterp. For terms of use, please see the file
 * called LICENSE at the top level of the Jupiterp source tree (online at
 * https://github.com/atcupps/Jupiterp/LICENSE).
 *
 */
import type { ScheduleBlock } from '../../types';

export function firstAvailableColor(selections: ScheduleBlock[]): number {
  const unavailableColors = selections.map((s) => s.colorNumber).sort((a, b) => a - b);
  let result = 0;
  for (const c of unavailableColors) {
    if (c === result) result++;
    else break;
  }
  return result;
}
