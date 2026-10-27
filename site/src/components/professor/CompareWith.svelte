<!--
This file is part of Jupiterp. For terms of use, please see LICENSE at
https://github.com/atcupps/Jupiterp/LICENSE.
-->
<script lang="ts">
  import { tick } from 'svelte';
  import { resolve } from '$app/paths';
  import {
    loadComparisonProfessors,
    loadComparisonInstructor,
    type ComparisonProfessor,
  } from '../../lib/professor/Comparison';
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
  let root = $state<HTMLDivElement>();
  let trigger = $state<HTMLButtonElement>();
  let searchInput = $state<HTMLInputElement>();
  let course = $state('');
  let search = $state('');
  let selected = $state('');
  let opensAbove = $state(false);
  let panelHeight = $state(544);
  let professors = $state<ComparisonProfessor[]>([]);
  let selectedProfessor = $derived(professors.find((professor) => professor.slug === selected));
  let ratings = $state<Record<string, number | null>>({});
  let status = $state<'loading' | 'loaded' | 'error'>('loading');
  let retry = $state(0);
  let warning = $state('');
  let visible = $derived(
    professors
      .filter(
        (professor) => professor.slug !== slug && professor.name.toLowerCase().includes(search.trim().toLowerCase())
      )
      .slice(0, 8)
  );
  let query = $derived(new URLSearchParams({ course, left: slug, right: selected }).toString());

  function positionPanel() {
    if (!trigger) return;
    const viewport = window.visualViewport;
    const top = Math.max(48, viewport?.offsetTop ?? 0);
    const bottom = (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight);
    const rect = trigger.getBoundingClientRect();
    const below = bottom - rect.bottom - 12;
    const above = rect.top - top - 12;
    opensAbove = below < 300 && above > below;
    panelHeight = Math.max(0, Math.min(544, opensAbove ? above : below));
  }

  $effect(() => {
    if (!open) return;
    positionPanel();
    const viewport = window.visualViewport;
    window.addEventListener('resize', positionPanel);
    window.addEventListener('scroll', positionPanel, true);
    viewport?.addEventListener('resize', positionPanel);
    viewport?.addEventListener('scroll', positionPanel);
    return () => {
      window.removeEventListener('resize', positionPanel);
      window.removeEventListener('scroll', positionPanel, true);
      viewport?.removeEventListener('resize', positionPanel);
      viewport?.removeEventListener('scroll', positionPanel);
    };
  });

  async function show() {
    course = preferredCourse && courses.includes(preferredCourse) ? preferredCourse : (courses[0] ?? '');
    search = '';
    selected = '';
    positionPanel();
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
    warning = '';
    loadComparisonProfessors(code)
      .then((result) => {
        if (cancelled) return;
        professors = result.professors;
        warning = result.warning;
        status = 'loaded';
      })
      .catch(() => {
        if (!cancelled) status = 'error';
      });
    return () => {
      cancelled = true;
    };
  });

  $effect(() => {
    const options = visible;
    let cancelled = false;
    if (!open || options.length === 0) return;
    Promise.all(
      options.map(async (professor) => {
        const instructor = await loadComparisonInstructor(professor.slug).catch(() => null);
        return [professor.slug, instructor ? ratingBreakdown(instructor).combined : null] as const;
      })
    ).then((entries) => {
      if (!cancelled) ratings = { ...ratings, ...Object.fromEntries(entries) };
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

{#if courses.length > 0}
  <div bind:this={root} class="relative">
    <button
      bind:this={trigger}
      type="button"
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-controls={open ? 'compare-with-dialog' : undefined}
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
        style:max-height={`${panelHeight}px`}
        class="compare-with-panel border-outline bg-bg-primary w-88 absolute right-0 top-full z-[55] mt-2 flex max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border p-4 shadow-xl"
        class:above={opensAbove}
      >
        <div class="mb-3 flex shrink-0 items-start justify-between gap-3">
          <h2 class="min-w-0 truncate font-bold" title={`Compare ${name}`}>Compare {name}</h2>
          <button type="button" aria-label="Close comparison picker" onclick={close} class="text-text-secondary px-1"
            >×</button
          >
        </div>
        <div class="custom-scrollbar min-h-0 overflow-y-auto">
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
          {#if warning}<p class="text-warning mt-2 text-xs" role="status">{warning}</p>{/if}
          <div class="mt-3 space-y-1" aria-live="polite">
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
                    {#if professor.distribution && hasEnoughForGpa(professor.distribution)}{professor.distribution.gpa.toFixed(
                        2
                      )} GPA{:else}No GPA{/if}
                    {#if ratings[professor.slug] != null}
                      · {ratings[professor.slug]!.toFixed(1)} ★{/if}
                  </span>
                </button>
              {/each}
            {/if}
          </div>
        </div>
        <div class="mt-3 shrink-0">
          {#if selectedProfessor}
            <div
              class="border-outline mb-2 flex min-w-0 items-center justify-between gap-2 rounded-lg border px-2 py-1 text-xs"
              role="status"
            >
              <span class="min-w-0 truncate" title={selectedProfessor.name}>Selected: {selectedProfessor.name}</span>
              <button
                type="button"
                class="text-text-secondary shrink-0 px-1"
                aria-label={`Remove ${selectedProfessor.name} from comparison`}
                onclick={() => (selected = '')}>×</button
              >
            </div>
          {/if}
          {#if selected}
            <a
              href="{resolve('/professors/compare')}?{query}"
              class="bg-orange block rounded-lg px-4 py-2 text-center text-sm font-bold text-black"
              >Compare 2 professors →</a
            >
          {:else}
            <button
              type="button"
              disabled
              class="bg-orange w-full rounded-lg px-4 py-2 text-sm font-bold text-black opacity-50"
              >Compare 2 professors →</button
            >
          {/if}
        </div>
      </div>
    {/if}
  </div>
{/if}

<style>
  .compare-with-panel.above {
    top: auto;
    bottom: calc(100% + 0.5rem);
    margin-top: 0;
  }
</style>
