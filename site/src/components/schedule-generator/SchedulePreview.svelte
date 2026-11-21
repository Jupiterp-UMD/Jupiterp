<!--
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).

-->
<script lang="ts">
  import { onMount, tick, untrack } from 'svelte';
  import { fly } from 'svelte/transition';
  import { goto, pushState } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import { AngleLeftOutline, AngleRightOutline, CloseOutline } from 'flowbite-svelte-icons';
  import PreviewWeekGrid from './PreviewWeekGrid.svelte';
  import ScheduleDetails from './ScheduleDetails.svelte';
  import { loadCourseGrades } from '../../lib/course-planner/GradesLoader';
  import { formatCredits } from '../../lib/course-planner/Formatting';
  import { applyGeneratedSchedule } from '../../lib/schedule-generator/ApplySchedule';
  import { swipeStep } from '../../lib/schedule-generator/SchedulePreview';
  import { sortedByCriterion } from '../../lib/schedule-generator/ScheduleSorter';
  import { GenerationStateStore, GeneratorSortStore } from '../../stores/GeneratorStores';
  import type { GeneratedSchedule } from '../../lib/schedule-generator/types';

  // One generated schedule, shown in the generator page's own layout like the
  // course planner: its course details take the place of the wishlist and
  // constraints sidebar, and its week takes the place of the results. Opened
  // by clicking a result card; the page hides its two columns meanwhile, so
  // closing returns to them exactly as they were. The arrow buttons, the
  // left/right arrow keys and a sideways swipe move through the other
  // generated schedules.

  interface Props {
    /** Position, in the results' current sort order, of the schedule to open on. */
    initialIndex: number;
    /** Called once the preview should be removed. */
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

  // Opening the preview adds a history entry (without changing the URL), so
  // the browser's Back button returns to the results instead of leaving the
  // generator.
  interface PreviewPageState {
    schedulePreview?: boolean;
  }
  let historyEntryAdded = $state(false);

  onMount(() => {
    const opener = document.activeElement;
    pushState('', { schedulePreview: true } as PreviewPageState);
    historyEntryAdded = true;
    // The page may have been scrolled down its results; start at the top.
    view?.focus({ preventScroll: true });
    view?.scrollIntoView();
    return () => {
      // The results are shown again in the same update that removes the
      // preview, so the card can only take focus once that has been applied.
      if (opener instanceof HTMLElement) {
        void tick().then(() => opener.focus());
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
      // Drop the history entry this preview added; the effect above then closes it.
      history.back();
    } else {
      onclose();
    }
  }

  function apply() {
    applyGeneratedSchedule(schedule);
    const toPlanner = () => goto(resolve('/'));
    if ((page.state as PreviewPageState).schedulePreview) {
      // Drop the history entry this preview added before leaving, so Back from
      // the planner returns to the generator's results. (Replacing the entry
      // instead would leave Back changing the URL without leaving the planner.)
      addEventListener('popstate', toPlanner, { once: true });
      history.back();
    } else {
      toPlanner();
    }
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
  // The page scrolls up and down on small screens, so `swipeStep` only counts
  // a movement that is long enough and clearly more horizontal than vertical.
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
    const step = swipeStep(touch.clientX - start.x, touch.clientY - start.y);
    if (step !== null) {
      move(step);
    }
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

<!-- An arrow on either side of the schedule moves to the previous (-1) or next
     (1) one. `placement` is the button's cell in the grid below. -->
{#snippet arrowButton(step: 1 | -1, placement: string)}
  {@const Icon = step === 1 ? AngleRightOutline : AngleLeftOutline}
  {@const label = step === 1 ? 'Next schedule' : 'Previous schedule'}
  <button
    class="hover:text-orange flex items-center justify-center transition-colors disabled:opacity-25 disabled:hover:text-inherit {placement}"
    onclick={() => move(step)}
    disabled={step === 1 ? !hasNext : !hasPrevious}
    title="{label} ({step === 1 ? '→' : '←'})"
    aria-label={label}
  >
    <Icon class="h-6 w-6 lg:h-8 lg:w-8" />
  </button>
{/snippet}

{#if schedule}
  <!-- One grid, so each piece is rendered once and only its place changes.
       On desktop: arrow, details, the bar above the week, arrow. The negative
       margin lets the arrows use the page's 0.75rem side padding, so arrow +
       details (2.5rem + 20.25rem) end where the generator's 22rem sidebar
       does. On small screens: the bar, then the week between the arrows, then
       the details, scrolling with the page like the planner. -->
  <div
    bind:this={view}
    class="-mx-3 grid grid-cols-[1.5rem_minmax(0,1fr)_1.5rem] outline-none lg:col-span-2 lg:min-h-0 lg:grid-cols-[2.5rem_20.25rem_minmax(0,1fr)_2.5rem] lg:grid-rows-[auto_minmax(0,1fr)] lg:overflow-hidden"
    role="region"
    aria-labelledby={titleId}
    tabindex="-1"
  >
    <!-- Title bar: Apply and close sit together in the top right. -->
    <div
      class="border-border col-span-3 row-start-1 flex flex-row items-center gap-x-4 border-b px-3 py-2 lg:col-span-1 lg:col-start-3"
    >
      <h2 id={titleId} class="whitespace-nowrap text-lg font-bold" aria-live="polite">
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

    {@render arrowButton(-1, 'col-start-1 row-start-2 lg:row-span-2 lg:row-start-1')}

    <!-- The week. Both the outgoing and incoming schedule occupy this one
         grid cell while they slide past each other. Swiping it sideways also
         moves between schedules; `touch-pan-y` leaves vertical scrolling to
         the browser. The swipe is a touch shortcut for the arrow buttons on
         either side, which remain the accessible controls. On small screens
         its height is the planner schedule's; on desktop it fills the page.
         The week fits that height unless the day is longer than ten hours,
         when it scrolls, as the planner's schedule does. -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="col-start-2 row-start-2 grid h-[calc(100svh-11rem)] min-h-80 touch-pan-y grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)] overflow-hidden lg:col-start-3 lg:h-auto lg:min-h-0"
      ontouchstart={handleTouchStart}
      ontouchend={handleTouchEnd}
      ontouchcancel={() => (touchStart = null)}
    >
      {#key schedule}
        <div
          class="custom-scrollbar col-start-1 row-start-1 min-h-0 overflow-y-auto py-2"
          in:fly={{ x: direction * SLIDE_DISTANCE_PX, duration: slideDuration }}
          out:fly={{ x: -direction * SLIDE_DISTANCE_PX, duration: slideDuration }}
        >
          <PreviewWeekGrid selections={schedule.selections} />
        </div>
      {/key}
    </div>

    {@render arrowButton(1, 'col-start-3 row-start-2 lg:col-start-4 lg:row-span-2 lg:row-start-1')}

    <!-- The details, where the generator's sidebar was. -->
    <div
      class="custom-scrollbar border-border col-span-3 row-start-3 px-3 text-left lg:col-span-1 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:overflow-y-auto lg:border-r lg:pl-1"
    >
      <ScheduleDetails selections={schedule.selections} />
    </div>
  </div>
{/if}
