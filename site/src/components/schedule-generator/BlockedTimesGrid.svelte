<!--
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).

-->
<script lang="ts">
  import { SvelteSet } from 'svelte/reactivity';
  import {
    blocksToKeys,
    cellDimmedByConstraints,
    cellKey,
    GRID_DAYS,
    GRID_STARTS,
    keysToBlocks,
    rectangleKeys,
  } from '../../lib/schedule-generator/BlockedTimes';
  import { minutesToLabel } from '../../lib/schedule-generator/GeneratorFormat';
  import type { BlockedTime, EngineDay } from '../../lib/schedule-generator/types';

  /**
   * A When2Meet-style grid for marking times the student is busy. Dragging
   * across empty cells paints them; dragging from a painted cell erases.
   * Cells covered by Days off / No class before / No class after are dimmed.
   */
  interface Props {
    blockedTimes: BlockedTime[];
    daysOff: ReadonlySet<EngineDay>;
    earliestStartMinutes: number | null;
    latestEndMinutes: number | null;
    onChange: (blockedTimes: BlockedTime[]) => void;
  }

  let { blockedTimes, daysOff, earliestStartMinutes, latestEndMinutes, onChange }: Props = $props();

  // The drag in progress, if any. `adding` is decided by the cell the drag
  // starts on, so one drag never mixes painting and erasing.
  let drag = $state<{ day: EngineDay; start: number; toDay: EngineDay; toStart: number; adding: boolean } | null>(null);

  let saved = $derived(blocksToKeys(blockedTimes));
  let dragged = $derived(drag ? new Set(rectangleKeys(drag.day, drag.start, drag.toDay, drag.toStart)) : new Set());
  let lastDay = GRID_DAYS[GRID_DAYS.length - 1];

  function isDimmed(day: EngineDay, start: number): boolean {
    return cellDimmedByConstraints(day, start, daysOff, earliestStartMinutes, latestEndMinutes);
  }

  /** Whether a cell shows as blocked, including the preview of a drag. */
  function isBlocked(day: EngineDay, start: number): boolean {
    const key = cellKey(day, start);
    if (drag && dragged.has(key) && !isDimmed(day, start)) {
      return drag.adding;
    }
    return saved.has(key);
  }

  /** Paints or erases paintable cells and reports the new blocked times. */
  function update(keys: string[], adding: boolean) {
    const next = new SvelteSet(saved);
    for (const key of keys) {
      const [day, startText] = key.split(':');
      if (isDimmed(day as EngineDay, Number(startText))) {
        continue;
      }
      if (adding) {
        next.add(key);
      } else {
        next.delete(key);
      }
    }
    onChange(keysToBlocks(next));
  }

  function onDown(event: PointerEvent, day: EngineDay, start: number) {
    if (event.button !== 0 || isDimmed(day, start)) {
      return;
    }
    event.preventDefault();
    drag = { day, start, toDay: day, toStart: start, adding: !saved.has(cellKey(day, start)) };
  }

  function onMove(event: PointerEvent) {
    if (!drag) {
      return;
    }
    // Look the cell up by position: a touch drag keeps firing on the cell it
    // started on, so the event target is not the cell under the finger.
    const target = document.elementFromPoint(event.clientX, event.clientY);
    const cell = target instanceof HTMLElement ? target.closest<HTMLElement>('[data-day]') : null;
    if (cell) {
      drag = { ...drag, toDay: cell.dataset.day as EngineDay, toStart: Number(cell.dataset.start) };
    }
  }

  function onUp() {
    if (drag) {
      update(rectangleKeys(drag.day, drag.start, drag.toDay, drag.toStart), drag.adding);
      drag = null;
    }
  }

  function onKeyClick(event: MouseEvent, day: EngineDay, start: number) {
    // Mouse and touch are handled by the pointer events above. A click with no
    // detail comes from Enter or Space on a focused cell.
    if (event.detail === 0 && !isDimmed(day, start)) {
      update([cellKey(day, start)], !saved.has(cellKey(day, start)));
    }
  }
</script>

<svelte:window onpointerup={onUp} onpointercancel={() => (drag = null)} />

<div class="flex flex-col gap-1">
  <span class="opacity-70">Blocked times:</span>
  <div class="grid select-none grid-cols-[3.5rem_repeat(7,1fr)] text-[10px]">
    <div></div>
    {#each GRID_DAYS as day (day)}
      <div class="text-center font-semibold opacity-70">{day}</div>
    {/each}
    {#each GRID_STARTS as start (start)}
      <div class="-mt-1.5 pr-1 text-right leading-none opacity-60">
        {start % 60 === 0 ? minutesToLabel(start) : ''}
      </div>
      {#each GRID_DAYS as day (day)}
        {@const dimmed = isDimmed(day, start)}
        <button
          data-day={day}
          data-start={start}
          disabled={dimmed}
          aria-label={`${day} ${minutesToLabel(start)}`}
          aria-pressed={isBlocked(day, start)}
          class="border-outline h-2.5 touch-none border-l
            {start % 60 === 0 ? 'border-t' : ''}
            {day === lastDay ? 'border-r' : ''}
            {start === GRID_STARTS[GRID_STARTS.length - 1] ? 'border-b' : ''}
            {dimmed ? 'bg-mid-gray/40' : isBlocked(day, start) ? 'bg-orange' : 'hover:bg-hover'}"
          onpointerdown={(e) => onDown(e, day, start)}
          onpointermove={onMove}
          onclick={(e) => onKeyClick(e, day, start)}
        ></button>
      {/each}
    {/each}
  </div>
</div>
