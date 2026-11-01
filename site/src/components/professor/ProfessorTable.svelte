<!--
This file is part of Jupiterp. For terms of use, please see LICENSE at
https://github.com/atcupps/Jupiterp/LICENSE.

Every professor of a course in one sortable table. The side-by-side view stops
at four; this is how a student finds which four are worth that closer look.
-->
<script lang="ts">
  import {
    GRADE_BUCKETS,
    hasEnoughForGpa,
    type GradeBucket,
    type GradeDistribution,
  } from '../../lib/course-planner/Grades';
  import {
    MAX_COMPARED,
    loadRatings,
    type ComparisonProfessor,
    type ProfessorRating,
  } from '../../lib/professor/Comparison';

  interface Props {
    professors: ComparisonProfessor[];
    course: string;
    overall: GradeDistribution | null;
    showStatus: boolean;
    onCompare: (slugs: string[]) => void;
  }
  let { professors, course, overall, showStatus, onCompare }: Props = $props();

  type SortKey = 'default' | 'name' | 'gpa' | 'rating' | 'a' | 'graded';
  let query = $state('');
  let sortKey = $state<SortKey>('default');
  let descending = $state(true);
  let checked = $state<string[]>([]);
  let ratings = $state<Map<string, ProfessorRating | null>>(new Map());
  let ratingStatus = $state<'loading' | 'loaded' | 'error'>('loading');

  const BUCKET_COLORS: Record<GradeBucket, string> = {
    A: 'var(--grade-strong)',
    B: 'var(--grade-mid)',
    C: 'var(--grade-soft)',
    D: '#94a3b8',
    F: '#334155',
    W: '#d1d5db',
  };

  $effect(() => {
    const slugs = professors.map((professor) => professor.slug);
    let cancelled = false;
    ratingStatus = 'loading';
    loadRatings(slugs)
      .then((result) => {
        if (cancelled) return;
        ratings = result;
        ratingStatus = 'loaded';
      })
      .catch(() => {
        if (!cancelled) ratingStatus = 'error';
      });
    return () => {
      cancelled = true;
    };
  });

  $effect(() => {
    const listed = new Set(professors.map((professor) => professor.slug));
    const kept = checked.filter((slug) => listed.has(slug));
    if (kept.length !== checked.length) checked = kept;
  });

  function gpaOf(distribution: GradeDistribution | null): number | null {
    return distribution && hasEnoughForGpa(distribution) ? distribution.gpa : null;
  }

  function percentA(distribution: GradeDistribution | null): number | null {
    return distribution && distribution.barTotal > 0 ? (distribution.buckets.A / distribution.barTotal) * 100 : null;
  }

  function value(professor: ComparisonProfessor, key: SortKey): number | string | null {
    switch (key) {
      case 'name':
        return professor.name;
      case 'gpa':
        return gpaOf(professor.distribution);
      case 'rating':
        return ratings.get(professor.slug)?.rating ?? null;
      case 'a':
        return percentA(professor.distribution);
      case 'graded':
        return professor.distribution?.graded ?? null;
      default:
        return null;
    }
  }

  let rows = $derived.by(() => {
    const q = query.trim().toLowerCase();
    const filtered = professors.filter((professor) => professor.name.toLowerCase().includes(q));
    return filtered.sort((a, b) => {
      if (sortKey === 'default') {
        const current = Number(b.current) - Number(a.current);
        if (current) return current;
        return (gpaOf(b.distribution) ?? -1) - (gpaOf(a.distribution) ?? -1) || a.name.localeCompare(b.name);
      }
      const x = value(a, sortKey);
      const y = value(b, sortKey);
      if (x === null || y === null) return x === y ? a.name.localeCompare(b.name) : x === null ? 1 : -1;
      const order = typeof x === 'string' ? x.localeCompare(y as string) : x - (y as number);
      return (descending ? -order : order) || a.name.localeCompare(b.name);
    });
  });

  function sortBy(key: SortKey) {
    if (sortKey === key) {
      descending = !descending;
    } else {
      sortKey = key;
      descending = key !== 'name';
    }
  }

  function ariaSort(key: SortKey): 'ascending' | 'descending' | 'none' {
    return sortKey === key ? (descending ? 'descending' : 'ascending') : 'none';
  }

  function toggle(slug: string) {
    checked = checked.includes(slug) ? checked.filter((entry) => entry !== slug) : [...checked, slug];
  }

  function bucketSummary(distribution: GradeDistribution): string {
    return GRADE_BUCKETS.map(
      (bucket) => `${bucket} ${((distribution.buckets[bucket] / distribution.barTotal) * 100).toFixed(1)}%`
    ).join(', ');
  }

  const columns: { key: SortKey; label: string; numeric: boolean }[] = [
    { key: 'name', label: 'Professor', numeric: false },
    { key: 'gpa', label: 'Avg GPA', numeric: true },
    { key: 'rating', label: 'Rating', numeric: true },
    { key: 'a', label: '% A', numeric: true },
    { key: 'graded', label: 'Students', numeric: true },
  ];
</script>

<section aria-label={`All ${course} professors`} class="space-y-4">
  <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <input
      bind:value={query}
      type="search"
      placeholder="Filter by name"
      aria-label="Filter professors by name"
      class="border-outline bg-bg-primary focus:border-orange w-full rounded-lg border-2 px-4 py-2 outline-none sm:max-w-xs"
    />
    <div class="flex items-center gap-3">
      <span class="text-sm font-semibold">
        {checked.length === 0 ? `Tick 2–${MAX_COMPARED} professors to compare` : `${checked.length} selected`}
      </span>
      <button
        type="button"
        class="bg-orange rounded-lg px-4 py-2 font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50"
        disabled={checked.length < 2}
        onclick={() => onCompare(checked)}>Compare selected</button
      >
    </div>
  </div>

  <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm" aria-hidden="true">
    <span class="font-semibold">Grades:</span>
    {#each GRADE_BUCKETS as bucket (bucket)}
      <span class="flex items-center gap-1.5"
        ><span class="h-3 w-3 rounded-sm" style:background={BUCKET_COLORS[bucket]}></span>{bucket}</span
      >
    {/each}
  </div>

  <div class="border-outline custom-scrollbar overflow-x-auto rounded-xl border">
    <table class="w-full min-w-[44rem] text-left">
      <thead class="border-outline border-b">
        <tr>
          <th class="w-10 px-3 py-3"><span class="sr-only">Select</span></th>
          {#each columns as column (column.key)}
            <th aria-sort={ariaSort(column.key)} class="px-3 py-3" class:text-right={column.numeric}>
              <button
                type="button"
                class="hover:text-orange font-semibold"
                class:text-orange={sortKey === column.key}
                onclick={() => sortBy(column.key)}
              >
                {column.label}{#if sortKey === column.key}<span aria-hidden="true">{descending ? ' ↓' : ' ↑'}</span
                  >{/if}
              </button>
            </th>
          {/each}
          <th class="w-48 px-3 py-3 font-semibold">Grades</th>
        </tr>
      </thead>
      <tbody>
        {#if overall && overall.barTotal > 0}
          <tr class="bg-bg-secondary border-outline border-b">
            <td class="px-3 py-3"></td>
            <td class="px-3 py-3 font-semibold">Course average</td>
            <td class="px-3 py-3 text-right font-semibold tabular-nums">
              {gpaOf(overall)?.toFixed(2) ?? '—'}
            </td>
            <td class="px-3 py-3 text-right">—</td>
            <td class="px-3 py-3 text-right tabular-nums">{percentA(overall)!.toFixed(1)}%</td>
            <td class="px-3 py-3 text-right tabular-nums">{overall.graded.toLocaleString()}</td>
            <td class="px-3 py-3">
              {@render gradeBar(overall)}
            </td>
          </tr>
        {/if}
        {#each rows as professor (professor.slug)}
          {@const gpa = gpaOf(professor.distribution)}
          {@const rating = ratings.get(professor.slug)}
          {@const a = percentA(professor.distribution)}
          {@const isChecked = checked.includes(professor.slug)}
          <tr class="border-outline hover:bg-hover border-b last:border-b-0" class:bg-hover={isChecked}>
            <td class="px-3 py-3">
              <input
                type="checkbox"
                class="accent-orange h-4 w-4 cursor-pointer disabled:cursor-not-allowed"
                checked={isChecked}
                disabled={!isChecked && checked.length >= MAX_COMPARED}
                aria-label={`Select ${professor.name}`}
                onchange={() => toggle(professor.slug)}
              />
            </td>
            <td class="px-3 py-3">
              <span class="block font-semibold" class:text-text-secondary={!professor.current}>{professor.name}</span>
              {#if showStatus}
                <span
                  class="block text-sm"
                  class:text-success={professor.current}
                  class:font-semibold={professor.current}
                  class:text-text-secondary={!professor.current}
                  >{professor.current ? 'Teaching now' : 'Previously taught'}</span
                >
              {/if}
            </td>
            <td class="px-3 py-3 text-right font-semibold tabular-nums">
              {#if gpa !== null}{gpa.toFixed(2)}{:else}<span title="Needs at least 20 graded students">—</span>{/if}
            </td>
            <td class="px-3 py-3 text-right tabular-nums">
              {#if ratingStatus === 'loading'}…{:else if rating?.rating != null}
                <span class="text-orange font-semibold">{rating.rating.toFixed(1)}</span>
                <span class="text-sm">({rating.reviews})</span>
              {:else}—{/if}
            </td>
            <td class="px-3 py-3 text-right tabular-nums">{a === null ? '—' : `${a.toFixed(1)}%`}</td>
            <td class="px-3 py-3 text-right tabular-nums">{professor.distribution?.graded.toLocaleString() ?? '—'}</td>
            <td class="px-3 py-3">
              {#if professor.distribution && professor.distribution.barTotal > 0}
                {@render gradeBar(professor.distribution)}
              {:else}
                <span class="text-sm">No grade history</span>
              {/if}
            </td>
          </tr>
        {:else}
          <tr><td colspan="7" class="px-3 py-6 text-center">No professors match “{query}”.</td></tr>
        {/each}
      </tbody>
    </table>
  </div>
  {#if ratingStatus === 'error'}<p class="text-warning text-sm">Ratings could not be loaded.</p>{/if}
</section>

{#snippet gradeBar(distribution: GradeDistribution)}
  <div
    class="flex h-3 w-full overflow-hidden rounded-sm"
    role="img"
    aria-label={bucketSummary(distribution)}
    title={bucketSummary(distribution)}
  >
    {#each GRADE_BUCKETS as bucket (bucket)}
      <div style:flex={distribution.buckets[bucket]} style:background={BUCKET_COLORS[bucket]}></div>
    {/each}
  </div>
{/snippet}
