<!--
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).

-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import { CloseOutline } from 'flowbite-svelte-icons';
  import PreviewWeekGrid from './PreviewWeekGrid.svelte';
  import ScheduleDetails from './ScheduleDetails.svelte';
  import { loadCourseGrades } from '../../lib/course-planner/GradesLoader';
  import { formatCredits } from '../../lib/course-planner/Formatting';
  import type { GeneratedSchedule } from '../../lib/schedule-generator/types';

  // A popup that shows one generated schedule the way the course planner
  // would, without applying it: closing it returns to the results untouched.

  interface Props {
    schedule: GeneratedSchedule;
    rank: number;
    /** Apply this schedule to the planner (the card's own Apply action). */
    onapply: () => void;
    /** Dismiss the preview and return to the generated schedules. */
    onclose: () => void;
  }

  let { schedule, rank, onapply, onclose }: Props = $props();

  let metrics = $derived(schedule.metrics);

  const titleId = $props.id();
  let dialog: HTMLDivElement | null = $state(null);
  let closeButton: HTMLButtonElement | null = $state(null);

  // The results column is a scrolling, positioned container that sits below
  // the site header in stacking order, so a popup rendered inside it could
  // never cover the header. Moving the node to <body> lets it cover the page.
  function portal(node: HTMLElement) {
    document.body.appendChild(node);
    return {
      destroy() {
        node.remove();
      },
    };
  }

  onMount(() => {
    const opener = document.activeElement;
    closeButton?.focus();
    // Grade data feeds the GPA chip beside each professor. It is not loaded
    // on the generator page otherwise; this no-ops for courses already fetched.
    for (const { course } of schedule.selections) {
      void loadCourseGrades(course.courseCode, { retryError: true });
    }
    return () => {
      if (opener instanceof HTMLElement) {
        opener.focus();
      }
    };
  });

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onclose();
      return;
    }
    // Keep Tab inside the popup while it is open.
    if (event.key === 'Tab' && dialog) {
      const focusable = dialog.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex="0"]');
      if (focusable.length === 0) {
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (!dialog.contains(active)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      onclose();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- The backdrop click is a mouse convenience; Escape and the close button
     cover the keyboard. -->
<div
  class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4 lg:p-8"
  role="presentation"
  onclick={handleBackdropClick}
  use:portal
  transition:fade={{ duration: 150 }}
>
  <div
    bind:this={dialog}
    class="border-border bg-bg-primary text-text-primary flex h-full w-full max-w-7xl flex-col rounded-xl border shadow-lg"
    role="dialog"
    aria-modal="true"
    aria-labelledby={titleId}
  >
    <!-- Title bar: Apply and close sit together in the top right. -->
    <div class="border-border flex flex-row items-center gap-x-4 border-b px-3 py-2">
      <h2 id={titleId} class="text-lg font-bold">Schedule #{rank}</h2>
      <div class="hidden flex-row flex-wrap gap-x-4 text-xs opacity-80 sm:flex">
        <span>{metrics.sectionCount} class{metrics.sectionCount === 1 ? '' : 'es'}</span>
        <span>{formatCredits(metrics.minCredits, metrics.maxCredits)} cr</span>
        <span>{metrics.daysWithClasses} days</span>
        {#if metrics.avgDisplayRating !== null}
          <span>★ {metrics.avgDisplayRating.toFixed(1)}</span>
        {/if}
      </div>
      <button
        class="border-orange text-orange hover:bg-orange ml-auto rounded-md border px-3 py-1 text-sm font-semibold hover:text-white"
        onclick={onapply}
        title="Open this schedule in the planner"
      >
        Apply
      </button>
      <button
        bind:this={closeButton}
        class="hover:bg-hover -ml-2 rounded-md p-1"
        onclick={onclose}
        title="Close preview"
        aria-label="Close preview"
      >
        <CloseOutline class="h-5 w-5" />
      </button>
    </div>

    <!-- Laid out like the planner: course list beside the week on desktop,
         week first with the list underneath on small screens. -->
    <div class="custom-scrollbar flex min-h-0 grow flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
      <div
        class="custom-scrollbar border-border order-2 px-3 text-left lg:order-1 lg:w-80 lg:shrink-0 lg:overflow-y-auto lg:border-r"
      >
        <ScheduleDetails selections={schedule.selections} />
      </div>
      <div class="custom-scrollbar order-1 p-2 lg:order-2 lg:grow lg:overflow-y-auto">
        <PreviewWeekGrid selections={schedule.selections} />
      </div>
    </div>
  </div>
</div>
