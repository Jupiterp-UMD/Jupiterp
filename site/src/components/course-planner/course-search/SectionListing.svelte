<!-- 
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).

-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import InstructorListing from './InstructorListing.svelte';
  import MeetingListing from './MeetingListing.svelte';
  import {
    HoveredSectionStore,
    CurrentScheduleStore,
    CourseInfoPairStore,
    CourseSearchFilterStore,
  } from '../../../stores/CoursePlannerStores';
  import SeatData from './SeatData.svelte';
  import { ComparisonStore, addToComparison, removeFromComparison } from '../../../stores/ComparisonStore';
  import type { Section, CourseBasic } from '@jupiterp/jupiterp';
  import type { ScheduleBlock, ScheduleSelection } from '../../../types';
  import { comparisonProfessors } from '$lib/professor/Comparison';
  import { noDifferences } from '$lib/course-planner/Schedule';
  import { firstAvailableColor } from '$lib/course-planner/ColorSelector';

  interface Props {
    courseCode: string;
    section: Section;
    course: CourseBasic;
    isDesktop: boolean;
  }

  let {
    courseCode = $bindable(''),
    section = $bindable({} as Section),
    course = $bindable({} as CourseBasic),
    isDesktop = $bindable(false),
  }: Props = $props();

  let hoveredSection = $derived($HoveredSectionStore);
  let selectionsList = $derived($CurrentScheduleStore.selections);
  let scheduleName = $derived($CurrentScheduleStore.scheduleName);
  let onlyShowingOpen = $derived($CourseSearchFilterStore.clientSideFilters.onlyOpen === true);
  let wasSectionSelected = $state(false);

  $effect(() => {
    const isSectionSelected = selectionsList.some((selection) => selectionEquals(selection));
    if (wasSectionSelected && !isSectionSelected) {
      showRemoveAlert();
      removeHoverSection();
    }
    wasSectionSelected = isSectionSelected;
  });

  let newSelection: ScheduleSelection = {
    course,
    section,
    hover: false,
    differences: noDifferences(),
    colorNumber: -1,
  };

  let sectionAdded: boolean = $derived.by(() => {
    if (selectionsList || hoveredSection || onlyShowingOpen) {
      if (onlyShowingOpen && section.openSeats === 0) {
        return false;
      }
      return selectionsList.some((obj) => selectionEquals(obj));
    }
    return false;
  });

  let hoverSection: ScheduleSelection = {
    course,
    section,
    hover: true,
    differences: noDifferences(),
    colorNumber: -1,
  };

  // Auto-scroll for non desktop screens: scroll up to schedule when adding a section
  let plannerContainer: HTMLElement | null = null;
  onMount(() => {
    plannerContainer = document.getElementById('planner-container');
  });
  function scrollToTopPlannerTop() {
    if (!isDesktop && plannerContainer) {
      plannerContainer.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }
  }

  let addAlertVisible: boolean = $state(false);
  let removeAlertVisible: boolean = $state(false);

  // Function to show or fade
  // format-check exempt 8
  function showAddAlert() {
    addAlertVisible = true; // Make the div visible
    setTimeout(() => {
      setTimeout(() => {
        addAlertVisible = false;
      }, 500); // Delay before making `addAlertVisible` false to start fade out
    }, 0); // No delay after making visible
  }

  function showRemoveAlert() {
    removeAlertVisible = true;
    setTimeout(() => {
      setTimeout(() => {
        removeAlertVisible = false;
      }, 500); // Delay before making `removeAlertVisible` false to start fade out
    }, 0); // No delay after making visible
  }

  // In order for Svelte's reactivity to work properly, `selectionsList`
  // needs to be reassigned instead of using `.push` or `.splice`.
  function addSectionToSchedule() {
    if (!sectionAdded) {
      showAddAlert();
      removeHoverSection();
      newSelection.colorNumber = firstAvailableColor(selectionsList);
      CurrentScheduleStore.set({
        scheduleName,
        selections: [...selectionsList, newSelection],
      });
      CourseInfoPairStore.update((value) => {
        return value === null
          ? null
          : {
              courseCode: courseCode,
              sectionCode: section.sectionCode,
            };
      });
    } else {
      showRemoveAlert();
      const index = selectionsList.findIndex((obj) => selectionEquals(obj));
      if (index !== -1) {
        CurrentScheduleStore.set({
          scheduleName,
          selections: [...selectionsList.slice(0, index), ...selectionsList.slice(index + 1)],
        });
      }
      CourseInfoPairStore.update((value) => {
        return value !== null && value.courseCode === courseCode && value.sectionCode === section.sectionCode
          ? null
          : value;
      });
    }
    if (isDesktop) {
      addHoverSection();
    }
  }

  function addHoverSection() {
    if (!sectionAdded) {
      hoverSection.colorNumber = firstAvailableColor(selectionsList);
      HoveredSectionStore.set(hoverSection);
    }
  }

  function removeHoverSection() {
    HoveredSectionStore.set(null);
  }

  function selectionEquals(s: ScheduleBlock): boolean {
    return (
      'course' in s && s.course.courseCode === courseCode && s.section.sectionCode === section.sectionCode && !s.hover
    );
  }

  let comparisonEntries = $derived(
    comparisonProfessors([], [section]).map(({ slug, name }) => ({
      slug,
      name,
      courses: [courseCode],
      course: courseCode,
    }))
  );
  let comparisonSelected = $derived(
    comparisonEntries.length > 0 &&
      comparisonEntries.every((professor) => $ComparisonStore.some((entry) => entry.slug === professor.slug))
  );
  let comparisonDisabled = $derived(
    !comparisonSelected &&
      new Set([
        ...$ComparisonStore.map((professor) => professor.slug),
        ...comparisonEntries.map((professor) => professor.slug),
      ]).size > 2
  );

  function toggleComparison() {
    if (comparisonSelected) comparisonEntries.forEach((professor) => removeFromComparison(professor.slug));
    else if (!comparisonDisabled) comparisonEntries.forEach(addToComparison);
  }

  let profsHover: boolean = $state(false);
  let locationHover: boolean = $state(false);

  const alertClasses: string = `fixed left-[50%] translate-x-[-50%] z-50 w-[40%] top-14 min-w-72 h-8 rounded-lg text-center text-white lg:hidden bg-orange shadow-lg content-center transition-opacity duration-500`;
</script>

<!-- Ignoring a11y for mouseover because it's a non-essential feature -->
<div
  role="listitem"
  onmouseover={isDesktop ? addHoverSection : null}
  onmouseout={isDesktop ? removeHoverSection : null}
  onfocus={isDesktop ? addHoverSection : null}
  onfocusin={isDesktop ? addHoverSection : null}
  onfocusout={isDesktop ? removeHoverSection : null}
  onblur={isDesktop ? removeHoverSection : null}
  style="border-top: 1px solid var(--color-outline); display: grid; grid-template-columns: auto minmax(0, 1fr); padding-bottom: 0.25rem;"
  class={sectionAdded ? 'bg-hover' : 'hover:bg-hover/50'}
>
  <!-- Section code (click to view) -->
  <!-- onclick triggers addSectionToSchedule and then scrollToTopPlannerTop -->
  <button
    onclick={() => {
      addSectionToSchedule();
      scrollToTopPlannerTop();
    }}
    class="text-text-secondary w-12 text-sm font-semibold xl:w-14 xl:text-base"
  >
    <div class="h-full align-top">
      {section.sectionCode}
    </div>
  </button>

  <div class="min-w-0 pr-1 {comparisonSelected ? 'bg-orange/10' : ''}">
    <div class="w-full">
      {#each section.instructors as instructor, i (i)}
        <InstructorListing
          {instructor}
          slug={section.instructorSlugs?.[i]}
          {courseCode}
          bind:profsHover
          {removeHoverSection}
        />
      {/each}
    </div>
    <div class="section-seat-row flex min-w-0 flex-nowrap items-start justify-between gap-1">
      <button
        type="button"
        onclick={addSectionToSchedule}
        class="min-w-0 flex-1 text-left"
        title="{sectionAdded ? 'Remove course from' : 'Add course to'} schedule"
      >
        <SeatData {section} />
      </button>
      {#if comparisonEntries.length > 0}
        <button
          type="button"
          disabled={comparisonDisabled}
          aria-pressed={comparisonSelected}
          aria-label={`Compare ${comparisonEntries.map((professor) => professor.name).join(' and ')} in ${courseCode}, section ${section.sectionCode}`}
          title={comparisonSelected ? 'Remove from comparison' : 'Add to comparison'}
          class="border-orange text-orange hover:bg-orange/10 inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[0.625rem] font-semibold disabled:opacity-50"
          class:bg-hover={comparisonSelected}
          onclick={toggleComparison}
        >
          <span aria-hidden="true">⇆</span> Compare with…
        </button>
      {/if}
    </div>
    <button
      type="button"
      onclick={addSectionToSchedule}
      title="{sectionAdded ? 'Remove course from' : 'Add course to'} schedule"
      class="w-full text-left"
    >
      {#each section.meetings as meeting, i (i)}
        <MeetingListing {meeting} bind:locationHover {removeHoverSection} />
      {/each}
    </button>
  </div>
</div>

{#if addAlertVisible}
  <div class={alertClasses} out:fade={{ duration: 300 }}>
    <span class="h-full align-middle font-medium">Class Added</span>
  </div>
{/if}

{#if removeAlertVisible}
  <div class={alertClasses} out:fade={{ duration: 300 }}>
    <span class="h-full align-middle font-medium">Class Removed</span>
  </div>
{/if}
