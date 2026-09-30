<!-- 
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).

-->
<script lang="ts">
  import { getClasstimeBounds, schedulify, appendHoveredSection } from '../../../lib/course-planner/Schedule';
  import ScheduleDay from './ScheduleDay.svelte';
  import ScheduleBackground from './ScheduleBackground.svelte';
  import CourseInfoPanel from './CourseInfoPanel.svelte';
  import { HoveredSectionStore, CurrentScheduleStore, CourseInfoPairStore } from '../../../stores/CoursePlannerStores';
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
      class={`border-outline bg-bg-secondary absolute z-10 mb-2 w-full rounded-xl border-2 shadow-md ${
        infoPanelAtTop ? 'top-0' : 'bottom-0'
      }`}
      bind:clientHeight={courseInfoPanelHeight}
    >
      <!-- Keyed so per-course UI state (e.g. an expanded description) resets
           when a different course is opened. -->
      {#key `${courseInfoCourse.courseCode}-${courseInfoSection.sectionCode}`}
        <CourseInfoPanel
          course={courseInfoCourse}
          section={courseInfoSection}
          onclose={() => CourseInfoPairStore.set(null)}
        />
      {/key}
    </div>
  {/if}
</div>
