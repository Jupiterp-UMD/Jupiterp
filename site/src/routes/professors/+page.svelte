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
  import { searchInstructors } from '../../lib/api/JupiterpApi';
  import type { InstructorFull } from '../../lib/api/types';
  import { resolve } from '$app/paths';

  const PAGE_SIZE = 50;
  const DEBOUNCE_MS = 250;

  let query = $state('');
  let activeOnly = $state(true);
  let results = $state<InstructorFull[]>([]);
  let total = $state<number | null>(null);
  let offset = $state(0);
  let status = $state<'idle' | 'loading' | 'loaded' | 'error'>('idle');

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  // Guards against a slow earlier request landing after a faster later one and
  // overwriting the results the user is actually looking at.
  let requestId = 0;

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

  function ratingOf(instructor: InstructorFull): number | null {
    if (instructor.combined_rating !== null && instructor.combined_rating !== undefined) {
      return instructor.combined_rating;
    }
    if (instructor.average_rating == null || !Number.isFinite(instructor.average_rating)) {
      return null;
    }
    return instructor.average_rating;
  }

  let hasMore = $derived(total !== null && offset < total);
</script>

<svelte:head>
  <title>Professors at UMD | Jupiterp</title>
  <meta
    name="description"
    content="Search University of Maryland professors by name and see their grade distributions and ratings."
  />
</svelte:head>

<!--
  `fixed top-12 bottom-0` with its own scroll container, matching the other
  document pages -- see the note on the professor route. Without it the search
  heading runs through the fixed header's rule and long result lists are
  clipped at the fold with no way to scroll.
-->
<main class="custom-scrollbar fixed inset-x-0 bottom-0 top-12 overflow-y-auto">
  <div class="mx-auto w-full max-w-3xl px-4 py-6">
  <h1 class="text-2xl font-bold">Professors</h1>
  <p class="text-text-secondary pt-1 text-sm">Search by name to see grade distributions and ratings.</p>

  <div class="flex flex-col gap-2 py-4">
    <label class="flex flex-col gap-1">
      <span class="text-sm font-bold">Search</span>
      <input
        type="search"
        bind:value={query}
        oninput={onInput}
        placeholder="e.g. Walsh"
        autocomplete="off"
        class="border-outline bg-bg-primary text-text-primary rounded-md border-2 px-2 py-1"
      />
    </label>

    <label class="flex flex-row items-center gap-2 text-sm">
      <input type="checkbox" bind:checked={activeOnly} onchange={() => void run(false)} class="accent-orange" />
      Only professors teaching this term
    </label>
  </div>

  <!-- Announced politely so a screen reader hears the result count change
       without the list stealing focus on every keystroke. -->
  <p class="text-text-secondary text-sm" aria-live="polite">
    {#if status === 'loading'}
      Searching&hellip;
    {:else if status === 'error'}
      Search failed. Try again in a moment.
    {:else if status === 'loaded'}
      {#if total !== null}
        {total.toLocaleString()}
        {total === 1 ? 'professor' : 'professors'}
      {:else}
        {results.length} shown
      {/if}
    {:else}
      Start typing to search.
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
                {ratingOf(instructor)?.toFixed(1)} ★
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
  {:else if status === 'loaded'}
    <p class="text-text-secondary pt-3 text-sm">
      No professors matched. Names are matched without accents or punctuation, so "obrien" finds "O'Brien".
    </p>
  {/if}
  </div>
</main>
