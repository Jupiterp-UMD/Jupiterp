<!--
This file is part of Jupiterp. For terms of use, please see LICENSE at
https://github.com/atcupps/Jupiterp/LICENSE.
-->
<script lang="ts">
  import { searchInstructors, instructorCourseGradeSummary, currentCourseCodesFor } from '../../lib/api/JupiterpApi';
  import type { InstructorFull } from '../../lib/api/types';
  import { sharedComparisonCourses } from '../../lib/professor/Comparison';
  import { page } from '$app/state';
  import { resolve } from '$app/paths';
  import { ComparisonStore, addToComparison, removeFromComparison } from '../../stores/ComparisonStore';

  let courses = $derived(sharedComparisonCourses($ComparisonStore));
  let chosenCourse = $state('');
  let course = $derived(
    courses.includes(chosenCourse)
      ? chosenCourse
      : (courses.find((code) => $ComparisonStore.some((professor) => professor.course === code)) ?? courses[0] ?? '')
  );
  let query = $derived(
    new URLSearchParams({
      left: $ComparisonStore[0]?.slug ?? '',
      right: $ComparisonStore[1]?.slug ?? '',
      course,
    }).toString()
  );
  let search = $state('');
  let results = $state<InstructorFull[]>([]);
  let searching = $state(false);
  let adding = $state(false);
  let message = $state('');

  $effect(() => {
    void $ComparisonStore[0]?.slug;
    search = '';
    message = '';
  });

  $effect(() => {
    const name = search.trim();
    const first = $ComparisonStore[0]?.slug;
    const canSearch = $ComparisonStore.length === 1;
    let cancelled = false;
    results = [];
    searching = canSearch && name.length >= 2;
    if (!canSearch || name.length < 2) return;
    const timer = setTimeout(async () => {
      try {
        const response = await searchInstructors({
          nameSearch: name,
          activeOnly: false,
          limit: 10,
          sortBy: 'name.asc',
        });
        if (!cancelled) results = response.data.filter((professor) => professor.slug !== first);
      } catch {
        if (!cancelled) message = 'Could not search professors. Try again.';
      } finally {
        if (!cancelled) searching = false;
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  });

  async function chooseProfessor(professor: InstructorFull) {
    if (adding) return;
    const first = $ComparisonStore[0]?.slug;
    adding = true;
    message = '';
    try {
      const [history, current] = await Promise.all([
        instructorCourseGradeSummary(professor.slug),
        currentCourseCodesFor(professor.slug).catch(() => [] as string[]),
      ]);
      if ($ComparisonStore.length !== 1 || $ComparisonStore[0].slug !== first) return;
      const available = [...new Set([...history.data.map((row) => row.course_code), ...current])];
      if (!available.some((code) => $ComparisonStore[0].courses.includes(code))) {
        message = `${professor.name} has no shared course available with ${$ComparisonStore[0].name}. Try another professor.`;
        return;
      }
      addToComparison({ slug: professor.slug, name: professor.name, courses: available });
      search = '';
    } catch {
      message = 'Could not load this professor. Try again.';
    } finally {
      adding = false;
    }
  }
</script>

{#if $ComparisonStore.length > 0 && page.url.pathname !== resolve('/professors/compare')}
  <aside
    aria-label="Professor comparison tray"
    class="comparison-tray border-outline bg-bg-primary fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-3xl rounded-xl border-2 p-3 shadow-xl sm:p-4"
  >
    <div class="mb-2 flex items-center justify-between gap-3">
      <p class="font-semibold" aria-live="polite">Compare professors · {$ComparisonStore.length}/2</p>
      <button type="button" class="text-text-secondary text-sm hover:underline" onclick={() => ComparisonStore.set([])}
        >Clear</button
      >
    </div>
    <div class="flex flex-wrap items-center gap-2">
      {#each $ComparisonStore as professor (professor.slug)}
        <span class="border-outline flex min-w-0 items-center gap-2 rounded-lg border px-3 py-1.5 text-sm">
          <span class="truncate">{professor.name}</span>
          <button
            type="button"
            class="text-text-secondary shrink-0 px-1"
            aria-label={`Remove ${professor.name} from comparison`}
            onclick={() => removeFromComparison(professor.slug)}>×</button
          >
        </span>
      {/each}
      {#if $ComparisonStore.length === 2 && course}
        <label class="sr-only" for="tray-course">Comparison course</label>
        <select
          id="tray-course"
          class="border-outline bg-bg-primary min-w-0 rounded-lg border px-2 py-1.5 text-sm"
          value={course}
          onchange={(event) => (chosenCourse = event.currentTarget.value)}
        >
          {#each courses as code (code)}<option value={code}>{code}</option>{/each}
        </select>
        <a
          href="{resolve('/professors/compare')}?{query}"
          class="bg-orange rounded-lg px-4 py-2 text-sm font-bold text-black">Compare →</a
        >
      {/if}
    </div>
    {#if $ComparisonStore.length === 1}
      <div class="mt-3">
        <label for="tray-professor-search" class="sr-only">Search for a professor to compare</label>
        <input
          id="tray-professor-search"
          type="search"
          bind:value={search}
          disabled={adding}
          placeholder="Search professor (Ex: naren)"
          class="border-outline bg-bg-primary focus:border-orange w-full rounded-lg border-2 px-3 py-2 text-base outline-none"
          aria-describedby="tray-search-status"
          oninput={() => (message = '')}
          onkeydown={(event) => {
            if (event.key === 'Escape') search = '';
          }}
        />
        <div id="tray-search-status" class="text-text-secondary mt-1 text-sm" aria-live="polite">
          {#if adding}Loading professor…
          {:else if message}{message}
          {:else if searching}Searching…
          {:else if search.trim().length >= 2 && results.length === 0}No matching professors.
          {/if}
        </div>
        {#if results.length > 0}
          <ul
            aria-label="Professor search results"
            class="custom-scrollbar border-outline mt-2 max-h-40 overflow-y-auto rounded-lg border"
          >
            {#each results as professor (professor.slug)}
              <li>
                <button
                  type="button"
                  disabled={adding}
                  class="hover:bg-hover flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm disabled:opacity-50"
                  onclick={() => chooseProfessor(professor)}
                >
                  <span>{professor.name}</span><span class="text-orange" aria-hidden="true">+</span>
                </button>
              </li>
            {/each}
          </ul>
        {/if}
      </div>
    {:else if !course}
      <p class="text-text-secondary mt-2 text-sm">
        These professors have no shared course available. Remove one to choose another.
      </p>
    {/if}
  </aside>
{/if}

<style>
  :global(body:has(.comparison-tray) main) {
    padding-bottom: 14rem;
  }
</style>
