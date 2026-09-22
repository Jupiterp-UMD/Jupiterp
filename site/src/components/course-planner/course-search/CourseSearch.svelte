<!-- 
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).

-->
<script lang="ts">
  import { untrack } from 'svelte';

  import CourseListing from './CourseListing.svelte';
  import { pendingResults } from '../../../lib/course-planner/CourseSearch';
  import { appendHoveredSection } from '../../../lib/course-planner/Schedule';
  import {
    HoveredSectionStore,
    CurrentScheduleStore,
    SearchResultsStore,
    CatalogTermStore,
  } from '../../../stores/CoursePlannerStores';
  import { formatSemester } from '../../../lib/course-planner/Grades';
  import ScheduleSelector from './ScheduleSelector.svelte';
  import type { Course } from '@jupiterp/jupiterp';
  import type { ScheduleBlock, ScheduleSelection } from '../../../types';
  import CourseSearchBox from './CourseSearchBox.svelte';
  import SolarSystemLoader from './SolarSystemLoader.svelte';
  import { createCourseSearchActivationController } from '../../../lib/course-planner/CourseSearchActivation';
  import { chainScroll } from '../../../lib/course-planner/ChainScroll';
  import { PlannerState } from '../../../stores/CoursePlannerStores';
  import CustomUserEvents from './CustomUserEvents.svelte';

  let plannerState: { isDesktop: boolean; chainScrollParent: HTMLElement | null } = $state({
    isDesktop: false,
    chainScrollParent: null,
  });
  $effect(() => {
    return PlannerState.subscribe((state) => {
      plannerState = state;
    });
  });

  const FILTER_SCROLL_COLLAPSE_THRESHOLD = 100;
  let searchResultsElement: HTMLDivElement | null = $state(null);

  let blockSearchInputPointer = $state(untrack(() => !plannerState.isDesktop));

  let hoveredSection: ScheduleSelection | null = $state(null);
  $effect(() => {
    return HoveredSectionStore.subscribe((hovered) => {
      hoveredSection = hovered;
    });
  });

  let selections: ScheduleBlock[] = $state([]);
  $effect(() => {
    return CurrentScheduleStore.subscribe((stored) => {
      selections = stored.selections;
    });
  });

  let searchInput = $state('');
  let searchResults: Course[] = $state([]);
  $effect(() => {
    return SearchResultsStore.subscribe((results) => {
      searchResults = results;
    });
  });

  let isPendingResults = $derived(searchInput.length > 0 && searchResults.length === 0 ? pendingResults() : false);

  let genEdMenuOpen = $state(false);
  let searchInputElement: HTMLInputElement | null = $state(null);
  let keyboardPrimeElement: HTMLInputElement | null = $state(null);
  let searchActivationInProgress = false;
  let suppressSearchBlurReset = false;

  $effect(() => {
    if (plannerState.isDesktop) {
      blockSearchInputPointer = false;
    }
  });

  const searchActivation = createCourseSearchActivationController({
    isDesktop: () => plannerState.isDesktop,
    blockSearchInputPointer: () => blockSearchInputPointer,
    setBlockSearchInputPointer: (value: boolean) => {
      blockSearchInputPointer = value;
    },
    searchActivationInProgress: () => searchActivationInProgress,
    setSearchActivationInProgress: (value: boolean) => {
      searchActivationInProgress = value;
    },
    suppressSearchBlurReset: () => suppressSearchBlurReset,
    setSuppressSearchBlurReset: (value: boolean) => {
      suppressSearchBlurReset = value;
    },
    searchInputElement: () => searchInputElement,
    keyboardPrimeElement: () => keyboardPrimeElement,
    scrollToSearch,
  });

  // RUN 3 REPLACEMENT: Modifying an external store state -> converted to $effect
  $effect(() => {
    if (hoveredSection) {
      let index = searchResults.findIndex((course) => {
        return hoveredSection && course.courseCode === hoveredSection.section.courseCode;
      });
      if (index === -1) {
        HoveredSectionStore.set(null);
      }
    }
  });

  let totalCredits: number = $derived.by(() => {
    let credits = 0;
    if (selections || hoveredSection) {
      let selectionsWithHovered = appendHoveredSection(selections, hoveredSection);
      selectionsWithHovered.forEach((selection) => {
        if ('course' in selection) {
          credits += selection.course.minCredits;
        }
      });
    }
    return credits;
  });

  let scrollAcc = 0;

  function handleResultsScroll(event: WheelEvent) {
    if (!genEdMenuOpen) {
      return;
    }

    scrollAcc += event.deltaY;
    if (scrollAcc < 0) {
      scrollAcc = 0;
    }
    if (scrollAcc >= FILTER_SCROLL_COLLAPSE_THRESHOLD) {
      genEdMenuOpen = false;
      scrollAcc = 0;
    }
  }

  function scrollToSearch() {
    const searchElement = document.getElementById('planner-course-search');
    if (!searchElement) {
      return;
    }

    searchElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
</script>

<!-- Course Search -->
<div
  class="bg-bg-primary order-2 min-h-80 w-full flex-col border-solid lg:order-1 lg:grid lg:h-[100svh-3rem] lg:max-h-[100svh-3rem] lg:grid-cols-1 lg:grid-rows-[auto_minmax(0,1fr)]"
>
  <!-- Course search input and filters [height of 7.5rem] -->
  <div id="planner-course-search" class="px-1 pt-1">
    <div class="ml-1 flex flex-row pb-1 text-xs 2xl:text-sm">
      <div>{$CatalogTermStore === null ? '' : formatSemester($CatalogTermStore)}</div>
      <div class="grow text-right">Credits: {totalCredits}</div>
    </div>
    <ScheduleSelector />
    <div class="relative flex w-full flex-col border-b-2 border-t-2 border-solid pt-1">
      <!-- Course search box (input, filters, and dept/prof suggestions) -->
      <CourseSearchBox
        bind:searchInput
        bind:genEdMenuOpen
        bind:inputElement={searchInputElement}
        inputId="planner-course-search-input"
        onFocus={searchActivation.handleSearchFocus}
        onBlur={searchActivation.handleSearchBlur}
      >
        <!-- Mobile keyboard prime input: used to make the mobile keyboard appear -->
        {#snippet beforeInput()}
          <input
            bind:this={keyboardPrimeElement}
            id="mobile-keyboard-prime"
            type="text"
            autocomplete="off"
            aria-label="Mobile keyboard trigger"
            tabindex="-1"
            class="pointer-events-none fixed left-0 top-0 h-0 w-0 opacity-0"
          />
        {/snippet}
      </CourseSearchBox>
    </div>
  </div>
  <!-- Course search results & dept suggestions [min-height: 20rem - 7.75rem = 12.25rem]-->
  <!-- IDK what but [height: min-height (12.25rem) - 1.5rem = 10.75rem] -->
  <div
    bind:this={searchResultsElement}
    id="planner-search-results"
    class="chain-scroll-only custom-scrollbar min-h-49 focus:outline-hidden h-[calc(100svh-10.75rem)] overflow-y-scroll px-1 lg:h-auto lg:min-h-0"
    use:chainScroll={{
      parent: plannerState.chainScrollParent,
      enabled: !plannerState.isDesktop,
      element: searchResultsElement,
    }}
    onwheel={handleResultsScroll}
  >
    <!-- Course search results -->
    {#each searchResults as courseMatch (courseMatch.courseCode)}
      <CourseListing course={courseMatch} isDesktop={plannerState.isDesktop} />
    {/each}
    {#if isPendingResults}
      <div class="flex items-center justify-center py-8">
        <SolarSystemLoader size={120} />
      </div>
    {/if}
  </div>

  <CustomUserEvents />
</div>
