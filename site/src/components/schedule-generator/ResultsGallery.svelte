<!--
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).

-->
<script lang="ts">
  import GeneratedScheduleCard from './GeneratedScheduleCard.svelte';
  import GeneratorSelect from './GeneratorSelect.svelte';
  import RelaxationHints from './RelaxationHints.svelte';
  import { runGeneration } from '../../lib/schedule-generator/Generate';
  import { sortedByCriterion } from '../../lib/schedule-generator/ScheduleSorter';
  import { SORT_CRITERIA, SORT_CRITERION_LABELS } from '../../lib/schedule-generator/types';
  import type { GeneratedSchedule, SortCriterion } from '../../lib/schedule-generator/types';
  import { overriddenFilterLabel } from '../../lib/schedule-generator/GeneratorFormat';
  import {
    GenerationStateStore,
    GeneratorRequirementsStore,
    GeneratorSortChosenByUserStore,
    GeneratorSortStore,
  } from '../../stores/GeneratorStores';

  const PAGE_SIZE: number = 12;

  // Use state rune for mutable local variables
  let visibleCount: number = $state(PAGE_SIZE);

  // Reset the visible window whenever a new generation state completes
  $effect(() => {
    if ($GenerationStateStore) {
      visibleCount = PAGE_SIZE;
    }
  });

  // Derived state replaces old $: reactivity
  let sortedSchedules: GeneratedSchedule[] = $derived(
    $GenerationStateStore.kind === 'done'
      ? sortedByCriterion($GenerationStateStore.schedules, $GeneratorSortStore)
      : ([] as GeneratedSchedule[])
  );

  let visibleSchedules: GeneratedSchedule[] = $derived(sortedSchedules.slice(0, visibleCount));

  const sortOptions: { value: SortCriterion; label: string }[] = SORT_CRITERIA.map((criterion) => ({
    value: criterion,
    label: SORT_CRITERION_LABELS[criterion],
  }));

  function setSort(value: string) {
    GeneratorSortChosenByUserStore.set(true);
    GeneratorSortStore.set(value as SortCriterion);
  }

  let isDisabled = $derived($GeneratorRequirementsStore.length === 0 || $GenerationStateStore.kind === 'loading');
</script>

<div class="flex flex-col gap-3">
  <!-- Generate bar -->
  <div class="flex flex-row items-center gap-3">
    <button
      class="border-orange text-orange hover:bg-orange disabled:hover:text-orange rounded-lg border px-4 py-1.5 font-semibold hover:text-white disabled:opacity-40 disabled:hover:bg-transparent"
      disabled={isDisabled}
      onclick={runGeneration}
    >
      {$GenerationStateStore.kind === 'loading' ? 'Generating…' : 'Generate schedules'}
    </button>

    {#if $GenerationStateStore.kind === 'done' && $GenerationStateStore.schedules.length > 0}
      <div class="flex flex-row items-center gap-2 text-sm">
        <span class="opacity-70">Sort by</span>
        <GeneratorSelect
          options={sortOptions}
          value={$GeneratorSortStore}
          onChange={setSort}
          buttonClass="min-w-36"
          title="Sort schedules by"
        />
      </div>
    {/if}
  </div>

  {#if $GenerationStateStore.kind === 'idle'}
    <p class="py-8 text-center text-sm opacity-60">Add courses and set any constraints, then generate schedules.</p>
  {:else if $GenerationStateStore.kind === 'failed'}
    <div class="border-orange bg-light-orange/30 rounded-lg border px-3 py-2 text-sm">
      {$GenerationStateStore.message}
    </div>
  {:else if $GenerationStateStore.kind === 'noSchedules'}
    <RelaxationHints
      hints={$GenerationStateStore.hints}
      coursesWithNoValidSections={$GenerationStateStore.coursesWithNoValidSections}
    />
  {:else if $GenerationStateStore.kind === 'done'}
    {#if $GenerationStateStore.truncated}
      <div class="text-xs italic opacity-60">
        Showing the first {$GenerationStateStore.schedules.length} schedules; more exist. Add constraints to narrow them down.
      </div>
    {/if}
    {#if $GenerationStateStore.pinNotices.length > 0}
      <div class="border-orange bg-light-orange/20 flex flex-col gap-1 rounded-lg border px-3 py-2 text-xs">
        {#each $GenerationStateStore.pinNotices as notice (notice.courseCode + notice.sectionCode)}
          <div>
            <span class="font-semibold"> {notice.courseCode} ({notice.sectionCode}) </span> was pinned even though it {notice.overriddenFilters
              .map(overriddenFilterLabel)
              .join(', ')}.
          </div>
        {/each}
      </div>
    {/if}
    <div class="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
      {#each visibleSchedules as schedule, i (i)}
        <GeneratedScheduleCard {schedule} rank={i + 1} />
      {/each}
    </div>

    {#if visibleCount < sortedSchedules.length}
      <button
        class="border-outline hover:border-orange hover:text-orange mx-auto mt-1 rounded-lg border px-4 py-1.5 text-sm"
        onclick={() => (visibleCount += PAGE_SIZE)}
      >
        Show more ({sortedSchedules.length - visibleCount} more)
      </button>
    {/if}
  {/if}
</div>
