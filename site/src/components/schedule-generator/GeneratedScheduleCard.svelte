<!--
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).

-->
<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import MiniSchedule from './MiniSchedule.svelte';
  import SchedulePreview from './SchedulePreview.svelte';
  import { applyGeneratedSchedule } from '../../lib/schedule-generator/ApplySchedule';
  import { formatCredits } from '../../lib/course-planner/Formatting';
  import type { GeneratedSchedule } from '../../lib/schedule-generator/types';

  interface Props {
    schedule: GeneratedSchedule;
    rank: number;
  }

  let { schedule, rank }: Props = $props();

  let metrics = $derived(schedule.metrics);

  function formatGap(minutes: number): string {
    if (minutes === 0) {
      return 'none';
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) {
      return `${mins}m`;
    }
    return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
  }

  function apply() {
    applyGeneratedSchedule(schedule);
    goto(resolve('/'));
  }

  // Whether the full-page view of the generated schedules is open, started
  // from this card.
  let previewOpen = $state(false);

  // The whole card opens the view, except its Apply button.
  function handleCardClick(event: MouseEvent) {
    if (event.target instanceof Element && event.target.closest('button')) {
      return;
    }
    previewOpen = true;
  }

  function handleCardKeydown(event: KeyboardEvent) {
    if (event.target !== event.currentTarget) {
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      previewOpen = true;
    }
  }
</script>

<div
  class="border-border bg-bg-primary shadow-xs hover:border-orange flex cursor-pointer flex-col gap-2 rounded-xl border p-3"
  role="button"
  tabindex="0"
  aria-label="View schedule {rank} in detail"
  onclick={handleCardClick}
  onkeydown={handleCardKeydown}
>
  <div class="flex flex-row items-center justify-between">
    <span class="text-sm font-semibold opacity-60">#{rank}</span>
    <button
      class="border-orange text-orange enabled:hover:bg-orange rounded-md border px-3 py-1 text-sm font-semibold enabled:hover:text-white"
      onclick={apply}
      title="Open this schedule in the planner"
    >
      Apply
    </button>
  </div>

  <MiniSchedule selections={schedule.selections} />

  <div class="flex flex-row flex-wrap gap-x-4 gap-y-1 text-xs opacity-80">
    <span>
      {metrics.sectionCount} class{metrics.sectionCount === 1 ? '' : 'es'}
    </span>
    <span>
      {formatCredits(metrics.minCredits, metrics.maxCredits)} cr
    </span>
    <span>{metrics.daysWithClasses} days</span>
    <span>Gaps: {formatGap(metrics.totalGapMinutes)}</span>
    <span>
      {#if metrics.avgDisplayRating !== null}
        ★ {metrics.avgDisplayRating.toFixed(1)}
        ({metrics.ratedSectionCount}/{metrics.sectionCount} rated)
      {:else}
        Unrated
      {/if}
    </span>
  </div>

  {#if previewOpen}
    <SchedulePreview initialIndex={rank - 1} onclose={() => (previewOpen = false)} />
  {/if}
</div>
