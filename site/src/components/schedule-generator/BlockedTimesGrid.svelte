<!--
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).

-->
<script lang="ts">
  import { SvelteSet } from 'svelte/reactivity';
  import {
    blocksToKeys,
    cellKey,
    GRID_DAYS,
    GRID_STARTS,
    keysToBlocks,
    rectangleKeys,
  } from '../../lib/schedule-generator/BlockedTimes';
  import { minutesToLabel } from '../../lib/schedule-generator/GeneratorFormat';
  import type { BlockedTime, EngineDay } from '../../lib/schedule-generator/types';

  interface Props {
    blockedTimes: BlockedTime[];
    onChange: (blockedTimes: BlockedTime[]) => void;
  }

  let { blockedTimes, onChange }: Props = $props();

  let drag = $state<{ day: EngineDay; start: number; toDay: EngineDay; toStart: number; adding: boolean } | null>(null);

  let saved = $derived(blocksToKeys(blockedTimes));
  let dragged = $derived(drag ? new Set(rectangleKeys(drag.day, drag.start, drag.toDay, drag.toStart)) : new Set());

  function isBlocked(day: EngineDay, start: number): boolean {
    const key = cellKey(day, start);
    if (drag && dragged.has(key)) {
      return drag.adding;
    }
    return saved.has(key);
  }

  function update(keys: string[], adding: boolean) {
    const next = new SvelteSet(saved);
    for (const key of keys) {
      if (adding) {
        next.add(key);
      } else {
        next.delete(key);
      }
    }
    onChange(keysToBlocks(next));
  }

  function onDown(event: PointerEvent, day: EngineDay, start: number) {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    drag = { day, start, toDay: day, toStart: start, adding: !saved.has(cellKey(day, start)) };
  }

  function onMove(event: PointerEvent) {
    if (!drag) {
      return;
    }
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
    if (event.detail === 0) {
      update([cellKey(day, start)], !saved.has(cellKey(day, start)));
    }
  }
</script>

<svelte:window onpointerup={onUp} onpointercancel={() => (drag = null)} />

<div class="flex flex-col gap-1">
  <span class="opacity-70">Blocked times:</span>
  <div class="grid select-none grid-cols-[3.5rem_repeat(5,1fr)] text-[10px]">
    <div></div>
    {#each GRID_DAYS as day (day)}
      <div class="text-center font-semibold opacity-70">{day}</div>
    {/each}
    {#each GRID_STARTS as start (start)}
      <div class="-mt-1.5 pr-1 text-right leading-none opacity-60">
        {start % 60 === 0 ? minutesToLabel(start) : ''}
      </div>
      {#each GRID_DAYS as day (day)}
        <button
          data-day={day}
          data-start={start}
          aria-label={`${day} ${minutesToLabel(start)}`}
          aria-pressed={isBlocked(day, start)}
          class="border-outline h-2.5 touch-none border-l
            {start % 60 === 0 ? 'border-t' : ''}
            {day === 'F' ? 'border-r' : ''}
            {start === GRID_STARTS[GRID_STARTS.length - 1] ? 'border-b' : ''}
            {isBlocked(day, start) ? 'bg-orange' : 'hover:bg-hover'}"
          onpointerdown={(e) => onDown(e, day, start)}
          onpointermove={onMove}
          onclick={(e) => onKeyClick(e, day, start)}
        ></button>
      {/each}
    {/each}
  </div>
</div>
