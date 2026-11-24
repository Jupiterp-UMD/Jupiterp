<!--
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).

-->
<script lang="ts">
  import { schedulify } from '../../lib/course-planner/Schedule';
  import { getColorFromNumber } from '../../lib/course-planner/ClassMeetingUtils';
  import { formatClasstime, formatInstructors, formatLocation } from '../../lib/course-planner/Formatting';
  import { formatHour, previewHourWindow, weekGridHeightPercent } from '../../lib/schedule-generator/SchedulePreview';
  import type { ClassMeetingExtended, Schedule, ScheduleSelection } from '../../types';

  // A read-only, full-size week view of a generated schedule, drawn to look
  // like the course planner's schedule. The planner's own schedule components
  // are not reused because they read and write the planner's stores: every
  // block there carries a button that removes the course from the user's
  // real schedule, which a preview must never do.

  interface Props {
    selections: ScheduleSelection[];
  }

  let { selections }: Props = $props();

  const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

  const EMPTY_SCHEDULE: Schedule = {
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    other: [],
  };

  // A single malformed section (e.g. an unexpected day code) should leave an
  // empty grid rather than take the preview down.
  function safeSchedulify(sel: ScheduleSelection[]): Schedule {
    try {
      return schedulify(sel);
    } catch (e) {
      console.error('Failed to render schedule preview:', e);
      return EMPTY_SCHEDULE;
    }
  }

  function timeLabel(cm: ClassMeetingExtended): string {
    if (typeof cm.meeting !== 'string') {
      return formatClasstime(cm.meeting.classtime);
    }
    switch (cm.meeting) {
      case 'OnlineAsync':
        return 'Online async';
      case 'TBA':
        return 'Time TBA';
      default:
        return 'No set time';
    }
  }

  function locationLabel(cm: ClassMeetingExtended): string {
    return typeof cm.meeting !== 'string' ? formatLocation(cm.meeting.location) : '';
  }

  function instructorLabel(cm: ClassMeetingExtended): string {
    return cm.instructors.length > 0 ? formatInstructors(cm.instructors) : 'Instructor TBA';
  }

  // Blocks clip whatever does not fit, so the full text is also the tooltip.
  function blockTitle(cm: ClassMeetingExtended): string {
    return [`${cm.courseCode} (${cm.sectionCode})`, instructorLabel(cm), timeLabel(cm), locationLabel(cm)]
      .filter((line) => line !== '')
      .join('\n');
  }

  function blockStyle(cm: ClassMeetingExtended): string {
    const color = `background-color: ${getColorFromNumber(cm.colorNumber)};`;
    if (typeof cm.meeting === 'string') {
      return color;
    }
    const { start: classStart, end: classEnd } = cm.meeting.classtime;
    return (
      color +
      ` top: ${((classStart - bounds.start) / span) * 100}%;` +
      ` height: ${((classEnd - classStart) / span) * 100}%;` +
      ` width: ${(1 / cm.conflictTotal) * 100}%;` +
      ` left: ${((cm.conflictIndex - 1) / cm.conflictTotal) * 100}%;`
    );
  }

  let schedule = $derived(safeSchedulify(selections));
  let days = $derived([schedule.monday, schedule.tuesday, schedule.wednesday, schedule.thursday, schedule.friday]);
  let hasOther = $derived(schedule.other.length > 0);
  let bounds = $derived(previewHourWindow(schedule));
  let span = $derived(bounds.end - bounds.start);
  let hours = $derived(Array.from({ length: span + 1 }, (_, i) => bounds.start + i));
</script>

{#snippet block(cm: ClassMeetingExtended)}
  <!-- Where the class meets, or how ("Online async") when it has no set time. -->
  {@const place = typeof cm.meeting === 'string' ? timeLabel(cm) : locationLabel(cm)}
  <!-- Like the planner's blocks, down to the text sizes: course, then
       section above location. The time is left to the grid's lines and the
       instructor to the course list (both are in the tooltip too). Each block
       is a size container: the course shrinks at the widths the planner's
       does, and below 5.5rem (a phone's day column) the lines switch to short
       forms instead of being cut off. -->
  <div
    style={blockStyle(cm)}
    class="@container flex flex-col overflow-hidden rounded-lg text-black"
    class:absolute={typeof cm.meeting !== 'string'}
    title={blockTitle(cm)}
  >
    <div
      class="@max-[5.5rem]:text-[0.6875rem] @max-[5.5rem]:tracking-tight @min-[6.5rem]:text-sm @min-[7.5rem]:text-base bg-black/7 shrink-0 truncate px-0.5 text-xs font-semibold leading-6"
    >
      {cm.courseCode}
    </div>
    <!-- A wrapping column: a line that does not fully fit moves to a second
         column, which is clipped, so no line is ever shown cut in half. The
         padding is on the lines, not the column, so that second column starts
         fully outside the block. -->
    <div
      class="@max-[5.5rem]:text-[0.6875rem] flex min-h-0 grow flex-col flex-wrap overflow-hidden text-xs font-thin leading-4 2xl:font-normal"
    >
      <div class="@max-[5.5rem]:px-0.5 w-full truncate px-1.5">
        Sec<span class="@max-[5.5rem]:hidden">tion</span>
        {cm.sectionCode}
      </div>
      {#if place !== ''}
        <div class="@max-[5.5rem]:px-0.5 w-full truncate px-1.5">{place}</div>
      {/if}
    </div>
  </div>
{/snippet}

<!-- Fills its container, like the planner's schedule; only a day longer than
     ten hours grows past it, for the container to scroll. The hour-label
     gutter (2.25rem, 2.75rem on very wide screens), the label sizes and the
     day names are the planner's. -->
<div style="height: {weekGridHeightPercent(bounds)}%;" class="flex flex-col text-center">
  <!-- Day names -->
  <div class="flex flex-row pl-9 text-lg font-medium 2xl:pl-11">
    {#each DAY_LABELS as label (label)}
      <div class="grow basis-0">{label}</div>
    {/each}
    {#if hasOther}
      <div class="grow basis-0">Other</div>
    {/if}
  </div>

  <!-- Time grid. The vertical margin leaves room for the first and last hour
       labels, which are centered on their lines. -->
  <div class="relative my-3 flex grow flex-row pl-9 2xl:pl-11">
    {#each hours as hour, i (hour)}
      <div style="top: {(i / span) * 100}%;" class="absolute inset-x-0 flex -translate-y-1/2 flex-row items-center">
        <span
          class="w-10 shrink-0 whitespace-nowrap pr-1.5 text-right text-xs font-light 2xl:w-12 2xl:pr-2 2xl:text-sm"
        >
          {formatHour(hour)}
        </span>
        <span class="bg-border h-px grow"></span>
      </div>
      {#if i < span}
        <div
          style="top: {((i + 0.5) / span) * 100}%;"
          class="bg-border absolute left-10 right-0 h-px opacity-60 2xl:left-12"
        ></div>
      {/if}
    {/each}

    {#each days as day, dayIndex (dayIndex)}
      <div class="relative mx-0.5 grow basis-0 sm:mx-1">
        {#each day as cm (cm)}
          {@render block(cm)}
        {/each}
      </div>
    {/each}

    <!-- Meetings with no set time (online async, TBA) are stacked, not placed. -->
    {#if hasOther}
      <div class="relative mx-0.5 flex grow basis-0 flex-col gap-2 sm:mx-1">
        {#each schedule.other as cm (cm)}
          {@render block(cm)}
        {/each}
      </div>
    {/if}
  </div>
</div>
