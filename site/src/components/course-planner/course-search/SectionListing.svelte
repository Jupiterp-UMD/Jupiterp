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
  import type { Section, CourseBasic } from '@jupiterp/jupiterp';
  import type { ScheduleBlock, ScheduleSelection } from '../../../types';
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

  // Auto-subscribed with `$store`, not `Store.subscribe(...)`.
  //
  // A manual `.subscribe()` in a component body is never cleaned up: Svelte
  // only unsubscribes for the `$store` form. This component is instantiated
  // once per section, so a search returning 451 sections registered 1,353
  // callbacks -- and kept every one of them after the results were replaced,
  // along with the detached component state each closure captured. Browsing a
  // few filters left thousands of dead subscribers, and every subsequent store
  // update had to walk all of them. That is what made the filters feel like
  // they were getting slower the longer the page stayed open.
  let hoveredSection = $derived($HoveredSectionStore);
  let selectionsList = $derived($CurrentScheduleStore.selections);
  let scheduleName = $derived($CurrentScheduleStore.scheduleName);
  let onlyShowingOpen = $derived($CourseSearchFilterStore.clientSideFilters.onlyOpen === true);

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
    sectionAdded = !sectionAdded;
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
  style="border-top: 1px solid var(--color-outline); display: grid; grid-template-columns: auto 1fr; padding-bottom: 0.25rem;"
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

  <button
    onclick={addSectionToSchedule}
    title="{sectionAdded ? 'Remove course from' : 'Add course to'} schedule"
    class="w-full text-left"
  >
    <!-- Section info -->
    <div class="w-full">
      <!-- Instructors -->
      <!-- Keyed by index: instructor names and meetings are NOT unique within
           a section (e.g. PSYC100 0201 lists "OnlineAsync" twice), and a
           duplicate key is a fatal runtime error in Svelte 5. -->
      {#each section.instructors as instructor, i (i)}
        <InstructorListing {instructor} slug={section.instructorSlugs?.[i]} {courseCode} bind:profsHover {removeHoverSection} />
      {/each}

      <!-- Seats info -->
      <SeatData {section} />

      <!-- Class meetings -->
      {#each section.meetings as meeting, i (i)}
        <MeetingListing {meeting} bind:locationHover {removeHoverSection} />
      {/each}
    </div>
  </button>
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
