<!-- 
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).

-->
<script lang="ts">
  import {
    formatClasstime,
    formatInstructors,
    formatLocation,
    splitCourseCode,
  } from '../../../lib/course-planner/Formatting';
  import { getColorFromNumber } from '../../../lib/course-planner/ClassMeetingUtils';
  import Tooltip from './Tooltip.svelte';
  import { CourseInfoPairStore, CurrentScheduleStore, EventEditStore } from '../../../stores/CoursePlannerStores';
  import type { ClassMeetingExtended, ScheduleBlock, SelectionDifferences } from '../../../types';

  interface Props {
    meeting: ClassMeetingExtended;
    isInOther: boolean;
    // Bindable hooks ensure layout engines calculate coordinates instantly
    earliestClassStart?: number;
    latestClassEnd?: number;
  }

  let { meeting, isInOther, earliestClassStart = $bindable(8), latestClassEnd = $bindable(16) }: Props = $props();

  let boundDiff: number = $derived(latestClassEnd - earliestClassStart);

  const meetingDetails = $derived.by(() => {
    let secCode = '';
    let formattedTime = '';
    let decStartTime = 0;
    let decEndTime = 0;
    let hasLocation = true;
    let location = '';

    if (meeting.meeting != null) {
      secCode = meeting.sectionCode;
      if (typeof meeting.meeting !== 'string') {
        formattedTime = formatClasstime(meeting.meeting.classtime);
        decStartTime = meeting.meeting.classtime.start;
        decEndTime = meeting.meeting.classtime.end;

        if (meeting.userEvent) {
          if (meeting.meeting.location.building.trim() !== '') {
            location = '📍' + meeting.meeting.location.building;
          } else {
            location = '';
          }
        } else if (meeting.meeting.location.room != null) {
          location = formatLocation(meeting.meeting.location);
        } else if (meeting.meeting.location.building === 'OnlineSync') {
          location = 'ONLINE';
        } else {
          location = meeting.meeting.location.building;
        }
      } else {
        hasLocation = false;
        switch (meeting.meeting) {
          case 'TBA':
            formattedTime = 'TBA';
            break;
          case 'OnlineAsync':
            formattedTime = 'ONLINE ASYNC';
            break;
          case 'Unknown':
            formattedTime = 'UNKNOWN TIME';
            break;
          case 'Unspecified':
            formattedTime = 'UNSPECIFIED TIME';
            break;
          case 'No Sections':
            formattedTime = 'NO SECTIONS';
            break;
        }
        secCode = meeting.sectionCode;
      }
    }

    return { secCode, formattedTime, decStartTime, decEndTime, hasLocation, location };
  });

  let h = $state(0);
  let w = $state(0);
  let innerHeight = $state(0);
  let innerWidth = $state(0);

  let fontSize: number = $state(1);
  if (typeof document !== 'undefined') {
    fontSize = parseInt(getComputedStyle(document.documentElement).fontSize) / 16;
  }

  // Purely derived note truncation lines length calculation
  let notesLines = $derived.by(() => {
    if (!h || !fontSize || !meeting.userEvent) return 0;
    const bodySpace = h - 24 * fontSize;
    const totalLines = Math.floor(bodySpace / (16 * fontSize));
    let linesUsed = 0;
    if (bodySpace > 48 * fontSize) linesUsed++; // time block footprint
    if (bodySpace > 16 * fontSize && meetingDetails.hasLocation) linesUsed++; // location footprint
    return Math.max(0, totalLines - linesUsed);
  });

  // Auto-subscribed with `$store`. A manual `.subscribe()` in a component body
  // is never cleaned up, and this component is instantiated once per meeting on
  // the schedule, so each one leaked a callback plus the state it captured.
  let selections = $derived($CurrentScheduleStore.selections);
  let scheduleName = $derived($CurrentScheduleStore.scheduleName);

  // Wrap in $derived so changes to the meeting prop update these automatically
  const differences: SelectionDifferences = $derived(meeting.differences);
  const instructorsChange = $derived(differences.instructors);
  const meetingsTypeChange = $derived(differences.meetingType);
  const meetingTimeChange = $derived(differences.meetingTime);
  const meetingLocChange = $derived(differences.meetingLocation);

  const formattedInstructors: string = $derived(formatInstructors(meeting.instructors));

  function removeCourseByClassMeeting() {
    const index = selections.findIndex((obj) => selectionEqualsByCode(obj));
    if (index !== -1) {
      CurrentScheduleStore.set({
        scheduleName,
        selections: [...selections.slice(0, index), ...selections.slice(index + 1)],
      });
    }
  }

  function selectionEqualsByCode(s: ScheduleBlock): boolean {
    if ('course' in s) {
      return s.course.courseCode === meeting.courseCode && s.section.sectionCode === meetingDetails.secCode;
    } else {
      return s.id === meeting.id;
    }
  }

  let courseInfoPair = $derived($CourseInfoPairStore);
  let eventEditVal = $derived($EventEditStore);

  function toggleEventInfo() {
    if (meeting.userEvent) {
      if (eventEditVal?.eventId === meeting.id) {
        EventEditStore.set(null);
      } else {
        EventEditStore.set({ eventId: meeting.id as string });
      }
    } else if (
      courseInfoPair !== null &&
      courseInfoPair.courseCode === meeting.courseCode &&
      courseInfoPair.sectionCode === meeting.sectionCode
    ) {
      CourseInfoPairStore.set(null);
    } else {
      CourseInfoPairStore.set({
        courseCode: meeting.courseCode,
        sectionCode: meeting.sectionCode,
      });
    }
  }
</script>

<svelte:window bind:innerHeight bind:innerWidth />

<button
  bind:clientWidth={w}
  bind:clientHeight={h}
  style=" top: {((meetingDetails.decStartTime - earliestClassStart) / boundDiff) * 100}%;
                height: {((meetingDetails.decEndTime - meetingDetails.decStartTime) / boundDiff) * 100}%;
                background-color: {getColorFromNumber(meeting.colorNumber)};  
                opacity: {meeting.hover ? 0.4 : 1.0};
                width: {(1 / meeting.conflictTotal) * 100}%;
                left: {((meeting.conflictIndex - 1) / meeting.conflictTotal) * 100}%;"
  class="absolute flex w-full flex-col justify-center justify-items-center rounded-lg pb-1"
  onclick={toggleEventInfo}
  class:otherCategoryClassMeeting={isInOther}
  title={meeting.userEvent ? 'Click to edit event' : 'Click to show more course info'}
>
  <!-- Close / Removal Button Link -->
  {#if !meeting.hover}
    <div
      aria-label={meeting.userEvent ? 'Remove event from schedule' : 'Remove course from schedule'}
      role="button"
      tabindex="0"
      onkeydown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          removeCourseByClassMeeting();
        }
      }}
      class="hover:text-orange absolute right-0 top-0 h-4 w-6 items-center justify-center overflow-clip 2xl:right-1 2xl:top-1"
      onclick={(e) => {
        e.stopPropagation();
        removeCourseByClassMeeting();
      }}
      title={meeting.userEvent ? 'Remove event from schedule' : 'Remove course from schedule'}
    >
      <svg xmlns="http://w3.org" viewBox="0 0 24 24" class="absolute left-1 top-0 h-4 w-4"
        ><path
          fill="currentColor"
          d="m12 13.4l-2.917 2.925q-.277.275-.704.275t-.704-.275q-.275-.275-.275-.7t.275-.7L10.6 12L7.675 9.108Q7.4 8.831 7.4 8.404t.275-.704q.275-.275.7-.275t.7.275L12 10.625L14.892 7.7q.277-.275.704-.275t.704.275q.3.3.3.713t-.3.687L13.375 12l2.925 2.917q.275.277.275.704t-.275.704q-.3.3-.712.3t-.688-.3z"
        /></svg
      >
    </div>
  {/if}

  {#if w >= 72}
    {#if h > 1.5 * fontSize || isInOther}
      <div
        class="translucentGray items-middle flex min-h-6 w-full items-center justify-center truncate rounded-t-lg font-sans text-base font-semibold"
        class:text-sm={w < 120}
        class:text-xs={w < 104}
        class:rounded-b-lg={h < 1.5 * fontSize}
      >
        <span>{meeting.courseCode}</span>
      </div>
    {/if}

    <div class="w-full grow px-2 font-sans text-xs font-thin 2xl:font-normal">
      {#if h - 24 * fontSize > 64 * fontSize || isInOther}
        <div class="static truncate" class:underline={instructorsChange} class:decoration-dotted={instructorsChange}>
          {#if instructorsChange}
            <Tooltip
              text={'⚠ ' + formattedInstructors}
              tooltipText="Instructors have changed since you last visited Jupiterp."
            />
          {:else}
            {formattedInstructors}
          {/if}
        </div>
      {/if}

      {#if h - 24 * fontSize > 48 * fontSize || isInOther}
        <div
          class="static truncate"
          class:underline={meetingTimeChange || meetingsTypeChange}
          class:decoration-dotted={meetingTimeChange || meetingsTypeChange}
        >
          {#if meetingTimeChange}
            <Tooltip
              text={'⚠ ' + meetingDetails.formattedTime}
              tooltipText="Class meeting time has changed since you last visited Jupiterp."
            />
          {:else if meetingsTypeChange}
            <Tooltip
              text={'⚠ ' + meetingDetails.formattedTime}
              tooltipText="Meeting type has changed since you last visited Jupiterp."
            />
          {:else}
            {meetingDetails.formattedTime}
          {/if}
        </div>
      {/if}

      {#if !meeting.userEvent && (h - 24 * fontSize > 32 * fontSize || isInOther)}
        <div class="static truncate">Section {meetingDetails.secCode}</div>
      {/if}

      {#if h - 24 * fontSize > 16 * fontSize && meetingDetails.hasLocation}
        <div class="static truncate" class:underline={meetingLocChange} class:decoration-dotted={meetingLocChange}>
          {#if meetingLocChange}
            <Tooltip
              text={'⚠ ' + meetingDetails.location}
              tooltipText="Class location has changed since you last visited Jupiterp."
            />
          {:else}
            {meetingDetails.location}
          {/if}
        </div>
      {/if}

      {#if meeting.userEvent && meeting.notes && notesLines > 0}
        <div
          style="display: -webkit-box; -webkit-line-clamp: {notesLines}; -webkit-box-orient: vertical;"
          class="static overflow-hidden italic"
        >
          {meeting.notes}
        </div>
      {/if}
    </div>
  {:else}
    <div
      class="wrap-break-word w-full text-wrap rounded-t-lg font-sans text-xs font-semibold"
      class:rounded-b-lg={h < 1.5 * fontSize}
    >
      {meeting.userEvent ? meeting.courseCode : splitCourseCode(meeting.courseCode)}
    </div>
  {/if}
</button>

<style>
  .translucentGray {
    background-color: rgba(0, 0, 0, 0.07);
  }

  .otherCategoryClassMeeting {
    position: relative;
    margin-bottom: 8px;
  }
</style>
