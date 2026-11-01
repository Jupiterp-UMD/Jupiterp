<!--
This file is part of Jupiterp. For terms of use, please see LICENSE at
https://github.com/atcupps/Jupiterp/LICENSE.

Grouped, stacked grade bars on one percentage scale, one colour per comparison slot.
-->
<script lang="ts">
  import {
    BUCKET_LETTERS,
    GRADE_BUCKETS,
    formatSemesterRange,
    type GradeBucket,
    type GradeDistribution,
    type LetterGrade,
  } from '../../lib/course-planner/Grades';
  import { PROFESSOR_COLORS, type ComparisonProfessor } from '../../lib/professor/Comparison';

  function formatPercent(distribution: GradeDistribution, bucket: GradeBucket): string {
    const count = distribution.buckets[bucket];
    const percent = (count / distribution.barTotal) * 100;
    return count > 0 && percent < 0.05 ? '<0.1' : percent.toFixed(1);
  }

  let { professors }: { professors: (ComparisonProfessor | undefined)[] } = $props();
  let series = $derived(professors.flatMap((professor, slot) => (professor ? [{ professor, slot }] : [])));
  let compact = $derived(series.length > 2);
  let chart: HTMLDivElement | undefined = $state();
  let tip = $state<{
    name: string;
    letter: LetterGrade;
    count: number;
    percent: string;
    x: number;
    y: number;
    flip: boolean;
  } | null>(null);

  function showTip(professor: ComparisonProfessor, letter: LetterGrade, segment: HTMLElement) {
    const distribution = professor.distribution;
    if (!chart || !distribution || distribution.barTotal === 0) return;
    const box = chart.getBoundingClientRect();
    const bar = segment.getBoundingClientRect();
    const flip = bar.left + bar.width / 2 - box.left > box.width * 0.6;
    tip = {
      name: professor.name,
      letter,
      count: distribution.letters[letter],
      percent: ((distribution.letters[letter] / distribution.barTotal) * 100).toFixed(1),
      x: (flip ? bar.left : bar.right) - box.left + (flip ? -10 : 10),
      y: bar.top + bar.height / 2 - box.top,
      flip,
    };
  }

  $effect(() => {
    // A changed selection invalidates the segment the tooltip describes.
    void professors;
    tip = null;
  });
  let maxPercent = $derived(
    Math.max(
      1,
      ...series.flatMap(({ professor: { distribution } }) =>
        distribution && distribution.barTotal > 0
          ? GRADE_BUCKETS.map((bucket) => (distribution.buckets[bucket] / distribution.barTotal) * 100)
          : []
      )
    )
  );

  function color(letter: LetterGrade, slot: number): string {
    const palette = PROFESSOR_COLORS[slot];
    if (letter === 'W') return palette.withdrawn;
    const shade = letter.endsWith('-') ? 2 : letter.endsWith('+') || letter === 'F' ? 0 : 1;
    return palette.shades[shade];
  }
</script>

<section aria-label="Grade distribution comparison" class="border-outline rounded-xl border p-4 sm:p-6">
  <h2 class="text-xl font-bold">Grade distribution</h2>
  <div
    class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-8"
    class:lg:grid-cols-4={series.length === 4}
    class:lg:grid-cols-3={series.length === 3}
  >
    {#each series as { professor, slot } (slot)}
      <div>
        <p class="flex items-center gap-2 font-semibold">
          <span class="h-3 w-3 shrink-0 rounded-full" style:background={PROFESSOR_COLORS[slot].dot}
          ></span>{professor.name}
        </p>
        <p class="text-text-secondary mt-1 text-sm">
          {#if professor.distribution && professor.distribution.barTotal > 0}
            {formatSemesterRange(professor.distribution) ?? 'Available terms'} · {professor.distribution.sectionCount} sections
          {:else}No grade distribution available{/if}
        </p>
      </div>
    {/each}
  </div>

  <div class="mt-6 space-y-4 sm:hidden">
    {#each GRADE_BUCKETS as bucket (bucket)}
      <div class="flex items-center gap-3">
        <span class="text-text-secondary w-4 shrink-0 text-sm font-semibold">{bucket}</span>
        <div class="min-w-0 flex-1 space-y-1.5">
          {#each series as { professor, slot } (slot)}
            {@const distribution = professor.distribution}
            {@const available = distribution !== null && distribution.barTotal > 0}
            {@const percent = available ? (distribution.buckets[bucket] / distribution.barTotal) * 100 : 0}
            <div
              class="flex items-center gap-2"
              aria-label={`${professor.name}, ${bucket}: ${available ? `${formatPercent(distribution, bucket)}%` : 'unavailable'}`}
            >
              <div class="bg-outline/40 h-3 min-w-0 flex-1 overflow-hidden rounded-sm">
                <div
                  class="h-full rounded-sm"
                  style:width={`${percent}%`}
                  style:background={PROFESSOR_COLORS[slot].dot}
                ></div>
              </div>
              <span class="w-12 shrink-0 text-right text-xs font-semibold tabular-nums"
                >{available ? `${formatPercent(distribution, bucket)}%` : '—'}</span
              >
            </div>
          {/each}
        </div>
      </div>
    {/each}
  </div>
  <div class="hidden sm:block">
    <div bind:this={chart} class="relative mt-8 grid h-80 grid-cols-[repeat(5,minmax(0,1fr))_1rem_minmax(0,1fr)] gap-5">
      {#each GRADE_BUCKETS as bucket (bucket)}
        {#if bucket === 'W'}<div></div>{/if}
        <div class="flex h-full items-end" class:gap-2={!compact} class:gap-1={compact}>
          {#each series as { professor, slot } (slot)}
            {@const distribution = professor.distribution}
            {@const available = distribution !== null && distribution.barTotal > 0}
            {@const percent = available ? (distribution.buckets[bucket] / distribution.barTotal) * 100 : 0}
            <div class="relative min-w-0 flex-1" style:height={`${(percent / maxPercent) * 85}%`}>
              <span
                class={[
                  'absolute left-1/2 -translate-x-1/2 whitespace-nowrap font-semibold',
                  compact ? '-top-5 text-xs' : '-top-7 text-sm',
                ]}>{available ? `${formatPercent(distribution, bucket)}%` : '—'}</span
              >
              <div
                class="flex h-full flex-col overflow-hidden rounded-t-md"
                role="img"
                aria-label={`${professor.name}, ${bucket}: ${available ? `${formatPercent(distribution, bucket)}%` : 'unavailable'}`}
              >
                {#if available}
                  {#each BUCKET_LETTERS[bucket] as letter (letter)}
                    <div
                      class="min-h-0 transition-[filter] hover:brightness-110"
                      style:flex={distribution.letters[letter]}
                      style:background={color(letter, slot)}
                      role="presentation"
                      onmouseenter={(event) => showTip(professor, letter, event.currentTarget)}
                      onmouseleave={() => (tip = null)}
                    ></div>
                  {/each}
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/each}
      {#if tip}
        <div
          role="tooltip"
          class="bg-text-primary text-bg-primary pointer-events-none absolute z-30 flex flex-col whitespace-nowrap rounded-lg px-3 py-2 shadow-lg"
          style:left={`${tip.x}px`}
          style:top={`${tip.y}px`}
          style:transform={`translate(${tip.flip ? '-100%' : '0'}, -50%)`}
        >
          <span class="text-sm">{tip.name}</span>
          <span class="text-base font-bold">{tip.letter.replace('-', '−')} · {tip.percent}%</span>
          <span class="text-sm">{tip.count.toLocaleString()} students</span>
        </div>
      {/if}
    </div>
    <div
      class="border-outline text-text-secondary grid grid-cols-[repeat(5,minmax(0,1fr))_1rem_minmax(0,1fr)] gap-5 border-t pt-3 text-center text-sm"
    >
      {#each GRADE_BUCKETS as bucket (bucket)}
        {#if bucket === 'W'}<div></div>{/if}
        <span>{bucket}</span>
      {/each}
    </div>
  </div>
</section>
