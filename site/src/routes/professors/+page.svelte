<!--
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).
Copyright (C) 2026 Andrew Cupps

Professor directory.

Search is server-side. The planner used to page every active instructor into a
client-side record on each page load -- several hundred KB before this even
starts -- which does not survive a directory over the full historical
instructor set.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { searchInstructors } from '../../lib/api/JupiterpApi';
  import type { InstructorFull } from '../../lib/api/types';
  import { resolve } from '$app/paths';
  import SolarSystemLoader from '../../components/course-planner/course-search/SolarSystemLoader.svelte';
  import { TERM_NAME } from '../../lib/term';

  const PAGE_SIZE = 50;
  const DEBOUNCE_MS = 250;
  const LOADING_DELAY_MS = 200;

  let query = $state('');
  let activeOnly = $state(true);
  let results = $state<InstructorFull[]>([]);
  let total = $state<number | null>(null);
  let offset = $state(0);
  let status = $state<'loading' | 'loaded' | 'error'>('loading');

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  // Guards against a slow earlier request landing after a faster later one and
  // overwriting the results the user is actually looking at.
  let requestId = 0;

  let showLoading = $state(true);
  $effect(() => {
    if (status !== 'loading') {
      showLoading = false;
      return;
    }
    const timer = setTimeout(() => (showLoading = true), LOADING_DELAY_MS);
    return () => clearTimeout(timer);
  });

  async function run(append: boolean) {
    const id = ++requestId;
    status = 'loading';
    try {
      const page = await searchInstructors({
        nameSearch: query.trim() === '' ? undefined : query,
        activeOnly,
        sortBy: 'name.asc',
        limit: PAGE_SIZE,
        offset: append ? offset : 0,
        count: true,
      });
      if (id !== requestId) {
        return;
      }
      results = append ? [...results, ...page.data] : page.data;
      total = page.total;
      offset = append ? offset + page.data.length : page.data.length;
      status = 'loaded';
    } catch (error) {
      if (id !== requestId) {
        return;
      }
      console.error('Instructor search failed:', error);
      status = 'error';
    }
  }

  function onInput() {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => void run(false), DEBOUNCE_MS);
  }

  onMount(() => void run(false));

  function ratingOf(instructor: InstructorFull): number | null {
    if (instructor.combined_rating !== null && instructor.combined_rating !== undefined) {
      return instructor.combined_rating;
    }
    if (instructor.average_rating == null || !Number.isFinite(instructor.average_rating)) {
      return null;
    }
    return instructor.average_rating;
  }

  // Shortcut "/" for searching
  onMount(() => {
    const input = document.querySelector<HTMLInputElement>('input[type="search"]');
    if (!input) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === '/' && event.target === document.body) {
        event.preventDefault();
        input.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  let hasMore = $derived(total !== null && offset < total);
</script>

<svelte:head>
  <title>Professors at UMD | Jupiterp</title>
  <meta
    name="description"
    content="Search University of Maryland professors by name and see their grade distributions and ratings."
  />
</svelte:head>

<div class="custom-scrollbar fixed inset-x-0 bottom-0 top-12 flex flex-col overflow-y-auto">
  <div class="bg-bg-primary relative z-10 shrink-0">
    <div class="mx-auto flex w-full max-w-3xl flex-col gap-4 border-b-2 p-4 pb-2">
      <div>
        <h1 class="text-2xl font-bold">Professors</h1>
        <p class="text-text-secondary text-sm">See grade distributions and ratings for UMD professors.</p>
      </div>
      <div class="flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <div class="relative flex-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 512 512"
            aria-hidden="true"
            class="fill-text-secondary pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2"
          >
            <!--!Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path
              d="M416 208c0 45.9-14.9 88.3-40 122.7L502.6 457.4c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L330.7 376c-34.4 25.2-76.8 40-122.7 40C93.1 416 0 322.9 0 208S93.1 0 208 0S416 93.1 416 208zM208 352a144 144 0 1 0 0-288 144 144 0 1 0 0 288z"
            /></svg
          >
          <input
            type="search"
            bind:value={query}
            oninput={onInput}
            placeholder="Search professors by name, e.g. Mohe"
            aria-label="Search professors by name"
            autocomplete="off"
            class="border-outline bg-bg-primary text-text-primary focus:border-orange w-full rounded-lg border-2 py-2 pl-11 pr-4 text-base outline-none"
          />
        </div>
        <label
          class="hover:bg-hover flex shrink-0 cursor-pointer items-center gap-3 self-start whitespace-nowrap rounded-lg border-2 px-4 py-2 text-sm font-medium max-sm:w-full sm:self-auto"
        >
          <span
            class="border-outline has-checked:border-orange has-checked:bg-orange has-focus-visible:ring-orange has-focus-visible:ring-2 has-focus-visible:ring-offset-2 relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2 transition-colors"
          >
            <input type="checkbox" bind:checked={activeOnly} onchange={() => void run(false)} class="peer sr-only" />
            <span
              class="bg-text-secondary peer-checked:bg-bg-primary absolute left-0.5 h-3 w-3 rounded-full transition-transform peer-checked:translate-x-4"
            ></span>
          </span>
          Only <span class="-mx-2 sm:hidden">show professors </span> for {TERM_NAME}
        </label>
      </div>
    </div>
  </div>

  <main class="flex-1">
    <div class="mx-auto w-full max-w-3xl px-4 py-4">
      <!-- Announced politely so a screen reader hears the result count change
         without the list stealing focus on every keystroke. -->
      <p class="text-text-secondary text-sm" aria-live="polite">
        {#if showLoading}
          Searching&hellip;
        {:else if status === 'error'}
          Search failed. Try again in a moment.
        {:else if total !== null}
          {total.toLocaleString()}
          {total === 1 ? 'professor' : 'professors'}
        {:else if status === 'loaded'}
          {results.length} shown
        {/if}
      </p>

      {#if results.length > 0}
        <ul class="flex flex-col gap-1 pt-3">
          {#each results as instructor (instructor.slug)}
            <li>
              <a
                href={resolve('/professor/[slug]', { slug: instructor.slug })}
                class="border-outline hover:bg-hover flex flex-row items-baseline justify-between gap-2 rounded-lg border px-3 py-2"
              >
                <span class="font-bold">{instructor.name}</span>
                <span class="text-text-secondary text-sm">
                  {#if ratingOf(instructor) !== null}
                    <span class="text-text-primary">{ratingOf(instructor)?.toFixed(1)}</span>
                    <span class="text-orange">★</span>
                  {:else}
                    No rating yet
                  {/if}
                </span>
              </a>
            </li>
          {/each}
        </ul>

        {#if hasMore}
          <button
            class="border-orange text-orange hover:bg-orange hover:text-bg-primary mt-3 w-full rounded-lg border px-3 py-2 font-bold"
            onclick={() => void run(true)}
            disabled={status === 'loading'}
          >
            Show more
          </button>
        {/if}
      {:else if showLoading}
        <div class="flex items-center justify-center py-8">
          <SolarSystemLoader size={120} label="Loading professors" />
        </div>
      {:else if status === 'loaded'}
        <p class="text-text-secondary pt-3 text-sm">
          No professors matched. Names are matched without accents or punctuation, so "obrien" finds "O'Brien".
        </p>
      {/if}
    </div>
  </main>
</div>
