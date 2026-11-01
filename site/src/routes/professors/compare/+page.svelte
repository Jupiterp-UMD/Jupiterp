<!--
This file is part of Jupiterp. For terms of use, please see LICENSE at
https://github.com/atcupps/Jupiterp/LICENSE.

Compare up to four professors within a single course, or list all of them.
-->
<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import {
    loadComparisonProfessors,
    loadComparisonInstructor,
    loadCourseSuggestions,
    MAX_COMPARED,
    PROFESSOR_COLORS,
    type ComparisonProfessor,
  } from '$lib/professor/Comparison';
  import type { CourseMinified } from '@jupiterp/jupiterp';
  import { hasEnoughForGpa, calculateGpaWithoutActiveProf, type GradeDistribution } from '$lib/course-planner/Grades';
  import ComparisonDistribution from '../../../components/professor/ComparisonDistribution.svelte';
  import ReviewList from '../../../components/professor/ReviewList.svelte';
  import ComparisonRating from '../../../components/professor/ComparisonRating.svelte';
  import ProfessorPicker from '../../../components/professor/ProfessorPicker.svelte';
  import ProfessorTable from '../../../components/professor/ProfessorTable.svelte';

  type View = 'current' | 'pick' | 'all';

  let input = $state('');
  let course = $state('');
  let professors = $state<ComparisonProfessor[]>([]);
  let selectionSlugs = $state<string[]>(['', '']);
  let view = $state<View>('current');
  let allReviews = $state(false);
  let reviewTab = $state(0);
  let status = $state<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  let validation = $state('');
  let warning = $state('');
  let courseMean = $state<number | null>(null);
  let overall = $state<GradeDistribution | null>(null);
  let dataWarning = '';
  let requestId = 0;

  let suggestions = $state<CourseMinified[]>([]);
  let suggestionsOpen = $state(false);
  let activeSuggestion = $state(-1);
  let suggestionTimer: ReturnType<typeof setTimeout> | undefined;
  let suggestionRequest = 0;
  let showSuggestions = $derived(suggestionsOpen && suggestions.length > 0);

  let selected = $derived(selectionSlugs.map((slug) => professors.find((professor) => professor.slug === slug)));
  let compared = $derived(selected.flatMap((professor, slot) => (professor ? [{ professor, slot }] : [])));
  let ready = $derived(compared.length >= 2);
  let tabbedReviews = $derived(compared.length > 2);
  let activeReviewTab = $derived(Math.min(reviewTab, Math.max(0, compared.length - 1)));
  let currentCount = $derived(professors.filter((professor) => professor.current).length);
  let activeView = $derived<View>(view === 'current' && professors.length > 0 && currentCount === 0 ? 'pick' : view);
  let tableProfessors = $derived(
    activeView === 'current' ? professors.filter((professor) => professor.current) : professors
  );
  let viewOptions = $derived<{ id: View; label: string }[]>([
    { id: 'current', label: `All teaching now (${currentCount})` },
    { id: 'pick', label: 'Pick professors' },
    { id: 'all', label: `All professors (${professors.length})` },
  ]);
  let plottedProfessors = $derived(professors.filter((professor) => gpaOf(professor) !== null));
  let scaleMin = $derived(
    Math.min(2, ...plottedProfessors.map((professor) => Math.floor(gpaOf(professor)!)), Math.floor(courseMean ?? 2))
  );
  let gpaScaleLabel = $derived(
    [
      `GPA scale from ${scaleMin} to 4 with ${plottedProfessors.length} professors`,
      `Course mean: ${courseMean?.toFixed(2) ?? 'unavailable'}`,
      ...compared.map(({ professor }) => `${professor.name}: ${gpaOf(professor)?.toFixed(2) ?? 'unavailable'}`),
    ].join('. ') + '.'
  );

  onDestroy(() => {
    requestId++;
    clearTimeout(suggestionTimer);
  });

  function updateSuggestions() {
    clearTimeout(suggestionTimer);
    activeSuggestion = -1;
    const prefix = input.replace(/\s+/g, '').toUpperCase();
    const id = ++suggestionRequest;
    if (prefix.length < 2) {
      suggestions = [];
      return;
    }
    suggestionsOpen = true;
    suggestionTimer = setTimeout(async () => {
      try {
        const results = await loadCourseSuggestions(prefix);
        if (id === suggestionRequest) suggestions = results;
      } catch {
        if (id === suggestionRequest) suggestions = [];
      }
    }, 150);
  }

  function chooseSuggestion(code: string) {
    clearTimeout(suggestionTimer);
    suggestionRequest++;
    suggestionsOpen = false;
    input = code;
    validation = '';
    if (!syncUrl(code, [], null)) void loadCourse(code);
  }

  function onCourseKeydown(event: KeyboardEvent) {
    if (!showSuggestions) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      activeSuggestion = (activeSuggestion + 1) % suggestions.length;
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      activeSuggestion = activeSuggestion <= 0 ? suggestions.length - 1 : activeSuggestion - 1;
    } else if (event.key === 'Enter' && activeSuggestion >= 0) {
      event.preventDefault();
      chooseSuggestion(suggestions[activeSuggestion].courseCode);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      suggestionsOpen = false;
    }
  }

  $effect(() => {
    if (activeSuggestion < 0) return;
    document.getElementById(`course-suggestion-${activeSuggestion}`)?.scrollIntoView({ block: 'nearest' });
  });

  function syncUrl(code: string, slugs: string[] = [], nextView: View | null = 'pick') {
    const url = new URL(page.url);
    url.searchParams.set('course', code);

    url.searchParams.delete('left');
    url.searchParams.delete('right');
    if (slugs.some(Boolean)) url.searchParams.set('profs', slugs.join(','));
    else url.searchParams.delete('profs');
    if (nextView === null) url.searchParams.delete('view');
    else url.searchParams.set('view', nextView);
    if (url.href === page.url.href) return false;
    // eslint-disable-next-line svelte/no-navigation-without-resolve
    void goto(url, { keepFocus: true, noScroll: true });
    return true;
  }

  function submitCourse(event: SubmitEvent) {
    event.preventDefault();
    suggestionsOpen = false;
    const code = input.replace(/\s+/g, '').toUpperCase();
    if (!/^[A-Z]{4}\d{3}[A-Z]?$/.test(code)) {
      validation = 'Enter a course code, such as CMSC132.';
      return;
    }
    validation = '';
    if (!syncUrl(code, [], null)) void loadCourse(code);
  }

  function addSlot() {
    if (selectionSlugs.length >= MAX_COMPARED) return;
    selectionSlugs = [...selectionSlugs, ''];
    syncUrl(course, selectionSlugs);
  }

  function removeSlot(slot: number) {
    if (selectionSlugs.length <= 2) return;
    selectionSlugs = selectionSlugs.filter((_, index) => index !== slot);
    reviewTab = 0;
    syncUrl(course, selectionSlugs);
  }

  function setView(next: View) {
    view = next;
    syncUrl(course, selectionSlugs, next);
  }

  function compareFromTable(slugs: string[]) {
    selectionSlugs = slugs.length >= 2 ? slugs.slice(0, MAX_COMPARED) : [...slugs, ''];
    view = 'pick';
    reviewTab = 0;
    syncUrl(course, selectionSlugs);
  }

  async function restoreSelections(initialSlugs: string[], id: number) {
    const slugs = initialSlugs
      .slice(0, MAX_COMPARED)
      .map((slug, index, all) => (all.indexOf(slug) === index ? slug : ''));
    while (slugs.length < 2) slugs.push('');
    const notes: string[] = [];
    const missing = await Promise.all(
      slugs
        .filter((slug) => slug && !professors.some((professor) => professor.slug === slug))
        .map(async (slug) => {
          try {
            const instructor = await loadComparisonInstructor(slug);
            if (!instructor) {
              notes.push(`Linked professor “${slug}” could not be found.`);
              return null;
            }
            return { slug, name: instructor.name, current: false, distribution: null } satisfies ComparisonProfessor;
          } catch {
            notes.push(`Linked professor “${slug}” could not be loaded. Try again.`);
            return null;
          }
        })
    );
    if (id !== requestId) return;
    professors = [
      ...professors,
      ...missing.filter((professor): professor is NonNullable<typeof professor> => professor !== null),
    ];
    selectionSlugs = slugs.map((slug) => (professors.some((professor) => professor.slug === slug) ? slug : ''));
    const unavailable = selectionSlugs.flatMap((slug) => {
      const professor = professors.find((entry) => entry.slug === slug);
      return professor && professor.distribution === null && !professor.current
        ? [`${professor.name} has no linked grade history or current assignment for this course.`]
        : [];
    });
    warning = [dataWarning, ...notes, ...unavailable].filter(Boolean).join(' ');
  }

  async function loadCourse(rawCode: string, initialSlugs: string[] = []) {
    const code = rawCode.replace(/\s+/g, '').toUpperCase();
    const id = ++requestId;
    if (!/^[A-Z]{4}\d{3}[A-Z]?$/.test(code)) {
      validation = 'Enter a course code, such as CMSC132.';
      status = 'idle';
      return;
    }
    validation = '';
    course = code;
    input = code;
    professors = [];
    selectionSlugs = ['', ''];
    allReviews = false;
    reviewTab = 0;
    warning = '';
    overall = null;
    courseMean = null;
    status = 'loading';
    try {
      const result = await loadComparisonProfessors(code);
      if (id !== requestId) return;
      professors = result.professors;
      overall = result.overall;
      dataWarning = result.warning;
      if (overall && hasEnoughForGpa(overall)) courseMean = overall.gpa;
      await restoreSelections(initialSlugs, id);
      if (id === requestId) status = 'loaded';
    } catch {
      if (id === requestId) status = 'error';
    }
  }

  $effect(() => {
    const params = page.url.searchParams;
    const code = params.get('course') ?? '';
    const profs = params.get('profs');
    const slugs = profs !== null ? profs.split(',') : [params.get('left') ?? '', params.get('right') ?? ''];
    const viewParam = params.get('view');
    untrack(() => {
      view =
        viewParam === 'pick' || viewParam === 'current' || viewParam === 'all'
          ? viewParam
          : slugs.some(Boolean)
            ? 'pick'
            : 'current';
      if (!code) {
        requestId++;
        input = '';
        course = '';
        professors = [];
        selectionSlugs = ['', ''];
        status = 'idle';
        validation = '';
      } else if (code === course && status === 'loaded') {
        void restoreSelections(slugs, ++requestId);
      } else {
        void loadCourse(code, slugs);
      }
    });
  });

  function gpaOf(professor: ComparisonProfessor | undefined): number | null {
    const distribution = professor?.distribution;
    return distribution && hasEnoughForGpa(distribution) ? distribution.gpa : null;
  }

  function position(gpa: number): number {
    return Math.max(0, Math.min(100, ((gpa - scaleMin) / (4 - scaleMin)) * 100));
  }

  function deviation(professor: ComparisonProfessor | undefined): number | null {
    const gpa = gpaOf(professor);
    const otherMean = calculateGpaWithoutActiveProf(overall, professor?.distribution);
    return gpa === null || otherMean === null || otherMean === 0
      ? null
      : Math.round(((gpa - otherMean) / otherMean) * 100);
  }
</script>

<svelte:head>
  <title>Compare Professors | Jupiterp</title>
  <meta name="description" content="Compare UMD professors' grades and student reviews for the same course." />
</svelte:head>

<main class="comparison-page custom-scrollbar fixed inset-x-0 bottom-0 top-12 overflow-y-auto">
  <div class="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:space-y-8 sm:px-8 sm:py-8">
    <header class="space-y-2">
      <a href={resolve('/professors')} class="text-orange text-sm hover:underline">← All professors</a>
      <h1 class="text-3xl font-bold">Compare professors</h1>
    </header>

    <form onsubmit={submitCourse} class="border-outline rounded-xl border p-4 sm:p-6">
      <label for="comparison-course" class="mb-2 block font-semibold">Choose a course</label>
      <div class="flex max-w-xl flex-col gap-3 sm:flex-row">
        <div class="relative min-w-0 flex-1">
          <input
            id="comparison-course"
            class="border-outline bg-bg-primary focus:border-orange w-full rounded-lg border-2 px-4 py-2 uppercase outline-none"
            bind:value={input}
            oninput={updateSuggestions}
            onkeydown={onCourseKeydown}
            onfocus={() => (suggestionsOpen = true)}
            onblur={() => (suggestionsOpen = false)}
            placeholder="e.g. CMSC132"
            autocomplete="off"
            role="combobox"
            aria-expanded={showSuggestions}
            aria-controls="course-suggestions"
            aria-autocomplete="list"
            aria-activedescendant={showSuggestions && activeSuggestion >= 0
              ? `course-suggestion-${activeSuggestion}`
              : undefined}
            aria-describedby={validation ? 'course-validation' : undefined}
            aria-invalid={!!validation}
          />
          {#if showSuggestions}
            <ul
              id="course-suggestions"
              role="listbox"
              class="border-outline bg-bg-primary custom-scrollbar absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-lg border-2 shadow-lg"
            >
              {#each suggestions as suggestion, i (suggestion.courseCode)}
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <li
                  id="course-suggestion-{i}"
                  role="option"
                  aria-selected={i === activeSuggestion}
                  class="cursor-pointer select-none px-4 py-2"
                  class:bg-hover={i === activeSuggestion}
                  onpointermove={() => (activeSuggestion = i)}
                  onpointerdown={(event) => event.preventDefault()}
                  onclick={() => chooseSuggestion(suggestion.courseCode)}
                >
                  <span class="font-semibold">{suggestion.courseCode}</span>
                  <span class="ml-2">{suggestion.name}</span>
                </li>
              {/each}
            </ul>
          {/if}
        </div>
        <button type="submit" class="bg-orange rounded-lg px-5 py-2 font-semibold text-black">Find professors</button>
      </div>
      {#if validation}<p id="course-validation" class="text-danger mt-2 text-sm" role="alert">{validation}</p>{/if}
    </form>

    <div aria-live="polite">
      {#if status === 'loading'}
        <p class="text-text-secondary">Loading professors for {course}…</p>
      {:else if status === 'error'}
        <p class="text-danger">Could not load {course}. Select “Find professors” to try again.</p>
      {:else if status === 'loaded' && professors.length === 0}
        <p class="text-text-secondary">
          No professors found for {course}. Check the course code or try another course.
        </p>
      {:else if warning}
        <p class="text-warning text-sm">{warning}</p>
      {/if}
    </div>

    {#if status === 'loaded' && professors.length > 0}
      <section aria-label="Select professors" class="space-y-4">
        <h2 class="text-xl font-bold">Who teaches {course}?</h2>
        <div class="border-outline inline-flex flex-wrap rounded-lg border-2 p-1" role="group" aria-label="View">
          {#each viewOptions as option (option.id)}
            <button
              type="button"
              class="rounded-md px-4 py-1.5 font-semibold disabled:cursor-not-allowed disabled:opacity-50"
              class:bg-orange={activeView === option.id}
              class:text-black={activeView === option.id}
              class:hover:bg-hover={activeView !== option.id}
              aria-pressed={activeView === option.id}
              disabled={option.id === 'current' && currentCount === 0}
              onclick={() => setView(option.id)}>{option.label}</button
            >
          {/each}
        </div>

        {#if activeView !== 'pick'}
          <ProfessorTable
            professors={tableProfessors}
            {course}
            {overall}
            showStatus={activeView === 'all'}
            onCompare={compareFromTable}
          />
        {:else}
          <p class="text-text-secondary text-sm">
            Choose from current teaching assignments and available grade history.
          </p>
          {#if professors.length === 1}<p class="text-text-secondary">
              Only one professor is available for this course; a comparison needs two.
            </p>{/if}
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-8">
            {#each selectionSlugs.keys() as slot (slot)}
              <div class="border-outline min-w-0 rounded-xl border p-4 sm:p-5">
                <div class="mb-3 flex items-center justify-between gap-2">
                  <label for={`professor-${slot}`} class="flex items-center gap-2 font-semibold">
                    <span class="comparison-dot" style:background={PROFESSOR_COLORS[slot].dot}></span>Professor {slot +
                      1}
                  </label>
                  {#if selectionSlugs.length > 2}
                    <button
                      type="button"
                      class="hover:bg-hover rounded-md px-2 py-0.5 text-sm font-semibold"
                      aria-label={`Remove professor ${slot + 1}`}
                      onclick={() => removeSlot(slot)}>Remove</button
                    >
                  {/if}
                </div>
                <ProfessorPicker
                  {professors}
                  bind:selected={selectionSlugs[slot]}
                  excluded={selectionSlugs.filter((slug, index) => index !== slot && slug)}
                  id={`professor-${slot}`}
                  label={`Professor ${slot + 1}`}
                  onChange={() => syncUrl(course, selectionSlugs)}
                />
                {#if selected[slot]}
                  <ComparisonRating slug={selected[slot]!.slug} />
                {/if}
              </div>
            {/each}
            {#if selectionSlugs.length < MAX_COMPARED && professors.length > selectionSlugs.length}
              <button
                type="button"
                class="border-outline hover:border-orange hover:text-orange flex min-h-32 items-center justify-center rounded-xl border-2 border-dashed p-4 font-semibold"
                onclick={addSlot}>+ Add professor</button
              >
            {/if}
          </div>
        {/if}
      </section>

      {#if activeView === 'pick' && ready}
        <section aria-label="GPA comparison" class="border-outline rounded-xl border p-4 sm:p-6">
          <h2 class="text-xl font-bold">Average GPA in {course}</h2>
          <div
            class="my-6 grid grid-cols-2 gap-4 sm:gap-8"
            class:lg:grid-cols-3={compared.length === 3}
            class:lg:grid-cols-4={compared.length === 4}
          >
            {#each compared as { professor, slot } (slot)}
              {@const gpa = gpaOf(professor)}
              {@const delta = gpa === null ? null : deviation(professor)}
              <div>
                <p class="flex items-center gap-2 font-semibold">
                  <span class="comparison-dot" style:background={PROFESSOR_COLORS[slot].dot}></span>{professor.name}
                </p>
                <p class="mt-2 text-2xl font-semibold sm:text-3xl">
                  {gpa === null ? 'Unavailable' : gpa.toFixed(2)}<span
                    class="text-text-secondary ml-2 text-sm font-normal">{gpa === null ? '' : '/ 4.0'}</span
                  >
                </p>
                <p class="text-text-secondary mt-1 text-sm">
                  {professor.distribution
                    ? `${professor.distribution.graded.toLocaleString()} graded students`
                    : 'No grade history for this course'}
                </p>
                {#if delta !== null}
                  <p class="mt-2 font-medium" class:text-success={delta > 0} class:text-warning={delta < 0}>
                    {delta === 0
                      ? 'Same as other professors'
                      : `${Math.abs(delta)}% ${delta > 0 ? 'higher' : 'lower'} than other ${course} professors`}
                  </p>
                {/if}
              </div>
            {/each}
          </div>
          <div class="mx-3">
            <div class="relative h-14" role="img" aria-label={gpaScaleLabel}>
              <div class="bg-outline absolute inset-x-0 top-7 h-0.5 rounded-full"></div>
              {#each plottedProfessors as professor (professor.slug)}
                {#if !selectionSlugs.includes(professor.slug)}
                  <div
                    class="border-text-secondary bg-bg-primary absolute top-7 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
                    style:left={`${position(gpaOf(professor)!)}%`}
                    title={`${professor.name}: ${gpaOf(professor)!.toFixed(2)}`}
                  ></div>
                {/if}
              {/each}
              {#if courseMean !== null}
                <div
                  class="bg-text-primary absolute top-3 h-8 w-0.5 -translate-x-1/2"
                  style:left={`${position(courseMean)}%`}
                  title={`Course mean: ${courseMean.toFixed(2)}`}
                ></div>
              {/if}
              {#each compared as { professor, slot } (slot)}
                {@const gpa = gpaOf(professor)}
                {#if gpa !== null}
                  <div
                    class="gpa-marker"
                    style:left={`${position(gpa)}%`}
                    style:background={PROFESSOR_COLORS[slot].dot}
                    style:color={PROFESSOR_COLORS[slot].text}
                    title={`${professor.name}: ${gpa.toFixed(2)}`}
                  >
                    <span>{slot + 1}</span>
                  </div>
                {/if}
              {/each}
            </div>
            <div class="text-text-secondary flex justify-between text-sm">
              {#each [scaleMin, (scaleMin + 4) / 2, 4] as tick (tick)}<span>{tick.toFixed(1)}</span>{/each}
            </div>
          </div>
          <p class="text-text-secondary mt-4 text-sm">
            Gray dots: other professors · Vertical line: course mean {courseMean === null
              ? '(unavailable)'
              : courseMean.toFixed(2)}
          </p>
          <p class="text-text-secondary mt-1 text-sm">
            The line marks the overall course mean. Percentages compare each professor with the other instructors,
            excluding their own students.
          </p>
          {#if compared.some(({ professor }) => gpaOf(professor) === null)}<p class="text-text-secondary mt-4 text-sm">
              GPA requires at least 20 graded students. Professors without enough data can still be compared through
              reviews.
            </p>{/if}
        </section>

        <ComparisonDistribution professors={selected} />
        <p class="text-text-secondary text-sm">
          Percentages include letter grades and withdrawals. Different teaching periods and student groups can affect
          these comparisons.
        </p>

        <section aria-label="Compare student reviews" class="border-outline border-t pt-6">
          <div class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <h2 class="text-xl font-bold">Student reviews</h2>
            <label class="flex cursor-pointer items-center gap-3 text-sm">
              <span
                class="border-outline has-checked:border-orange has-checked:bg-orange/20 has-focus-visible:ring-orange has-focus-visible:ring-2 has-focus-visible:ring-offset-2 relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2"
              >
                <input type="checkbox" role="switch" bind:checked={allReviews} class="peer sr-only" />
                <span
                  class="bg-text-secondary peer-checked:bg-orange pointer-events-none absolute left-0.5 h-4 w-4 rounded-full transition-transform peer-checked:translate-x-5"
                ></span>
              </span>
              Show reviews from all courses
            </label>
          </div>
          <div
            class="border-outline mt-4 flex border-b"
            class:md:hidden={!tabbedReviews}
            role="tablist"
            aria-label="Professor reviews"
          >
            {#each compared as { professor, slot }, index (slot)}
              <button
                type="button"
                role="tab"
                id={`review-tab-${index}`}
                aria-selected={activeReviewTab === index}
                aria-controls={`review-panel-${index}`}
                tabindex={activeReviewTab === index ? 0 : -1}
                class="flex min-w-0 flex-1 items-center justify-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold"
                class:border-orange={activeReviewTab === index}
                class:text-orange={activeReviewTab === index}
                class:border-transparent={activeReviewTab !== index}
                onclick={() => (reviewTab = index)}
                onkeydown={(event) => {
                  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                    event.preventDefault();
                    const step = event.key === 'ArrowRight' ? 1 : -1;
                    reviewTab = (activeReviewTab + step + compared.length) % compared.length;
                    document.getElementById(`review-tab-${reviewTab}`)?.focus();
                  }
                }}
                ><span class="comparison-dot" style:background={PROFESSOR_COLORS[slot].dot}></span><span
                  class="truncate">{professor.name}</span
                ></button
              >
            {/each}
          </div>
          <div class="grid grid-cols-1 gap-4 md:gap-8" class:md:grid-cols-2={!tabbedReviews}>
            {#each compared as { professor, slot }, index (slot)}
              <div
                id={`review-panel-${index}`}
                class="min-w-0"
                class:md:block={!tabbedReviews}
                class:hidden={activeReviewTab !== index}
                aria-label={`${professor.name}'s reviews`}
              >
                <h3 class="mt-6 flex items-center gap-2 font-bold">
                  <span class="comparison-dot" style:background={PROFESSOR_COLORS[slot].dot}></span>{professor.name}
                </h3>
                {#key professor.slug}
                  <ReviewList
                    id={`comparison-reviews-${slot}`}
                    instructorSlug={professor.slug}
                    courseCode={allReviews ? null : course}
                  />
                {/key}
              </div>
            {/each}
          </div>
        </section>
      {:else if activeView === 'pick'}
        <p class="text-text-secondary py-8 text-center">
          Select at least two professors to compare their GPA, grade distributions, and reviews.
        </p>
      {/if}
    {/if}
  </div>
</main>

<style>
  :global(html:has(.comparison-page)) {
    min-width: 320px;
  }

  .comparison-dot {
    display: inline-block;
    width: 0.75rem;
    height: 0.75rem;
    flex-shrink: 0;
    border-radius: 50%;
  }
  .gpa-marker {
    position: absolute;
    display: grid;
    place-items: center;
    width: 1.4rem;
    height: 1.4rem;
    top: 1.75rem;
    transform: translate(-50%, -50%);
    border: 2px solid var(--bg-primary);
    border-radius: 50%;
    font-size: 0.7rem;
    font-weight: 700;
  }
</style>
