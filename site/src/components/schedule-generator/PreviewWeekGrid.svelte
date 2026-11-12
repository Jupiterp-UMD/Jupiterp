<!--
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).

-->
<script lang="ts">
  import { getClasstimeBounds, schedulify } from '../../lib/course-planner/Schedule';
  import { getColorFromNumber } from '../../lib/course-planner/ClassMeetingUtils';
  import { formatClasstime, formatInstructors, formatLocation } from '../../lib/course-planner/Formatting';
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

  // Height given to one hour before the grid starts to scroll; enough for a
  // 50-minute class to show its course, instructor and time. Phones get taller
  // hours because their narrow columns need the time on two lines.
  const MIN_REM_PER_HOUR = 4.5;
  const MIN_REM_PER_HOUR_NARROW = 6;

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

  // Same window the planner uses: whole hours around the classes, widened to
  // at least eight hours.
  function computeBounds(s: Schedule): { start: number; end: number } {
    const { earliestStart, latestEnd } = getClasstimeBounds(s);
    if (earliestStart === Number.MAX_SAFE_INTEGER) {
      return { start: 8, end: 16 };
    }
    let start = earliestStart;
    let end = latestEnd;
    const diff = end - start;
    if (diff < 8) {
      start -= Math.floor((8 - diff) / 2);
      end += Math.ceil((8 - diff) / 2);
    }
    return { start, end };
  }

  function formatHour(hour: number): string {
    const inDay = ((hour % 24) + 24) % 24;
    if (inDay === 0) {
      return '12 AM';
    }
    if (inDay < 12) {
      return inDay + ' AM';
    }
    return (inDay === 12 ? 12 : inDay - 12) + ' PM';
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

  // Start and end separately, for narrow blocks that stack them. Null for
  // meetings with no set time.
  function timeParts(cm: ClassMeetingExtended): { start: string; end: string } | null {
    if (typeof cm.meeting === 'string') {
      return null;
    }
    const [start, end] = formatClasstime(cm.meeting.classtime).split(' - ');
    return end !== undefined ? { start, end } : null;
  }

  function locationLabel(cm: ClassMeetingExtended): string {
    return typeof cm.meeting !== 'string' ? formatLocation(cm.meeting.location) : '';
  }

  function instructorLabel(cm: ClassMeetingExtended): string {
    return cm.instructors.length > 0 ? formatInstructors(cm.instructors) : 'Instructor TBA';
  }

  // Last names only, for blocks too narrow for a full name. The full name is
  // still in the block's tooltip and in the course list.
  function shortInstructorLabel(cm: ClassMeetingExtended): string {
    if (cm.instructors.length === 0) {
      return 'TBA';
    }
    return cm.instructors.map((name) => name.trim().split(/\s+/).pop() ?? name).join(', ');
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
  let bounds = $derived(computeBounds(schedule));
  let span = $derived(bounds.end - bounds.start);
  let hours = $derived(Array.from({ length: span + 1 }, (_, i) => bounds.start + i));
</script>

{#snippet block(cm: ClassMeetingExtended)}
  {@const time = timeParts(cm)}
  <!-- Each block is a size container: below 5.5rem wide (a phone's day
       column) its lines switch to short forms instead of being cut off. -->
  <div
    style={blockStyle(cm)}
    class="@container flex flex-col overflow-hidden rounded-lg text-black"
    class:absolute={typeof cm.meeting !== 'string'}
    title={blockTitle(cm)}
  >
    <div
      class="@max-[5.5rem]:text-[0.6875rem] @max-[5.5rem]:tracking-tight shrink-0 truncate bg-black/10 px-0.5 text-sm font-semibold leading-6"
    >
      {cm.courseCode}
    </div>
    <!-- A wrapping column: a line that does not fully fit moves to a second
         column, which is clipped, so no line is ever shown cut in half. The
         padding is on the lines, not the column, so that second column starts
         fully outside the block. -->
    <div class="@max-[5.5rem]:text-[0.6875rem] flex min-h-0 grow flex-col flex-wrap overflow-hidden text-xs leading-4">
      <div class="@max-[5.5rem]:px-0.5 w-full truncate px-1.5">
        <span class="@max-[5.5rem]:hidden">{instructorLabel(cm)}</span>
        <span class="@max-[5.5rem]:inline hidden">{shortInstructorLabel(cm)}</span>
      </div>
      {#if time}
        <div class="@max-[5.5rem]:hidden w-full truncate px-1.5">{timeLabel(cm)}</div>
        <div class="@max-[5.5rem]:block hidden w-full px-0.5">{time.start} –<br />{time.end}</div>
      {:else}
        <div class="@max-[5.5rem]:px-0.5 w-full truncate px-1.5">{timeLabel(cm)}</div>
      {/if}
      {#if locationLabel(cm) !== ''}
        <div class="@max-[5.5rem]:px-0.5 w-full truncate px-1.5">{locationLabel(cm)}</div>
      {/if}
      <div class="@max-[5.5rem]:hidden w-full truncate px-1.5">Section {cm.sectionCode}</div>
      <div class="@max-[5.5rem]:block hidden w-full truncate px-0.5">Sec {cm.sectionCode}</div>
    </div>
  </div>
{/snippet}

<div
  style="--grid-min: {span * MIN_REM_PER_HOUR + 3.5}rem; --grid-min-narrow: {span * MIN_REM_PER_HOUR_NARROW + 3.5}rem;"
  class="min-h-(--grid-min-narrow) sm:min-h-(--grid-min) flex h-full flex-col text-center"
>
  <!-- Day names -->
  <div class="flex flex-row pl-12 font-medium">
    {#each DAY_LABELS as label (label)}
      <div class="grow basis-0">{label}</div>
    {/each}
    {#if hasOther}
      <div class="grow basis-0">Other</div>
    {/if}
  </div>

  <!-- Time grid. The vertical margin leaves room for the first and last hour
       labels, which are centered on their lines. -->
  <div class="relative my-3 flex grow flex-row pl-12">
    {#each hours as hour, i (hour)}
      <div style="top: {(i / span) * 100}%;" class="absolute inset-x-0 flex -translate-y-1/2 flex-row items-center">
        <span class="w-11 shrink-0 whitespace-nowrap pr-1 text-right text-xs font-light">{formatHour(hour)}</span>
        <span class="bg-border h-px grow"></span>
      </div>
      {#if i < span}
        <div style="top: {((i + 0.5) / span) * 100}%;" class="bg-border absolute left-11 right-0 h-px opacity-60"></div>
      {/if}
    {/each}

    {#each days as day, dayIndex (dayIndex)}
      <div class="relative mx-0.5 grow basis-0">
        {#each day as cm (cm)}
          {@render block(cm)}
        {/each}
      </div>
    {/each}

    <!-- Meetings with no set time (online async, TBA) are stacked, not placed. -->
    {#if hasOther}
      <div class="relative mx-0.5 flex grow basis-0 flex-col gap-2">
        {#each schedule.other as cm (cm)}
          {@render block(cm)}
        {/each}
      </div>
    {/if}
  </div>
</div>
