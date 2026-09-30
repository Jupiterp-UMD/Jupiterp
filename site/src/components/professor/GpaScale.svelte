<!--
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).
Copyright (C) 2026 Andrew Cupps

The professor's GPA on a fixed 2.0-4.0 scale. With a course selected, the same
scale carries the comparison: every other instructor who taught it as a grey
dot, and the course's overall GPA as a line.
-->
<script lang="ts">
  import { courseGradeSummary, courseInstructorGradeSummary } from '../../lib/api/JupiterpApi';
  import type { GradeSummary } from '../../lib/api/types';
  import { MIN_GRADED_FOR_GPA } from '../../lib/course-planner/Grades';

  interface Props {
    gpa: number;
    instructorSlug: string;
    courseCode: string | null;
  }

  let { gpa, instructorSlug, courseCode }: Props = $props();

  interface Comparison {
    courseGpa: number | null;
    others: number[];
  }

  // eslint-disable-next-line svelte/prefer-svelte-reactivity
  const cache = new Map<string, Comparison>();
  let comparison = $state<Comparison | null>(null);
  let requestId = 0;

  function calculateGpaWithoutActiveProf(
    course: GradeSummary | undefined,
    own: GradeSummary | undefined
  ): number | null {
    if (course?.gpa == null) return null;
    if (own?.gpa == null) return Number(course.gpa);
    const restGraded = course.graded - own.graded;
    if (restGraded < MIN_GRADED_FOR_GPA) return null;
    return (Number(course.gpa) * course.graded - Number(own.gpa) * own.graded) / restGraded;
  }

  async function loadComparison(code: string): Promise<Comparison> {
    const [coursePage, instructorPage] = await Promise.all([
      courseGradeSummary({ courseCodes: code }),
      courseInstructorGradeSummary({ courseCodes: code }),
    ]);
    const courseRow = coursePage.data[0];
    const own = instructorPage.data.find((row) => row.instructor_slug === instructorSlug);
    return {
      courseGpa: calculateGpaWithoutActiveProf(courseRow, own),
      others: instructorPage.data
        .filter((row) => row.instructor_slug !== instructorSlug && row.gpa !== null && row.graded >= MIN_GRADED_FOR_GPA)
        .map((row) => Number(row.gpa)),
    };
  }

  $effect(() => {
    const code = courseCode;
    const id = ++requestId;
    if (code === null) {
      comparison = null;
      return;
    }
    const cached = cache.get(code);
    if (cached) {
      comparison = cached;
      return;
    }
    comparison = null;
    loadComparison(code)
      .then((result) => {
        cache.set(code, result);
        if (id === requestId) {
          comparison = result;
        }
      })
      .catch((error) => console.error('Course comparison failed:', error));
  });

  const MIN = 2;
  const MAX = 4;
  function pos(value: number): number {
    return Math.max(0, Math.min(100, ((value - MIN) / (MAX - MIN)) * 100));
  }

  let delta = $derived(
    comparison?.courseGpa == null ? null : Math.round(((gpa - comparison.courseGpa) / comparison.courseGpa) * 100)
  );
</script>

<div class="flex flex-col gap-2">
  <span class="text-lg font-medium">Average GPA{courseCode === null ? '' : ` in ${courseCode}`}</span>
  <span class="flex flex-row items-baseline gap-1.5 leading-none">
    <span class="text-orange text-4xl font-semibold tracking-tight">{gpa.toFixed(2)}</span>
    <span class="text-text-secondary text-sm font-medium">out of 4.0</span>
  </span>
  {#if comparison !== null && comparison.others.length > 0}
    <div class="flex flex-row flex-wrap gap-x-6 pb-1 text-lg">
      {#if delta !== null}
        <span class:text-success={delta > 0} class:text-warning={delta < 0}>
          {#if delta === 0}
            Same as other professors
          {:else}
            {Math.abs(delta)}% {delta > 0 ? 'higher' : 'lower'} than other {courseCode} professors
          {/if}
        </span>
      {/if}
    </div>
  {/if}
  <div>
    <div class="relative h-7">
      <div class="bg-outline top-3.25 absolute inset-x-0 h-0.5 rounded"></div>
      {#if comparison !== null}
        {#each comparison.others as other, i (i)}
          <div
            style="left: {pos(other)}%"
            class="border-text-secondary bg-bg-secondary absolute top-2 -ml-1.5 h-3 w-3 rounded-full border-2"
            title="Another instructor: {other.toFixed(2)}"
          ></div>
        {/each}
        {#if comparison.courseGpa !== null}
          <div
            style="left: {pos(comparison.courseGpa)}%"
            class="bg-text-primary absolute top-0.5 -ml-px h-6 w-0.5"
            title="Other instructors' average: {comparison.courseGpa.toFixed(2)}"
          ></div>
        {/if}
      {/if}
      <div
        style="left: {pos(gpa)}%"
        class="bg-orange ring-orange/20 top-1.25 -ml-2.25 h-4.5 w-4.5 absolute rounded-full"
      ></div>
    </div>
    <div class="text-text-secondary flex flex-row justify-between text-sm">
      <span>2.0</span><span>4.0</span>
    </div>
  </div>
</div>
