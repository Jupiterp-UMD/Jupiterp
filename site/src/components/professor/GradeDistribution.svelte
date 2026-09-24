<!--
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).
Copyright (C) 2026 Andrew Cupps

Letter-grade distribution as vertical bars, one per bucket, each stacked into
its plus / plain / minus letters with the same shading as the planner's bars.
W sits apart in grey because a withdrawal is not a grade.
-->
<script lang="ts">
  import {
    bucketPercent,
    BUCKET_LETTERS,
    GRADE_BUCKETS,
    type GradeBucket,
    type GradeDistribution,
    type LetterGrade,
  } from '../../lib/course-planner/Grades';

  interface Props {
    distribution: GradeDistribution;
  }

  let { distribution }: Props = $props();

  const FILL: Record<LetterGrade, string> = {
    'A+': 'bg-grade-strong',
    A: 'bg-grade-mid',
    'A-': 'bg-grade-soft',
    'B+': 'bg-grade-strong',
    B: 'bg-grade-mid',
    'B-': 'bg-grade-soft',
    'C+': 'bg-grade-strong',
    C: 'bg-grade-mid',
    'C-': 'bg-grade-soft',
    'D+': 'bg-grade-strong',
    D: 'bg-grade-mid',
    'D-': 'bg-grade-soft',
    F: 'bg-grade-strong',
    W: 'bg-mid-gray',
    Other: '',
  };

  function letterPercent(letter: LetterGrade): string {
    if (distribution.barTotal === 0) return '0';
    const count = distribution.letters[letter];
    const percent = Math.round((count / distribution.barTotal) * 100);
    return percent === 0 && count > 0 ? '<1' : percent.toString();
  }

  let chart: HTMLDivElement | undefined = $state();

  let tip = $state<{ letter: LetterGrade; x: number; y: number; flip: boolean } | null>(null);
  let hovered = $derived(tip?.letter ?? null);

  function showTip(letter: LetterGrade, segment: HTMLElement) {
    if (!chart) return;
    const seg = segment.getBoundingClientRect();
    const box = chart.getBoundingClientRect();
    const flip = seg.left + seg.width / 2 - box.left > box.width * 0.6;
    tip = {
      letter,
      x: (flip ? seg.left : seg.right) - box.left + (flip ? -10 : 10),
      y: seg.top + seg.height / 2 - box.top,
      flip,
    };
  }

  let tallest = $derived(Math.max(1, ...GRADE_BUCKETS.map((bucket) => distribution.buckets[bucket])));
  function height(bucket: GradeBucket): number {
    return (distribution.buckets[bucket] / tallest) * 85;
  }
</script>

<div class="flex flex-col gap-4">
  <h4 class="text-lg font-bold">Grade Distribution</h4>

  <div
    bind:this={chart}
    class="relative grid h-56 grid-cols-[repeat(5,minmax(0,1fr))_1rem_minmax(0,1fr)] items-end gap-3 sm:gap-5"
  >
    {#each GRADE_BUCKETS as bucket (bucket)}
      {#if bucket === 'W'}
        <div></div>
      {/if}
      {@const hoveredHere = hovered !== null && BUCKET_LETTERS[bucket].includes(hovered) ? hovered : null}
      <div class="flex h-full flex-col justify-end gap-1.5">
        <span class="text-center font-semibold">{bucketPercent(distribution, bucket)}%</span>
        <div
          style="height: {height(bucket)}%"
          class="flex min-h-[3px] flex-col overflow-hidden rounded-t-md transition-[height] duration-300"
          role="presentation"
          onmouseleave={() => (tip = null)}
        >
          {#each BUCKET_LETTERS[bucket] as letter (letter)}
            <div
              style="flex: {distribution.letters[letter]}"
              class="{FILL[letter]} cursor-default transition-[opacity,filter]"
              class:grayscale={hoveredHere !== null && hoveredHere !== letter}
              class:opacity-50={hoveredHere !== null && hoveredHere !== letter}
              role="presentation"
              onmouseenter={(event) => showTip(letter, event.currentTarget)}
            ></div>
          {/each}
        </div>
      </div>
    {/each}

    {#if tip}
      <div
        style="left: {tip.x}px; top: {tip.y}px; transform: translate({tip.flip ? '-100%' : '0'}, -50%)"
        class="bg-text-primary text-bg-primary pointer-events-none absolute z-10 flex flex-col whitespace-nowrap rounded-lg px-3 py-2 shadow-lg"
      >
        <span class="text-base font-bold">{tip.letter.replace('-', '−')} · {letterPercent(tip.letter)}%</span>
        <span class="text-sm">{distribution.letters[tip.letter].toLocaleString()} students</span>
      </div>
    {/if}
  </div>

  <div
    class="border-outline -mt-2 grid grid-cols-[repeat(5,minmax(0,1fr))_1rem_minmax(0,1fr)] gap-3 border-t pt-2 sm:gap-5"
  >
    {#each GRADE_BUCKETS as bucket (bucket)}
      {#if bucket === 'W'}
        <div></div>
      {/if}
      <span class="text-center text-lg font-semibold">{bucket}</span>
    {/each}
  </div>
</div>
