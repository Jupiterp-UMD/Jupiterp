<!--
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).

-->
<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { goto, pushState } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import { AngleLeftOutline, AngleRightOutline, CloseOutline } from 'flowbite-svelte-icons';
  import PreviewWeekGrid from './PreviewWeekGrid.svelte';
  import ScheduleDetails from './ScheduleDetails.svelte';
  import { loadCourseGrades } from '../../lib/course-planner/GradesLoader';
  import { formatCredits } from '../../lib/course-planner/Formatting';
  import { applyGeneratedSchedule } from '../../lib/schedule-generator/ApplySchedule';
  import { sortedByCriterion } from '../../lib/schedule-generator/ScheduleSorter';
  import { GenerationStateStore, GeneratorSortStore } from '../../stores/GeneratorStores';
  import type { GeneratedSchedule } from '../../lib/schedule-generator/types';

  // A full-page view of one generated schedule, laid out like the course
  // planner, opened by clicking a result card. It covers the generator below
  // the site header without leaving it, so closing the view returns to the
  // results exactly as they were. The arrow buttons and the left/right arrow
  // keys move through the other generated schedules.

  interface Props {
    /** Position, in the results' current sort order, of the schedule to open on. */
    initialIndex: number;
    /** Called once the view should be removed. */
    onclose: () => void;
  }

  let { initialIndex, onclose }: Props = $props();

  // The same list, in the same order, as the results gallery shows.
  let schedules: GeneratedSchedule[] = $derived(
    $GenerationStateStore.kind === 'done' ? sortedByCriterion($GenerationStateStore.schedules, $GeneratorSortStore) : []
  );

  let index = $state(untrack(() => initialIndex));
  // Which way the last move went: 1 forward, -1 back. Sets the slide direction.
  let direction = $state(1);

  let schedule = $derived(schedules[Math.min(index, schedules.length - 1)]);
  let metrics = $derived(schedule?.metrics);
  let hasPrevious = $derived(index > 0);
  let hasNext = $derived(index < schedules.length - 1);

  const SLIDE_DISTANCE_PX = 60;
  const slideDuration =
    typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 180;

  const titleId = $props.id();
  let view: HTMLDivElement | null = $state(null);

  // Opening the view adds a history entry (without changing the URL), so the
  // browser's Back button closes it like a page instead of leaving the generator.
  interface PreviewPageState {
    schedulePreview?: boolean;
  }
  let historyEntryAdded = $state(false);

  // Rendered inside a result card, the view would sit inside the card's
  // clickable area and the results' scroll container. Moving the node to
  // <body> makes it a page-level layer.
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
    // The generator underneath is covered, so keep it out of the tab order.
    const covered = document.querySelector('main');
    covered?.setAttribute('inert', '');
    pushState('', { schedulePreview: true } as PreviewPageState);
    historyEntryAdded = true;
    view?.focus();
    return () => {
      covered?.removeAttribute('inert');
      if (opener instanceof HTMLElement) {
        opener.focus();
      }
    };
  });

  // Back was pressed (or the page moved on): the history entry is gone.
  $effect(() => {
    if (historyEntryAdded && !(page.state as PreviewPageState).schedulePreview) {
      onclose();
    }
  });

  // Grade data feeds the GPA chip beside each professor. It is not loaded on
  // the generator page otherwise; this no-ops for courses already fetched.
  $effect(() => {
    for (const { course } of schedule?.selections ?? []) {
      void loadCourseGrades(course.courseCode, { retryError: true });
    }
  });

  function close() {
    if ((page.state as PreviewPageState).schedulePreview) {
      // Drop the history entry this view added; the effect above then closes it.
      history.back();
    } else {
      onclose();
    }
  }

  function apply() {
    applyGeneratedSchedule(schedule);
    // Replace this view's history entry, so Back from the planner returns to
    // the generator's results.
    goto(resolve('/'), { replaceState: true });
  }

  function move(step: 1 | -1) {
    const next = index + step;
    if (next < 0 || next >= schedules.length) {
      return;
    }
    direction = step;
    index = next;
  }

  // Touch swipe: a sideways flick moves between schedules, like the arrows.
  // The view scrolls up and down on small screens, so a swipe only counts
  // when it is long enough and clearly more horizontal than vertical.
  const SWIPE_MIN_DISTANCE_PX = 50;
  const SWIPE_MAX_SLOPE = 0.6;
  let touchStart: { x: number; y: number } | null = null;

  function handleTouchStart(event: TouchEvent) {
    // A second finger (pinch zoom) cancels the swipe.
    touchStart = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
  }

  function handleTouchEnd(event: TouchEvent) {
    const start = touchStart;
    touchStart = null;
    const touch = event.changedTouches[0];
    if (!start || !touch) {
      return;
    }
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < SWIPE_MIN_DISTANCE_PX || Math.abs(dy) > Math.abs(dx) * SWIPE_MAX_SLOPE) {
      return;
    }
    // Swiping left brings in the next schedule from the right.
    move(dx < 0 ? 1 : -1);
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }
    const target = event.target;
    if (
      target instanceof HTMLElement &&
      (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
    ) {
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      move(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      move(1);
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if schedule}
  <div
    bind:this={view}
    class="bg-bg-primary text-text-primary fixed inset-x-0 bottom-0 top-12 z-40 flex flex-col outline-none"
    role="region"
    aria-labelledby={titleId}
    tabindex="-1"
    use:portal
    in:fade={{ duration: 120 }}
  >
    <!-- Title bar: Apply and close sit together in the top right. -->
    <div class="border-border flex flex-row items-center gap-x-4 border-b px-3 py-2">
      <h2 id={titleId} class="text-lg font-bold" aria-live="polite">
        Schedule {index + 1}
        <span class="text-text-secondary text-sm font-normal">of {schedules.length}</span>
      </h2>
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
        onclick={apply}
        title="Open this schedule in the planner"
      >
        Apply
      </button>
      <button
        class="hover:bg-hover -ml-2 rounded-md p-1"
        onclick={close}
        title="Back to the generated schedules (Esc)"
        aria-label="Back to the generated schedules"
      >
        <CloseOutline class="h-5 w-5" />
      </button>
    </div>

    <!-- The schedule, with an arrow on either side to move between schedules. -->
    <div class="flex min-h-0 grow flex-row">
      <button
        class="hover:text-orange flex w-6 shrink-0 items-center justify-center transition-colors disabled:opacity-25 disabled:hover:text-inherit sm:w-10"
        onclick={() => move(-1)}
        disabled={!hasPrevious}
        title="Previous schedule (←)"
        aria-label="Previous schedule"
      >
        <AngleLeftOutline class="h-6 w-6 sm:h-8 sm:w-8" />
      </button>

      <!-- Both the outgoing and incoming schedule occupy this one grid cell
           while they slide past each other. Swiping it sideways also moves
           between schedules; `touch-pan-y` leaves vertical scrolling to the
           browser. The swipe is a touch shortcut for the arrow buttons on
           either side, which remain the accessible controls. -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="grid min-h-0 min-w-0 grow touch-pan-y grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)] overflow-hidden"
        ontouchstart={handleTouchStart}
        ontouchend={handleTouchEnd}
        ontouchcancel={() => (touchStart = null)}
      >
        {#key schedule}
          <!-- Laid out like the planner: course list beside the week on
               desktop, week first with the list underneath on small screens. -->
          <div
            class="custom-scrollbar col-start-1 row-start-1 flex min-h-0 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden"
            in:fly={{ x: direction * SLIDE_DISTANCE_PX, duration: slideDuration }}
            out:fly={{ x: -direction * SLIDE_DISTANCE_PX, duration: slideDuration }}
          >
            <div
              class="custom-scrollbar border-border order-2 px-3 text-left lg:order-1 lg:w-80 lg:shrink-0 lg:overflow-y-auto lg:border-r"
            >
              <ScheduleDetails selections={schedule.selections} />
            </div>
            <div class="custom-scrollbar order-1 py-2 sm:px-2 lg:order-2 lg:grow lg:overflow-y-auto">
              <PreviewWeekGrid selections={schedule.selections} />
            </div>
          </div>
        {/key}
      </div>

      <button
        class="hover:text-orange flex w-6 shrink-0 items-center justify-center transition-colors disabled:opacity-25 disabled:hover:text-inherit sm:w-10"
        onclick={() => move(1)}
        disabled={!hasNext}
        title="Next schedule (→)"
        aria-label="Next schedule"
      >
        <AngleRightOutline class="h-6 w-6 sm:h-8 sm:w-8" />
      </button>
    </div>
  </div>
{/if}
