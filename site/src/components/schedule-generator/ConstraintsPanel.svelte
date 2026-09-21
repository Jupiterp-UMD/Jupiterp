<!--
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).

-->
<script lang="ts">
  import { AdjustmentsHorizontalOutline } from 'flowbite-svelte-icons';
  import { slide } from 'svelte/transition';
  import GeneratorSelect from './GeneratorSelect.svelte';
  import { GeneratorConstraintsStore } from '../../stores/GeneratorStores';
  import type { HardConstraints } from '../../lib/schedule-generator/types';
  import type { EngineDay } from '../../lib/schedule-generator/types';
  import { ENGINE_DAYS, timeSlotOptions } from '../../lib/schedule-generator/GeneratorFormat';
  import { SvelteSet } from 'svelte/reactivity';

  const ANY_TIME = { value: '', label: 'Any time' };
  const timeOptions = [ANY_TIME, ...timeSlotOptions()];

  function minutesToValue(minutes: number | null): string {
    return minutes === null ? '' : String(minutes);
  }

  function valueToMinutes(value: string): number | null {
    return value === '' ? null : parseInt(value, 10);
  }

  let showMenu = $state(false);
  let constraints: HardConstraints = $state({
    earliestStartMinutes: null,
    latestEndMinutes: null,
    daysOff: new Set(),
    onlyOpenSeats: true,
    minGapMinutes: 0,
    minCredits: null,
  });
  GeneratorConstraintsStore.subscribe((c) => {
    constraints = c;
  });

  function countActive(c: HardConstraints): number {
    let count = 0;
    if (c.earliestStartMinutes !== null) count++;
    if (c.latestEndMinutes !== null) count++;
    count += c.daysOff.size;
    if (c.onlyOpenSeats) count++;
    if (c.minGapMinutes > 0) count++;
    if (c.minCredits !== null) count++;
    return count;
  }

  function patch(next: Partial<HardConstraints>) {
    GeneratorConstraintsStore.update((c) => ({ ...c, ...next }));
  }

  function toggleDay(day: EngineDay) {
    GeneratorConstraintsStore.update((c) => {
      const daysOff = new SvelteSet<EngineDay>(c.daysOff);
      if (daysOff.has(day)) {
        daysOff.delete(day);
      } else {
        daysOff.add(day);
      }
      return { ...c, daysOff };
    });
  }

  function reset() {
    GeneratorConstraintsStore.update((c) => ({
      ...c,
      earliestStartMinutes: null,
      latestEndMinutes: null,
      daysOff: new SvelteSet<EngineDay>(),
      minGapMinutes: 0,
      minCredits: null,
    }));
  }

  function setNumberOrNull(value: string): number | null {
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }
  let activeCount = $derived(countActive(constraints));
</script>

<div class="flex flex-col">
  <div class="flew-row space-between flex py-0.5">
    <button
      class="hover:text-orange flex grow flex-row items-center text-sm"
      onclick={() => (showMenu = !showMenu)}
      title="Show/hide constraints"
    >
      <AdjustmentsHorizontalOutline class="mr-1 h-4 w-4" />
      {activeCount} constraint{activeCount === 1 ? '' : 's'} applied
    </button>
    <button class="hover:text-orange px-1 text-right text-sm" onclick={reset} title="Clear all constraints"
      >Clear</button
    >
  </div>

  {#if showMenu}
    <div class="flex flex-col gap-3 px-1 py-2 text-sm" transition:slide>
      <!-- Time window -->
      <div class="flex flex-row flex-wrap items-center gap-3">
        <div class="flex flex-row items-center gap-2">
          <span class="opacity-70">No class before</span>
          <GeneratorSelect
            options={timeOptions}
            value={minutesToValue(constraints.earliestStartMinutes)}
            onChange={(v) => patch({ earliestStartMinutes: valueToMinutes(v) })}
            buttonClass="w-28"
            title="Earliest class start"
          />
        </div>
        <div class="flex flex-row items-center gap-2">
          <span class="opacity-70">No class after</span>
          <GeneratorSelect
            options={timeOptions}
            value={minutesToValue(constraints.latestEndMinutes)}
            onChange={(v) => patch({ latestEndMinutes: valueToMinutes(v) })}
            buttonClass="w-28"
            title="Latest class end"
          />
        </div>
      </div>

      <!-- Days off -->
      <div class="flex flex-row items-center gap-2">
        <span class="opacity-70">Days off:</span>
        <div class="flex flex-row gap-1">
          {#each ENGINE_DAYS as day (day)}
            <button
              class="border-outline rounded-md border
								px-1.5 py-0.5 text-xs"
              class:bg-orange={constraints.daysOff.has(day)}
              class:text-white={constraints.daysOff.has(day)}
              onclick={() => toggleDay(day)}
              title={`Toggle ${day} as a day off`}
            >
              {day}
            </button>
          {/each}
        </div>
      </div>

      <!-- Only open seats -->
      <label class="flex flex-row items-center gap-2">
        <input
          type="checkbox"
          checked={constraints.onlyOpenSeats}
          onchange={(e) => patch({ onlyOpenSeats: e.currentTarget.checked })}
          class="bg-bg-secondary border-text-secondary checked:bg-orange focus:ring-orange rounded-md"
        />
        <span class="cursor-pointer opacity-80">Only open sections</span>
      </label>
      <!-- Min gap & min credits -->
      <div class="flex flex-row flex-wrap items-center gap-4">
        <label class="flex flex-row items-center gap-2">
          <span class="opacity-70">Min gap (min)</span>
          <input
            type="number"
            min="0"
            step="5"
            value={constraints.minGapMinutes}
            onchange={(e) =>
              patch({
                minGapMinutes: setNumberOrNull(e.currentTarget.value) ?? 0,
              })}
            class="border-outline bg-bg-primary w-16 rounded-md border px-1 py-0.5"
          />
        </label>
        <label class="flex flex-row items-center gap-2">
          <span class="opacity-70">Min credits</span>
          <input
            type="number"
            min="0"
            step="1"
            value={constraints.minCredits ?? ''}
            onchange={(e) =>
              patch({
                minCredits: setNumberOrNull(e.currentTarget.value),
              })}
            class="border-outline bg-bg-primary w-16 rounded-md border px-1 py-0.5"
          />
        </label>
      </div>
    </div>
  {/if}
</div>
