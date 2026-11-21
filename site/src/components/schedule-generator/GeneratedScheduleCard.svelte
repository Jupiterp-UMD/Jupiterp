<!--
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).

-->
<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import MiniSchedule from './MiniSchedule.svelte';
  import { applyGeneratedSchedule } from '../../lib/schedule-generator/ApplySchedule';
  import { formatCredits } from '../../lib/course-planner/Formatting';
  import { GeneratorPreviewIndexStore } from '../../stores/GeneratorStores';
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

  // The preview takes the place of the results on the generator page.
  function openPreview() {
    GeneratorPreviewIndexStore.set(rank - 1);
  }

  // The button that opens the preview; see the markup.
  let previewButton: HTMLButtonElement | null = $state(null);

  // A click anywhere else on the card counts as a click on that button. It
  // takes focus first, so focus returns to this card when the preview closes.
  function handleCardClick(event: MouseEvent) {
    if (event.target instanceof Element && event.target.closest('button')) {
      return;
    }
    previewButton?.focus();
    openPreview();
  }
</script>

<!-- The whole card opens the preview. The control is the button just inside,
     which lies behind the card's content: it is what the keyboard and screen
     readers use, and shows the focus ring around the card, without the Apply
     button being nested in a button. The click handler here only extends that
     button to the content in front of it, so it needs no key handling. -->
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div
  class="border-border bg-bg-primary shadow-xs hover:border-orange relative isolate flex cursor-pointer flex-col gap-2 rounded-xl border p-3"
  onclick={handleCardClick}
>
  <button
    bind:this={previewButton}
    class="absolute inset-0 -z-10 cursor-pointer rounded-xl"
    onclick={openPreview}
    aria-label="View schedule {rank} in detail"
  ></button>
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
</div>
