<!-- 
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).
Copyright (C) 2026 Andrew Cupps
-->
<script lang="ts">
  import { GenEd } from '@jupiterp/jupiterp';
  import { AdjustmentsHorizontalOutline, AngleDownOutline, CloseOutline } from 'flowbite-svelte-icons';
  import { slide } from 'svelte/transition';
  import type { FilterParams } from '../../../types';
  import { CourseSearchFilterStore } from '../../../stores/CoursePlannerStores';

  let showFiltersMenu = $state(false);

  interface Props {
    showGenEdMenu?: boolean;
  }
  let { showGenEdMenu = $bindable(false) }: Props = $props();

  let genEdSelections: GenEd[] = $state([]);
  let onlyOpenSections = $state(false);

  const defaultMinCredits = 0;
  const defaultMaxCredits = 20;
  let minCredits: number = $state(defaultMinCredits);
  let maxCredits: number = $state(defaultMaxCredits);

  /**
   * The filter set, derived rather than assembled inside the effect.
   *
   * The effect used to build this *and* maintain `appliedFiltersCount` by
   * assigning to it and then reading it back. An effect that writes state it
   * also reads re-runs itself, and every re-run called
   * `CourseSearchFilterStore.set`, whose subscriber issues a fresh search. So
   * one checkbox produced several searches, and which one won was a race.
   *
   * Now the effect has exactly one job: publish. Everything it publishes is
   * computed from the inputs, so it runs once per real change.
   */
  let filterParams: FilterParams = $derived.by(() => {
    const params: FilterParams = { serverSideFilters: {}, clientSideFilters: {} };

    if (genEdSelections.length > 0) {
      // Sorted copy: `Array.prototype.sort` mutates, and `genEdSelections` is
      // `$state`, so sorting it in place was another write-to-own-dependency.
      params.serverSideFilters.genEds = [...genEdSelections].sort((a, b) => a.code.localeCompare(b.code));
    }
    if (minCredits !== defaultMinCredits) {
      params.clientSideFilters.minCredits = minCredits;
    }
    if (maxCredits !== defaultMaxCredits) {
      params.clientSideFilters.maxCredits = maxCredits;
    }
    if (onlyOpenSections) {
      params.clientSideFilters.onlyOpen = onlyOpenSections;
    }
    return params;
  });

  // Counted off the same derived value, so the badge can never disagree with
  // what was actually published.
  let appliedFiltersCount = $derived(
    Object.keys(filterParams.serverSideFilters).length + Object.keys(filterParams.clientSideFilters).length
  );

  $effect(() => {
    CourseSearchFilterStore.set(filterParams);
  });

  function resetFilters() {
    genEdSelections = [];
    minCredits = defaultMinCredits;
    maxCredits = defaultMaxCredits;
    onlyOpenSections = false;
  }
</script>

<div class="text-text-primary/70 flex flex-col">
  <!-- Filters button -->
  <div class="mt-1 flex flex-row items-center justify-between gap-1 py-0.5">
    <button
      class="hover:text-text-primary flex grow flex-row items-center rounded-md text-sm"
      title="Show/hide course search filters"
      onclick={() => {
        showFiltersMenu = !showFiltersMenu;
      }}
    >
      <AdjustmentsHorizontalOutline height="16" width="16" class="mr-1" />
      <!-- format-check exempt 1 -->
      {appliedFiltersCount} filter{appliedFiltersCount === 1 ? '' : 's'} applied
    </button>
    <button class="hover:text-text-primary px-1 text-right text-sm" onclick={resetFilters} title="Clear all filters">
      Clear filters
    </button>
  </div>

  <!-- Filters menu -->
  {#if showFiltersMenu}
    <div class="mx-1 my-1 flex flex-col gap-2 px-2 py-1 text-xs" transition:slide>
      <!-- Gen-Eds -->
      <div class="flex flex-row text-xs">
        <span class="min-w-16 whitespace-nowrap"> Gen-Eds: </span>
        <div class="flex grow flex-col">
          <!-- Gen-Ed buttons -->
          <div class="flex w-full flex-row items-center">
            <!-- Show/hide gen-eds menu button -->
            <!-- format-check exempt 21 10 -->
            <button
              class="border-text-secondary hover:bg-hover focus-visible:ring-3 flex h-full grow flex-row items-center rounded-l-md border text-left"
              title="Show/hide Gen Ed selection menu"
              onclick={() => {
                showGenEdMenu = !showGenEdMenu;
              }}
            >
              <span class="border-text-secondary h-full content-center border-r px-0.5">
                <AngleDownOutline class="h-4 w-4" />
              </span>
              <span class="bg-bg-primary w-full px-1">
                {#if Array.from(genEdSelections).length === 0}
                  Select Gen Eds
                {:else}
                  {Array.from(genEdSelections)
                    .map((g) => g.code)
                    .join(', ')}
                {/if}
              </span>
            </button>

            <!-- Clear gen-ed filters -->
            <button
              class="border-text-secondary hover:bg-hover h-full self-end rounded-r-md border px-0.5"
              title="Clear Gen Ed filters"
              onclick={() => {
                genEdSelections = [];
              }}
            >
              <CloseOutline class="h-4 w-4" />
            </button>
          </div>
          <!-- Gen Ed checkbox menu -->
          {#if showGenEdMenu}
            <div
              class="mt-1 flex flex-col
                                    gap-2 py-2"
              transition:slide={{ duration: 350 }}
            >
              <!-- Individual gen-ed checkbox -->
              <!-- format-check exempt 25 15 -->
              {#each GenEd.list() as genEd (genEd.code)}
                <div class="flex flex-row items-center">
                  <input
                    type="checkbox"
                    checked={genEdSelections.some((g) => g.code === genEd.code)}
                    id={'gened-' + genEd.code}
                    class="bg-bg-secondary border-text-secondary checked:bg-orange focus:ring-orange mr-2 mt-0.5 rounded-md"
                    onclick={() => {
                      if (genEdSelections.some((g) => g.code === genEd.code)) {
                        genEdSelections = genEdSelections.filter((g) => g.code !== genEd.code);
                      } else {
                        genEdSelections = [...genEdSelections, genEd];
                      }
                    }}
                  />
                  <label for={'gened-' + genEd.code} class="cursor-pointer text-xs">
                    {genEd.code} - {genEd.name}
                  </label>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>
      <!-- Credits -->
      <div class="flex flex-row gap-4">
        <!-- Min credits -->
        <div class="flex flex-row items-center text-xs">
          <span class="min-w-16"> Min credits: </span>
          <input
            id="Minimum credits"
            type="number"
            min="0"
            step="1"
            max="20"
            placeholder="0"
            bind:value={minCredits}
            class="bg-bg-primary focus:outline-hidden focus:ring-3 w-12 rounded-md border px-1 py-0 text-xs"
          />
        </div>

        <!-- Max credits -->
        <div class="flex flex-row items-center text-xs">
          <span class="min-w-16"> Max credits: </span>
          <input
            id="Maximum credits"
            type="number"
            min="0"
            max="20"
            step="1"
            placeholder="10"
            bind:value={maxCredits}
            class="bg-bg-primary focus:outline-hidden focus:ring-3 w-12 rounded-md border px-1 py-0 text-xs"
          />
        </div>
      </div>

      <!-- Only open sections -->
      <div class="flex flex-row items-center text-xs">
        <input
          type="checkbox"
          id="only-open-sections"
          class="border-text-secondary bg-border text-orange focus:ring-orange checked:bg-orange mr-2 rounded-md"
          bind:checked={onlyOpenSections}
        />
        <label for="only-open-sections" class="cursor-pointer text-xs"> Only show open sections </label>
      </div>
    </div>
  {/if}
</div>
