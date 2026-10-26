<!--
This file is part of Jupiterp. For terms of use, please see LICENSE at
https://github.com/atcupps/Jupiterp/LICENSE.
-->
<script lang="ts">
  import { tick } from 'svelte';
  import { resolve } from '$app/paths';
  import { client } from '../../lib/client';
  import { courseInstructorGradeSummary, instructorBySlug } from '../../lib/api/JupiterpApi';
  import { comparisonProfessors, type ComparisonProfessor } from '../../lib/professor/Comparison';
  import { ratingBreakdown } from '../../lib/professor/ProfessorData';
  import { hasEnoughForGpa } from '../../lib/course-planner/Grades';

  let {
    slug,
    name,
    courses,
    preferredCourse = null,
  }: {
    slug: string;
    name: string;
    courses: string[];
    preferredCourse?: string | null;
  } = $props();
  let open = $state(false);
  let root: HTMLDivElement;
  let trigger: HTMLButtonElement;
  let searchInput = $state<HTMLInputElement>();
  let course = $state('');
  let search = $state('');
  let selected = $state('');
  let professors = $state<ComparisonProfessor[]>([]);
  let ratings = $state<Record<string, number | null>>({});
  let status = $state<'loading' | 'loaded' | 'error'>('loading');
  let retry = $state(0);
  let visible = $derived(
    professors
      .filter(
        (professor) => professor.slug !== slug && professor.name.toLowerCase().includes(search.trim().toLowerCase())
      )
      .slice(0, 8)
  );
  let query = $derived(new URLSearchParams({ course, left: slug, right: selected }).toString());

  async function show() {
    course = preferredCourse && courses.includes(preferredCourse) ? preferredCourse : (courses[0] ?? '');
    search = '';
    selected = '';
    open = true;
    await tick();
    searchInput?.focus();
  }

  async function close() {
    open = false;
    await tick();
    trigger?.focus();
  }

  $effect(() => {
    if (!open || !course) return;
    const code = course;
    void retry;
    let cancelled = false;
    selected = '';
    professors = [];
    status = 'loading';
    Promise.allSettled([
      courseInstructorGradeSummary({ courseCodes: code }),
      client.coursesWithSections({ courseCodes: new Set([code]) }),
    ]).then(([history, current]) => {
      if (cancelled) return;
      if (history.status === 'rejected') {
        status = 'error';
        return;
      }
      const response = current.status === 'fulfilled' ? current.value : null;
      const sections = response?.ok()
        ? (response.data?.find((entry) => entry.courseCode === code)?.sections ?? [])
        : [];
      professors = comparisonProfessors(history.value.data, sections);
      status = 'loaded';
    });
    return () => {
      cancelled = true;
    };
  });

  $effect(() => {
    const options = visible;
    let cancelled = false;
    ratings = {};
    if (!open || options.length === 0) return;
    Promise.all(
      options.map(async (professor) => {
        const instructor = await instructorBySlug(professor.slug).catch(() => null);
        return [professor.slug, instructor ? ratingBreakdown(instructor).combined : null] as const;
      })
    ).then((entries) => {
      if (!cancelled) ratings = Object.fromEntries(entries);
    });
    return () => {
      cancelled = true;
    };
  });
</script>

<svelte:window
  onpointerdown={(event) => {
    if (open && root && !root.contains(event.target as Node)) open = false;
  }}
  onkeydown={(event) => {
    if (open && event.key === 'Escape') {
      event.preventDefault();
      void close();
    }
  }}
/>

<div bind:this={root} class="relative">
  <button
    bind:this={trigger}
    type="button"
    aria-haspopup="dialog"
    aria-expanded={open}
    aria-controls={open ? 'compare-with-dialog' : undefined}
    disabled={courses.length === 0}
    onclick={() => (open ? close() : show())}
    class="border-orange text-orange hover:bg-orange/10 inline-flex h-8 items-center gap-2 whitespace-nowrap rounded-lg border px-3 text-sm font-semibold disabled:opacity-50"
  >
    <span aria-hidden="true">⇆</span> Compare with…
  </button>
  {#if open}
    <div
      id="compare-with-dialog"
      role="dialog"
      aria-label={`Compare ${name}`}
      tabindex="-1"
      class="compare-with-panel border-outline bg-bg-primary w-88 absolute right-0 top-full z-[55] mt-2 max-w-[calc(100vw-2rem)] rounded-xl border p-4 shadow-xl"
    >
      <div class="mb-3 flex items-start justify-between gap-3">
        <h2 class="font-bold">Compare {name}</h2>
        <button type="button" aria-label="Close comparison picker" onclick={close} class="text-text-secondary px-1"
          >×</button
        >
      </div>
      <label for="compare-with-course" class="mb-1 block text-xs font-semibold">In course</label>
      <select
        id="compare-with-course"
        bind:value={course}
        class="border-outline bg-bg-primary mb-3 w-full rounded-lg border-2 px-3 py-2 text-sm"
      >
        {#each courses as code (code)}<option value={code}>{code}</option>{/each}
      </select>
      <label for="compare-with-search" class="mb-1 block text-xs font-semibold">With professor</label>
      <input
        bind:this={searchInput}
        id="compare-with-search"
        type="search"
        bind:value={search}
        placeholder={`Search ${course} professors`}
        class="border-outline bg-bg-primary focus:border-orange w-full rounded-lg border-2 px-3 py-2 text-base outline-none"
      />
      <div class="custom-scrollbar mt-3 max-h-48 space-y-1 overflow-y-auto" aria-live="polite">
        {#if status === 'loading'}<p class="text-text-secondary py-3 text-sm">Loading professors…</p>
        {:else if status === 'error'}
          <p class="text-text-secondary text-sm">Could not load professors.</p>
          <button type="button" class="text-orange text-sm underline" onclick={() => retry++}>Try again</button>
        {:else if visible.length === 0}<p class="text-text-secondary py-3 text-sm">
            No other matching professors for {course}.
          </p>
        {:else}
          <p class="text-text-secondary mb-1 text-xs">Also teach {course}</p>
          {#each visible as professor (professor.slug)}
            <button
              type="button"
              aria-pressed={selected === professor.slug}
              onclick={() => (selected = professor.slug)}
              class="border-outline hover:bg-hover flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm"
              class:border-orange={selected === professor.slug}
              class:bg-hover={selected === professor.slug}
            >
              <span class="min-w-0 font-semibold">{professor.name}</span>
              <span class="text-text-secondary shrink-0 text-xs">
                {#if professor.distribution && hasEnoughForGpa(professor.distribution) && professor.distribution.gpa !== null}{professor.distribution.gpa.toFixed(
                    2
                  )} GPA{:else}No GPA{/if}
                {#if ratings[professor.slug] != null}
                  · {ratings[professor.slug]!.toFixed(1)} ★{/if}
              </span>
            </button>
          {/each}
        {/if}
      </div>
      {#if selected}
        <a
          href="{resolve('/professors/compare')}?{query}"
          class="bg-orange mt-4 block rounded-lg px-4 py-2 text-center text-sm font-bold text-black"
          >Compare 2 professors →</a
        >
      {:else}
        <button
          type="button"
          disabled
          class="bg-orange mt-4 w-full rounded-lg px-4 py-2 text-sm font-bold text-black opacity-50"
          >Compare 2 professors →</button
        >
      {/if}
    </div>
  {/if}
</div>

<style>
  .compare-with-panel {
    max-height: min(34rem, calc(100svh - 8rem));
    overflow-y: auto;
  }
</style>
