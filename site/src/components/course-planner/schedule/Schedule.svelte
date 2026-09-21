<!-- 
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).
Copyright (C) 2026 Andrew Cupps
-->
<script lang="ts">
  import { getClasstimeBounds, schedulify, appendHoveredSection } from '../../../lib/course-planner/Schedule';
  import ScheduleDay from './ScheduleDay.svelte';
  import ScheduleBackground from './ScheduleBackground.svelte';
  import { formatCredits, testudoLink } from '../../../lib/course-planner/Formatting';
  import InstructorListing from '../course-search/InstructorListing.svelte';
  import { HoveredSectionStore, CurrentScheduleStore, CourseInfoPairStore } from '../../../stores/CoursePlannerStores';
  import MeetingListing from '../course-search/MeetingListing.svelte';
  import SeatData from '../course-search/SeatData.svelte';
  import CourseCondition from '../course-search/CourseCondition.svelte';
  import type { Schedule, ScheduleBlock, ScheduleSelection } from '../../../types';
  import type { CourseBasic, Section } from '@jupiterp/jupiterp';
  import { chainScroll } from '../../../lib/course-planner/ChainScroll';
  import { PlannerState } from '../../../stores/CoursePlannerStores';

  let { earliest = $bindable(8), latest = $bindable(16), h = $bindable(0) } = $props();

  // Internal reactive states for schedule dimensions
  let earliestClassStart = $state(earliest);
  let latestClassEnd = $state(latest);
  let bgHeight = $state(h);

  // Synchronize internal calculations upward back into the $bindable props safely
  $effect.pre(() => {
    earliest = earliestClassStart;
  });
  $effect.pre(() => {
    latest = latestClassEnd;
  });
  $effect.pre(() => {
    h = bgHeight;
  });

  let plannerState: { isDesktop: boolean; chainScrollParent: HTMLElement | null } = $state({
    isDesktop: false,
    chainScrollParent: null,
  });
  PlannerState.subscribe((state) => {
    plannerState = state;
  });

  let hoveredSection: ScheduleSelection | null = $state(null);
  HoveredSectionStore.subscribe((stored) => {
    hoveredSection = stored;
  });

  let selections: ScheduleBlock[] = $state([]);
  CurrentScheduleStore.subscribe((stored) => {
    selections = stored.selections;
  });

  // Calculate schedule strictly as a $derived rune
  let schedule: Schedule = $derived(schedulify(appendHoveredSection(selections, hoveredSection)));

  $effect(() => {
    const selectionsWithHovered = appendHoveredSection(selections, hoveredSection);

    if (selectionsWithHovered.length === 0) {
      earliestClassStart = 8;
      latestClassEnd = 16;
    } else {
      const bounds = getClasstimeBounds(schedule);
      let localStart = bounds.earliestStart;
      let localEnd = bounds.latestEnd;

      const boundDiff = localEnd - localStart;
      if (boundDiff < 8) {
        localStart -= Math.floor((8 - boundDiff) / 2);
        localEnd += Math.floor((8 - boundDiff) / 2);
      }

      if (localStart === -5 && localEnd === 5) {
        localStart = 8;
        localEnd = 16;
      }

      // Avoid layout loops by checking equality before setting states
      if (earliestClassStart !== localStart) earliestClassStart = localStart;
      if (latestClassEnd !== localEnd) latestClassEnd = localEnd;
    }
  });

  let showCourseInfo: string | null = $state(null);
  let showSectionInfo: string | null = $state(null);

  CourseInfoPairStore.subscribe((pair) => {
    if (pair === null) {
      showCourseInfo = null;
      showSectionInfo = null;
    } else {
      showCourseInfo = pair.courseCode;
      showSectionInfo = pair.sectionCode;
    }
  });

  // Lookup target course using $derived.by
  let selectedSelection = $derived.by(() => {
    if (showCourseInfo === null) return null;
    return (
      selections.find(
        (selection) =>
          'course' in selection &&
          selection.course.courseCode === showCourseInfo &&
          selection.section.sectionCode === showSectionInfo
      ) || null
    );
  });

  // Derived course profiles for child panels
  let courseInfoCourse: CourseBasic | null = $derived(
    selectedSelection && 'course' in selectedSelection ? selectedSelection.course : null
  );
  let courseInfoSection: Section | null = $derived(
    selectedSelection && 'course' in selectedSelection ? selectedSelection.section : null
  );

  // Clean state up cleanly if target course disappears from parent collection
  $effect(() => {
    if (showCourseInfo !== null && !selectedSelection) {
      showCourseInfo = null;
      showSectionInfo = null;
    }
  });

  let elt: HTMLDivElement | null = $state(null);
  let innerWidth: number = $state(0);
  let scheduleContainerHeight: number = $state(0);
  let courseInfoPanelHeight: number = $state(0);
  let scheduleElement: HTMLDivElement | null = $state(null);
  let infoPanelAtTop = $derived(courseInfoPanelHeight > scheduleContainerHeight);
</script>

<svelte:window bind:innerWidth />

<div
  bind:this={scheduleElement}
  id="planner-schedule"
  class="chain-scroll-only custom-scrollbar -pl-3 relative order-1 flex h-[calc(100svh-11rem)] min-h-80 w-full flex-row overflow-auto text-center text-lg font-medium lg:order-2 lg:mr-1 lg:h-[calc(100svh-3rem)]"
  use:chainScroll={{
    parent: plannerState.chainScrollParent,
    enabled: !plannerState.isDesktop,
    element: scheduleElement,
  }}
  bind:clientHeight={scheduleContainerHeight}
>
  <div
    bind:this={elt}
    style="height:calc(100% - 1.5rem)"
    class="relative grid grow pl-9 2xl:pl-11"
    class:grid-cols-5={schedule.other.length == 0}
    class:grid-cols-6={schedule.other.length > 0}
  >
    <!-- Background lines for the schedule -->
    <!-- format-check exempt 2 -->
    <div
      style="width: {schedule.other.length == 0 ? 'calc(100% - 8px)' : '83.3%'};"
      class="absolute bottom-0 left-1 top-6 z-0"
    >
      <ScheduleBackground bind:earliest={earliestClassStart} bind:latest={latestClassEnd} bind:h={bgHeight} />
    </div>

    <!-- ClassTimes by day -->
    <ScheduleDay name="Mon" classes={schedule.monday} bind:earliestClassStart bind:latestClassEnd bind:bgHeight />
    <ScheduleDay name="Tue" classes={schedule.tuesday} bind:earliestClassStart bind:latestClassEnd bind:bgHeight />
    <ScheduleDay name="Wed" classes={schedule.wednesday} bind:earliestClassStart bind:latestClassEnd bind:bgHeight />
    <ScheduleDay name="Thu" classes={schedule.thursday} bind:earliestClassStart bind:latestClassEnd bind:bgHeight />
    <ScheduleDay name="Fri" classes={schedule.friday} bind:earliestClassStart bind:latestClassEnd bind:bgHeight />

    <!-- 'Other' classes (OnlineAsync, Unspecified) -->
    {#if schedule.other.length > 0}
      <ScheduleDay name="Other" classes={schedule.other} type="Other" {bgHeight} />
    {/if}
  </div>

  <!-- Course info panel -->
  {#if showCourseInfo !== null && courseInfoCourse !== null && courseInfoSection !== null}
    <div
      class={`border-outline bg-bg-secondary absolute z-10 mb-2 w-full rounded-xl border-2 px-2 py-1 text-left shadow-md ${
        infoPanelAtTop ? 'top-0' : 'bottom-0'
      }`}
      bind:clientHeight={courseInfoPanelHeight}
    >
      <!-- X Button to get rid of course info -->
      <button
        class="absolute right-0 top-0 h-7 w-7 justify-center 2xl:right-1 2xl:top-1"
        onclick={() => {
          CourseInfoPairStore.set(null);
        }}
        title="Hide course info panel"
      >
        <!-- format-check exempt 7 -->
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 384 512"
          style="transform: translateX(-50%) translateY(-50%);"
          class="fill-text-primary stroke-text-primary absolute left-[50%] top-[50%] h-5 w-5 2xl:h-6 2xl:w-6"
        >
          <!--!Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path
            d="M376.6 84.5c11.3-13.6 9.5-33.8-4.1-45.1s-33.8-9.5-45.1 4.1L192 206 56.6 43.5C45.3 29.9 25.1 28.1 11.5 39.4S-3.9 70.9 7.4 84.5L150.3 256 7.4 427.5c-11.3 13.6-9.5 33.8 4.1 45.1s33.8 9.5 45.1-4.1L192 306 327.4 468.5c11.3 13.6 31.5 15.4 45.1 4.1s15.4-31.5 4.1-45.1L233.7 256 376.6 84.5z"
          /></svg
        >
      </button>

      <!-- Course info -->
      <div style="width: calc(100% - 1.5rem);" class="text-lg 2xl:text-xl">
        <span class="font-bold">
          {courseInfoCourse.courseCode}
        </span>
        <span class="font-normal"> - {courseInfoCourse.name} </span>
        <span class="text-orange mx-1 text-base font-normal underline 2xl:text-lg">
          <a href={testudoLink(courseInfoCourse.courseCode)} rel="external noopener noreferrer" target="_blank">
            (view on Testudo)
          </a>
        </span>
      </div>

      <div class="text-sm 2xl:text-base">
        {formatCredits(courseInfoCourse.minCredits, courseInfoCourse.maxCredits)} credits | Section {courseInfoSection.sectionCode}
      </div>
      {#if courseInfoCourse.genEds != null && courseInfoCourse.genEds.length > 0}
        <div class="text-sm 2xl:text-base">
          <span class="font-black underline"> GenEds: </span>
          {courseInfoCourse.genEds.map((g) => g.code).join(', ')}
        </div>
      {/if}
      <!-- Keyed by index: instructor names, meetings and conditions are not
           guaranteed unique, and a duplicate key is fatal in Svelte 5. -->
      {#each courseInfoSection.instructors as instructor, i (i)}
        <InstructorListing
          {instructor}
          slug={courseInfoSection.instructorSlugs?.[i]}
          profsHover={false}
          removeHoverSection={() => {}}
        />
      {/each}
      <div class="text-sm 2xl:text-base">
        {#each courseInfoSection.meetings as meeting, i (i)}
          <MeetingListing {meeting} condensed={true} locationHover={false} removeHoverSection={() => {}} />
        {/each}
      </div>

      <SeatData section={courseInfoSection} />

      <div class="text-base leading-5 2xl:text-lg">
        {#if courseInfoCourse.conditions != null && courseInfoCourse.conditions.length > 0}
          <div class="pb-2 text-sm 2xl:text-base">
            {#each courseInfoCourse.conditions as condition, i (i)}
              <CourseCondition {condition} />
            {/each}
          </div>
        {/if}
        {#if courseInfoCourse.description != null}
          {courseInfoCourse.description}
        {/if}
      </div>
    </div>
  {/if}
</div>
