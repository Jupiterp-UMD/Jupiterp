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
  import { loadComparisonProfessors, type ProfessorGpa } from '../../lib/professor/Comparison';
  import { calculateGpaWithoutActiveProf, hasEnoughForGpa } from '../../lib/course-planner/Grades';

  import GpaDots from './GpaDots.svelte';

  interface Props {
    gpa: number;
    instructorSlug: string;
    courseCode: string | null;
  }

  let { gpa, instructorSlug, courseCode }: Props = $props();

  interface Comparison {
    courseGpa: number | null;
    others: ProfessorGpa[];
  }

  let comparison = $state<Comparison | null>(null);
  $effect(() => {
    const code = courseCode;
    const slug = instructorSlug;
    let cancelled = false;
    comparison = null;
    if (code === null) return;
    loadComparisonProfessors(code)
      .then(({ professors, overall }) => {
        if (cancelled) return;
        comparison = {
          courseGpa: calculateGpaWithoutActiveProf(
            overall,
            professors.find((professor) => professor.slug === slug)?.distribution
          ),
          others: professors.flatMap((professor) =>
            professor.slug !== slug && professor.distribution && hasEnoughForGpa(professor.distribution)
              ? [{ slug: professor.slug, name: professor.name, gpa: professor.distribution.gpa }]
              : []
          ),
        };
      })
      .catch((error) => console.error('Course comparison failed:', error));
    return () => {
      cancelled = true;
    };
  });

  let delta = $derived(
    comparison?.courseGpa == null || comparison.courseGpa === 0
      ? null
      : Math.round(((gpa - comparison.courseGpa) / comparison.courseGpa) * 100)
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
  <GpaDots
    professors={comparison?.others ?? []}
    {courseCode}
    mean={comparison?.courseGpa ?? null}
    markers={[{ gpa }]}
  />
</div>
