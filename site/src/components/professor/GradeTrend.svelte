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
  const Y_TICKS = [4, 3, 2];

  function x(index: number): number {
    return points.length <= 1 ? 50 : (index / (points.length - 1)) * 100;
  }

  function y(gpa: number): number {
    const clamped = Math.min(MAX_GPA, Math.max(MIN_GPA, gpa));
    return (1 - (clamped - MIN_GPA) / (MAX_GPA - MIN_GPA)) * 100;
  }

  let linePoints = $derived(points.map((point, i) => `${x(i)},${y(point.gpa)}`).join(' '));

  let yearTicks = $derived.by(() => {
    const firsts: { year: number; x: number }[] = [];
    points.forEach((point, i) => {
      const year = Math.floor(point.term / 100);
      if (firsts.length === 0 || firsts[firsts.length - 1].year !== year) firsts.push({ year, x: x(i) });
    });
    const step = Math.max(1, Math.ceil(firsts.length / 6));
    return firsts.filter((_, i) => i % step === 0);
  });

  let columnWidth = $derived(points.length <= 1 ? 100 : 100 / (points.length - 1));

  let hoveredIndex: number | null = $state(null);
  let hovered = $derived(hoveredIndex === null ? null : points[hoveredIndex]);

  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      const step = event.key === 'ArrowRight' ? 1 : -1;
      const start = hoveredIndex ?? (step === 1 ? -1 : points.length);
      hoveredIndex = Math.min(points.length - 1, Math.max(0, start + step));
    } else if (event.key === 'Escape') {
      hoveredIndex = null;
    }
  }
</script>

{#if points.length > 1}
  <div class="flex flex-row gap-3">
    <div class="text-text-secondary relative h-52 w-7 shrink-0 text-sm">
      {#each Y_TICKS as tick (tick)}
        <span style="top: {y(tick)}%" class="absolute right-0 -translate-y-1/2">{tick.toFixed(1)}</span>
      {/each}
    </div>

    <div class="flex min-w-0 flex-1 flex-col gap-2">
      <div
        class="focus-visible:ring-orange relative h-52 rounded-sm focus:outline-none focus-visible:ring-2"
        role="slider"
        aria-label="Average GPA by term. Use the arrow keys to read each term."
        aria-valuemin={0}
        aria-valuemax={points.length - 1}
        aria-valuenow={hoveredIndex ?? points.length - 1}
        aria-valuetext={hovered
          ? `${formatSemester(hovered.term)}: ${hovered.gpa.toFixed(2)} GPA, ${hovered.graded} graded`
          : `${formatSemester(points[0].term)} to ${formatSemester(points[points.length - 1].term)}`}
        tabindex="0"
        onkeydown={onKeydown}
        onblur={() => (hoveredIndex = null)}
        onmouseleave={() => (hoveredIndex = null)}
      >
        {#each Y_TICKS as tick (tick)}
          <div style="top: {y(tick)}%" class="bg-outline absolute inset-x-0 h-px opacity-60"></div>
        {/each}

        {#if hoveredIndex !== null}
          <div style="left: {x(hoveredIndex)}%" class="bg-outline absolute inset-y-0 w-px"></div>
        {/if}

        <svg viewBox="0 0 100 100" preserveAspectRatio="none" class="absolute inset-0 h-full w-full overflow-visible">
          <polyline
            points={linePoints}
            fill="none"
            class="stroke-text-secondary"
            stroke-width="2"
            stroke-linejoin="round"
            stroke-linecap="round"
            vector-effect="non-scaling-stroke"
          />
        </svg>

        {#each points as point, i (point.term)}
          <div
            style="left: {x(i)}%; top: {y(point.gpa)}%"
            class="border-bg-primary absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-all duration-150"
            class:bg-orange={hoveredIndex === i}
            class:bg-text-secondary={hoveredIndex !== i}
            class:h-3.5={hoveredIndex === i}
            class:w-3.5={hoveredIndex === i}
            class:h-2.5={hoveredIndex !== i}
            class:w-2.5={hoveredIndex !== i}
          ></div>
        {/each}

        <!-- Full-height hover columns, so sweeping across reads every term. -->
        {#each points as point, i (point.term)}
          <div
            style="left: {x(i)}%; width: {columnWidth}%"
            class="absolute inset-y-0 -translate-x-1/2 cursor-crosshair"
            role="presentation"
            onmouseenter={() => (hoveredIndex = i)}
          ></div>
        {/each}

        {#if hovered && hoveredIndex !== null}
          {@const hx = x(hoveredIndex)}
          {@const hy = y(hovered.gpa)}
          <div
            style="left: {hx}%; top: {hy}%; transform: translate({hx < 15 ? '0%' : hx > 85 ? '-100%' : '-50%'}, {hy < 35
              ? '1rem'
              : 'calc(-100% - 1rem)'})"
            class="border-outline bg-bg-primary pointer-events-none absolute z-10 flex flex-col whitespace-nowrap rounded-lg border px-3 py-2 shadow-md"
          >
            <span class="font-semibold">{formatSemester(hovered.term)}</span>
            <span>{hovered.gpa.toFixed(2)} GPA · {hovered.graded.toLocaleString()} graded</span>
          </div>
        {/if}
      </div>

      <div class="text-text-secondary relative h-5 text-sm">
        {#each yearTicks as tick (tick.year)}
          <span style="left: {tick.x}%" class="absolute -translate-x-1/2">{tick.year}</span>
        {/each}
      </div>
    </div>
  </div>

  <!-- The chart conveys shape; this conveys the numbers. -->
  <table class="sr-only">
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
  <p class="text-text-secondary">Not enough terms with grade data to show a trend.</p>
{/if}
