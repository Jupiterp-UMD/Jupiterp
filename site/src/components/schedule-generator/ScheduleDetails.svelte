<!--
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).

-->
<script lang="ts">
  import InstructorListing from '../course-planner/course-search/InstructorListing.svelte';
  import MeetingListing from '../course-planner/course-search/MeetingListing.svelte';
  import SeatData from '../course-planner/course-search/SeatData.svelte';
  import { getColorFromNumber } from '../../lib/course-planner/ClassMeetingUtils';
  import { formatCredits, splitCourseCode } from '../../lib/course-planner/Formatting';
  import type { ScheduleSelection } from '../../types';

  interface Props {
    selections: ScheduleSelection[];
  }

  let { selections }: Props = $props();

  // The planner's listing components report link hovers so the planner can
  // suppress its section hover-preview. A generated schedule has no such
  // preview, so there is nothing to do with them here.
  function ignoreHover() {}
</script>

<ul class="flex flex-col">
  {#each selections as selection (selection)}
    {@const course = selection.course}
    {@const section = selection.section}
    <li class="border-border flex flex-col gap-0.5 border-b py-2 last:border-b-0">
      <div class="flex flex-row items-center gap-1.5">
        <!-- Same color as this course's blocks on the schedule. -->
        <span
          style="background-color: {getColorFromNumber(selection.colorNumber)};"
          class="h-2.5 w-2.5 shrink-0 rounded-full"
          aria-hidden="true"
        ></span>
        <span class="text-sm font-semibold">{splitCourseCode(course.courseCode)}</span>
        <span class="text-text-secondary text-xs">Section {section.sectionCode}</span>
        <span class="text-text-secondary ml-auto text-xs">
          {formatCredits(course.minCredits, course.maxCredits)} cr
        </span>
      </div>
      <div class="text-text-secondary text-xs leading-tight">{course.name}</div>

      {#each section.instructors as instructor, i (i)}
        <InstructorListing
          {instructor}
          slug={section.instructorSlugs?.[i]}
          courseCode={course.courseCode}
          profsHover={false}
          removeHoverSection={ignoreHover}
        />
      {:else}
        <div class="text-sm">Instructor TBA</div>
      {/each}

      {#each section.meetings as meeting, i (i)}
        <MeetingListing {meeting} locationHover={false} removeHoverSection={ignoreHover} />
      {/each}

      <SeatData {section} />
    </li>
  {/each}
</ul>
