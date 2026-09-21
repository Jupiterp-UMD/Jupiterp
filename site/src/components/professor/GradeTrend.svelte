<!--
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).
Copyright (C) 2026 Andrew Cupps

GPA over terms, as an inline SVG line chart.

Deliberately not a charting library: this is one series of at most ~32 points,
and pulling in a dependency for it would cost more than it saves. The line is
drawn in the theme's orange, and every point is also present in a
visually-hidden table so the trend is not conveyed by shape alone.
-->
<script lang="ts">
  import { formatSemester } from '../../lib/course-planner/Grades';
  import { MIN_GRADED_FOR_GPA } from '../../lib/course-planner/Grades';
  import type { ProfessorTerm } from '../../lib/professor/ProfessorData';

  interface Props {
    terms: ProfessorTerm[];
  }

  let { terms }: Props = $props();

  const WIDTH = 640;
  const HEIGHT = 160;
  const PAD_X = 8;
  const PAD_Y = 12;

  // Terms with too few graded students are dropped rather than plotted: a
  // three-student section swinging the line to 4.0 reads as a real trend.
  let points = $derived(
    terms.filter((term) => term.gpa !== null && term.graded >= MIN_GRADED_FOR_GPA) as (ProfessorTerm & {
      gpa: number;
    })[]
  );

  // A fixed 2.0-4.0 band rather than a fitted one. Auto-scaling to the data
  // turns a 0.05 wobble into a dramatic slope, which is the most common way a
  // chart like this misleads.
  const MIN_GPA = 2;
  const MAX_GPA = 4;

  function x(index: number): number {
    if (points.length <= 1) {
      return WIDTH / 2;
    }
    return PAD_X + (index / (points.length - 1)) * (WIDTH - 2 * PAD_X);
  }

  function y(gpa: number): number {
    const clamped = Math.min(MAX_GPA, Math.max(MIN_GPA, gpa));
    const ratio = (clamped - MIN_GPA) / (MAX_GPA - MIN_GPA);
    return HEIGHT - PAD_Y - ratio * (HEIGHT - 2 * PAD_Y);
  }

  let path = $derived(points.map((point, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(point.gpa)}`).join(' '));
</script>

{#if points.length > 1}
  <div class="overflow-x-auto">
    <svg
      viewBox="0 0 {WIDTH} {HEIGHT}"
      class="h-40 w-full min-w-80"
      role="img"
      aria-label="Average GPA by term, from {formatSemester(points[0].term)} to {formatSemester(
        points[points.length - 1].term
      )}"
    >
      <!-- 3.0 reference line, so a reader can place the series without axes -->
      <line
        x1={PAD_X}
        y1={y(3)}
        x2={WIDTH - PAD_X}
        y2={y(3)}
        class="stroke-outline"
        stroke-width="1"
        stroke-dasharray="4 4"
      />
      <path d={path} fill="none" class="stroke-orange" stroke-width="2" stroke-linejoin="round" />
      {#each points as point, i (point.term)}
        <circle cx={x(i)} cy={y(point.gpa)} r="3.5" class="fill-orange">
          <title>{formatSemester(point.term)}: {point.gpa.toFixed(2)} ({point.graded} graded)</title>
        </circle>
      {/each}
    </svg>
  </div>

  <div class="text-text-secondary flex flex-row justify-between text-xs">
    <span>{formatSemester(points[0].term)}</span>
    <span>2.0 – 4.0 scale</span>
    <span>{formatSemester(points[points.length - 1].term)}</span>
  </div>

  <!-- The chart conveys shape; this conveys the numbers. -->
  <table class="sr-only">
    <caption>Average GPA by term</caption>
    <thead>
      <tr><th scope="col">Term</th><th scope="col">Average GPA</th><th scope="col">Graded students</th></tr>
    </thead>
    <tbody>
      {#each points as point (point.term)}
        <tr>
          <td>{formatSemester(point.term)}</td>
          <td>{point.gpa.toFixed(2)}</td>
          <td>{point.graded}</td>
        </tr>
      {/each}
    </tbody>
  </table>
{:else}
  <p class="text-text-secondary text-sm">Not enough terms with grade data to show a trend.</p>
{/if}
