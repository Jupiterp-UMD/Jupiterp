<!--
This file is part of Jupiterp. For terms of use, please see LICENSE at
https://github.com/atcupps/Jupiterp/LICENSE.

Compare two professors within a single course.
-->
<script lang="ts">
  import { onDestroy } from 'svelte';
  import { resolve } from '$app/paths';
  import { client } from '$lib/client';
  import { courseGradeSummary, courseInstructorGradeSummary } from '$lib/api/JupiterpApi';
  import { comparisonProfessors, type ComparisonProfessor } from '$lib/professor/Comparison';
  import { hasEnoughForGpa, toDistribution } from '$lib/course-planner/Grades';
  import ComparisonDistribution from '../../../components/professor/ComparisonDistribution.svelte';
  import ReviewList from '../../../components/professor/ReviewList.svelte';
  import ComparisonRating from '../../../components/professor/ComparisonRating.svelte';
  import ProfessorPicker from '../../../components/professor/ProfessorPicker.svelte';

  let input = $state('');
  let course = $state('');
  let professors = $state<ComparisonProfessor[]>([]);
  let leftSlug = $state('');
  let rightSlug = $state('');
  let allReviews = $state(false);
  let reviewTab = $state(0);
  let status = $state<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  let validation = $state('');
  let warning = $state('');
  let courseMean = $state<number | null>(null);
  let requestId = 0;

  let left = $derived(professors.find((professor) => professor.slug === leftSlug));
  let right = $derived(professors.find((professor) => professor.slug === rightSlug));
  let selected = $derived([left, right]);
  let ready = $derived(left !== undefined && right !== undefined);
  let plottedProfessors = $derived(professors.filter((professor) => gpaOf(professor) !== null));
  let scaleMin = $derived(
    Math.min(2, ...plottedProfessors.map((professor) => Math.floor(gpaOf(professor)!)), Math.floor(courseMean ?? 2))
  );

  onDestroy(() => {
    requestId++;
  });

  async function loadCourse(event: SubmitEvent) {
    event.preventDefault();
    const code = input.replace(/\s+/g, '').toUpperCase();
    if (!/^[A-Z]{4}\d{3}[A-Z]?$/.test(code)) {
      validation = 'Enter a course code, such as CMSC132.';
      return;
    }
    validation = '';
    const id = ++requestId;
    course = code;
    input = code;
    professors = [];
    leftSlug = '';
    rightSlug = '';
    allReviews = false;
    warning = '';
    courseMean = null;
    status = 'loading';
    try {
      const [history, current, summary] = await Promise.allSettled([
        courseInstructorGradeSummary({ courseCodes: code }),
        client.coursesWithSections({ courseCodes: new Set([code]) }),
        courseGradeSummary({ courseCodes: code }),
      ]);
      if (id !== requestId) return;
      // Historical grades are essential; current assignments can fail independently.
      if (history.status === 'rejected') throw history.reason;
      const response = current.status === 'fulfilled' ? current.value : null;
      const currentCourse = response?.ok() ? response.data?.find((row) => row.courseCode === code) : undefined;
      if (!response?.ok())
        warning = 'Current teaching assignments could not be loaded. Showing professors from grade history.';
      professors = comparisonProfessors(history.value.data, currentCourse?.sections ?? []);
      const overall = summary.status === 'fulfilled' ? summary.value.data[0] : undefined;
      if (overall && hasEnoughForGpa(toDistribution(overall))) courseMean = Number(overall.gpa);
      status = 'loaded';
    } catch {
      if (id === requestId) status = 'error';
    }
  }

  function gpaOf(professor: ComparisonProfessor | undefined): number | null {
    const distribution = professor?.distribution;
    return distribution && hasEnoughForGpa(distribution) ? distribution.gpa : null;
  }

  function position(gpa: number): number {
    return Math.max(0, Math.min(100, ((gpa - scaleMin) / (4 - scaleMin)) * 100));
  }

  function deviation(gpa: number): number | null {
    return courseMean === null || courseMean === 0 ? null : ((gpa - courseMean) / courseMean) * 100;
  }
</script>

<svelte:head>
  <title>Compare Professors | Jupiterp</title>
  <meta name="description" content="Compare two UMD professors' grades and student reviews for the same course." />
</svelte:head>

<main class="comparison-page custom-scrollbar fixed inset-x-0 bottom-0 top-12 overflow-y-auto">
  <div class="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:space-y-8 sm:px-8 sm:py-8">
    <header class="space-y-2">
      <a href={resolve('/professors')} class="text-orange text-sm hover:underline">← All professors</a>
      <h1 class="text-3xl font-bold">Compare professors</h1>
      <p class="text-text-secondary">
        One course. Two professors. See how their grades and student experiences compare.
      </p>
    </header>

    <form onsubmit={loadCourse} class="border-outline rounded-xl border p-4 sm:p-6">
      <label for="comparison-course" class="mb-2 block font-semibold">Choose a course</label>
      <div class="flex max-w-xl flex-col gap-3 sm:flex-row">
        <input
          id="comparison-course"
          class="border-outline bg-bg-primary focus:border-orange min-w-0 flex-1 rounded-lg border-2 px-4 py-2 uppercase outline-none"
          bind:value={input}
          placeholder="e.g. CMSC132"
          autocomplete="off"
          aria-describedby={validation ? 'course-validation' : undefined}
          aria-invalid={!!validation}
        />
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
        <p class="text-text-secondary text-sm">Choose from current teaching assignments and available grade history.</p>
        {#if professors.length === 1}<p class="text-text-secondary">
            Only one professor is available for this course; a comparison needs two.
          </p>{/if}
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-8">
          {#each ['left', 'right'] as side, index (side)}
            <div class="border-outline min-w-0 rounded-xl border p-4 sm:p-5">
              <label for={`professor-${side}`} class="mb-3 flex items-center gap-2 font-semibold">
                <span class="comparison-dot" class:second={index === 1}></span>Professor {index + 1}
              </label>
              {#if index === 0}
                <ProfessorPicker
                  {professors}
                  bind:selected={leftSlug}
                  excluded={rightSlug}
                  id="professor-left"
                  label="Professor 1"
                />
              {:else}
                <ProfessorPicker
                  {professors}
                  bind:selected={rightSlug}
                  excluded={leftSlug}
                  id="professor-right"
                  label="Professor 2"
                />
              {/if}
              {#if selected[index]}
                <ComparisonRating slug={selected[index]!.slug} />
              {/if}
            </div>
          {/each}
        </div>
      </section>

      {#if ready}
        <section aria-label="GPA comparison" class="border-outline rounded-xl border p-4 sm:p-6">
          <h2 class="text-xl font-bold">Average GPA in {course}</h2>
          <div class="my-6 grid grid-cols-2 gap-4 sm:gap-8">
            {#each selected as professor, index (index)}
              {@const gpa = gpaOf(professor)}
              {@const delta = gpa === null ? null : deviation(gpa)}
              <div>
                <p class="flex items-center gap-2 font-semibold">
                  <span class="comparison-dot" class:second={index === 1}></span>{professor?.name}
                </p>
                <p class="mt-2 text-2xl font-semibold sm:text-3xl">
                  {gpa === null ? 'Unavailable' : gpa.toFixed(2)}<span
                    class="text-text-secondary ml-2 text-sm font-normal">{gpa === null ? '' : '/ 4.0'}</span
                  >
                </p>
                <p class="text-text-secondary mt-1 text-sm">
                  {professor?.distribution
                    ? `${professor.distribution.graded.toLocaleString()} graded students`
                    : 'No grade history for this course'}
                </p>
                {#if delta !== null}
                  <p class="mt-2 font-medium" class:text-success={delta > 0} class:text-warning={delta < 0}>
                    {Math.abs(delta) < 0.05
                      ? 'At the course mean'
                      : `${Math.abs(delta).toFixed(1)}% ${delta > 0 ? 'above' : 'below'} the course mean`}
                  </p>
                {/if}
              </div>
            {/each}
          </div>
          <div class="mx-3">
            <div
              class="relative h-14"
              role="img"
              aria-label={`GPA scale from ${scaleMin} to 4 with ${plottedProfessors.length} professors. Course mean: ${courseMean?.toFixed(2) ?? 'unavailable'}. ${left?.name}: ${gpaOf(left)?.toFixed(2) ?? 'unavailable'}. ${right?.name}: ${gpaOf(right)?.toFixed(2) ?? 'unavailable'}.`}
            >
              <div class="bg-outline absolute inset-x-0 top-7 h-0.5 rounded-full"></div>
              {#each plottedProfessors as professor (professor.slug)}
                {#if professor.slug !== leftSlug && professor.slug !== rightSlug}
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
              {#each selected as professor, index (index)}
                {@const gpa = gpaOf(professor)}
                {#if gpa !== null}
                  <div
                    class="gpa-marker"
                    class:second={index === 1}
                    style:left={`${position(gpa)}%`}
                    title={`${professor?.name}: ${gpa.toFixed(2)}`}
                  >
                    <span>{index + 1}</span>
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
            The course mean is weighted by graded student count and includes both selected professors.
          </p>
          {#if gpaOf(left) === null || gpaOf(right) === null}<p class="text-text-secondary mt-4 text-sm">
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
          <div class="border-outline mt-4 flex border-b md:hidden" role="tablist" aria-label="Professor reviews">
            {#each selected as professor, index (index)}
              <button
                type="button"
                role="tab"
                id={`review-tab-${index}`}
                aria-selected={reviewTab === index}
                aria-controls={`review-panel-${index}`}
                tabindex={reviewTab === index ? 0 : -1}
                class="min-w-0 flex-1 border-b-2 px-3 py-3 text-sm font-semibold"
                class:border-orange={reviewTab === index}
                class:text-orange={reviewTab === index}
                class:border-transparent={reviewTab !== index}
                onclick={() => (reviewTab = index)}
                onkeydown={(event) => {
                  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                    event.preventDefault();
                    reviewTab = 1 - reviewTab;
                    document.getElementById(`review-tab-${reviewTab}`)?.focus();
                  }
                }}>{professor?.name}</button
              >
            {/each}
          </div>
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-8">
            {#each selected as professor, index (index)}
              {#if professor}
                <div
                  id={`review-panel-${index}`}
                  class="min-w-0 md:block"
                  class:hidden={reviewTab !== index}
                  aria-label={`${professor.name}'s reviews`}
                >
                  <h3 class="mt-6 flex items-center gap-2 font-bold">
                    <span class="comparison-dot" class:second={index === 1}></span>{professor.name}
                  </h3>
                  {#key professor.slug}
                    <ReviewList
                      id={`comparison-reviews-${index}`}
                      instructorSlug={professor.slug}
                      courseCode={allReviews ? null : course}
                    />
                  {/key}
                </div>
              {/if}
            {/each}
          </div>
        </section>
      {:else}
        <p class="text-text-secondary py-8 text-center">
          Select two professors to compare their GPA, grade distributions, and reviews.
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
    background: var(--orange);
  }
  .second {
    --marker-color: #38bdf8;
  }
  .comparison-dot.second {
    background: var(--marker-color);
  }
  .gpa-marker {
    --marker-color: var(--orange);
    position: absolute;
    display: grid;
    place-items: center;
    width: 1.4rem;
    height: 1.4rem;
    top: 1.75rem;
    transform: translate(-50%, -50%);
    border: 2px solid var(--bg-primary);
    border-radius: 50%;
    background: var(--marker-color);
    color: #000;
    font-size: 0.7rem;
    font-weight: 700;
  }
  .gpa-marker.second {
    --marker-color: #38bdf8;
  }
</style>
