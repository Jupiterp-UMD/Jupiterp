<!--
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).
Copyright (C) 2026 Andrew Cupps

The whole professor page, rendered two ways. The `/professor/[slug]` route
server-renders it for SEO; the planner opens the same component in a modal.
Neither knows about the other -- this takes a fully-loaded data object and
renders it.
-->
<script lang="ts">
  import { untrack } from 'svelte';
  import { fade } from 'svelte/transition';
  import { hasEnoughForGpa } from '../../lib/course-planner/Grades';
  import { ratingBreakdown, type ProfessorData } from '../../lib/professor/ProfessorData';
  import CoursePicker from './CoursePicker.svelte';
  import GpaScale from './GpaScale.svelte';
  import GradeDistribution from './GradeDistribution.svelte';
  import GradeTrend from './GradeTrend.svelte';
  import ReviewForm from './ReviewForm.svelte';
  import ReviewList from './ReviewList.svelte';
  import StarRating from './StarRating.svelte';

  interface Props {
    data: ProfessorData;
    initialCourse?: string | null;
    onCourseChange?: (code: string | null) => void;
  }

  let { data, initialCourse = null, onCourseChange }: Props = $props();

  let rating = $derived(ratingBreakdown(data.instructor));
  let overall = $derived(data.overall);

  /** Courses worth showing a GPA for, largest first. */
  let courses = $derived(data.courses);

  let totalCourses = $derived(courses.filter((course) => hasEnoughForGpa(course.distribution)));

  let allCourseCodes = $derived([
    ...new Set([...data.currentCourseCodes, ...data.courses.map((course) => course.courseCode)]),
  ]);

  let selectedCode = $state<string | null>(
    untrack(() =>
      initialCourse !== null &&
      totalCourses.length > 1 &&
      totalCourses.some((course) => course.courseCode === initialCourse)
        ? initialCourse
        : null
    )
  );

  let courseChangeReady = false;
  $effect(() => {
    const code = selectedCode;
    if (!courseChangeReady) {
      courseChangeReady = true;
      return;
    }
    untrack(() => onCourseChange?.(code));
  });

  let selectedCourse = $derived(courses.find((course) => course.courseCode === selectedCode) ?? null);
  let scoped = $derived(selectedCourse?.distribution ?? overall);
  let showScopedGpa = $derived(scoped !== null && hasEnoughForGpa(scoped));

  let pickerBar: HTMLDivElement | undefined = $state();
  let stuck = $state(false);

  $effect(() => {
    if (!pickerBar) return;

    let root: HTMLElement | null = pickerBar.parentElement;
    while (root && root !== document.documentElement && !/(auto|scroll)/.test(getComputedStyle(root).overflowY)) {
      root = root.parentElement;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        // When sticky, it is partially clipped by the -1px margin, making intersectionRatio < 1
        stuck = entry.intersectionRatio < 1;
      },
      {
        root: root === document.documentElement ? null : root,
        rootMargin: '-1px 0px 0px 0px',
        threshold: [1],
      }
    );

    observer.observe(pickerBar);
    return () => observer.disconnect();
  });

  // Scroll to the reviews section when the user clicks the "reviews" link in the header.
  let reviewsEl = $state<HTMLElement | null>(null);

  function scrollToReviews() {
    if (!reviewsEl) return;
    reviewsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  let showForm = $state(false);
  let reviewSent = $state(false);

  // For the hero section wrapping (68px + 2 error margins)
  let heroSectionHeight = $state(0);
  let isWrapped = $derived(heroSectionHeight > 70);
</script>

<section bind:clientHeight={heroSectionHeight} class="flex flex-row flex-wrap items-center justify-between">
  <!-- div has a height of 68px -->
  <div class="min-w-fit flex-1">
    <h1 class="wrap-break-word text-2xl font-bold">{data.instructor.name}</h1>
    <div class="text-text-secondary mr-8 h-9 min-w-fit gap-2 py-2 text-sm">
      {#if data.departments.length > 0}
        <span>{data.departments.slice(0, 3).join(', ')}</span>
      {/if}
      {#if data.instructor.is_active}
        <span class="border-orange text-orange shrink-0 rounded-xl border px-2 text-xs font-bold">
          Currently teaching
        </span>
      {:else}
        <span class="border-outline shrink-0 rounded-xl border px-2 text-xs">Not teaching this term</span>
      {/if}
    </div>
  </div>

  <!-- Dynamic padding and item placement toggled exactly by the wrap state -->
  <button
    onclick={scrollToReviews}
    aria-label="Rating"
    class="flex shrink-0 flex-col items-end gap-x-2 sm:w-auto"
    class:w-full={isWrapped}
    class:justify-between={isWrapped}
    class:flex-row-reverse={isWrapped}
  >
    {#if rating.displayable && rating.combined !== null}
      <span class="whitespace-nowrap pb-0.5 pt-2.5 text-sm"
        >{rating.jupiterpCount + rating.planetterpCount} reviews</span
      >
      <div class="flex flex-row items-center gap-3">
        <StarRating value={rating.combined} size="text-2xl" />
        <div class="flex flex-row items-baseline gap-1.5">
          <span class="text-orange whitespace-nowrap text-2xl font-bold">{rating.combined.toFixed(1)}</span>
          <span class="text-text-secondary whitespace-nowrap text-sm">out of 5</span>
        </div>
      </div>
    {:else}
      <!-- Needs two elements to maintain the layout -->
      <span></span>
      <p class="text-text-secondary whitespace-nowrap py-2 text-sm">Not enough reviews yet.</p>
    {/if}
  </button>
</section>

{#if totalCourses.length > 0}
  <div
    bind:this={pickerBar}
    class="bg-bg-primary mx-0! max-w-full! sticky -top-6 z-10 mt-8 border-b-2 py-2 transition-[border-color,box-shadow] duration-200"
    class:border-orange={stuck}
    class:shadow-md={stuck}
    class:border-transparent={!stuck}
    role={totalCourses.length > 1 ? 'group' : undefined}
    aria-label={totalCourses.length > 1 ? 'Scope grades and reviews to a course' : undefined}
  >
    <!-- Once the bar sticks, the header has scrolled away, so the bar carries
           the name and rating to keep the reader oriented. -->
    <div class="mx-auto flex w-full max-w-3xl flex-row items-center gap-4">
      <div class="shrink-0">
        {#if totalCourses.length > 1}
          <CoursePicker
            id="grades-course"
            codes={totalCourses.map((course) => course.courseCode)}
            bind:selected={selectedCode}
          />
        {:else}
          <div class="border-outline h-8 rounded-lg border-2 px-4 py-1 font-semibold sm:w-56">
            Only <span class="text-orange">{totalCourses[0].courseCode}</span>
          </div>
        {/if}
      </div>
      {#if stuck && rating.displayable && rating.combined !== null}
        <div class="flex min-w-0 flex-1 flex-row items-center justify-end gap-2" transition:fade={{ duration: 150 }}>
          <span class="min-w-0 truncate text-lg font-bold max-sm:hidden">{data.instructor.name}</span>
          <span class="bg-outline h-8 w-px shrink-0 max-sm:hidden" aria-hidden="true"></span>
          <button
            onclick={scrollToReviews}
            class="text-orange hover:text-orange/80 shrink-0 text-lg font-bold"
            aria-hidden="true">★ {rating.combined.toFixed(1)}</button
          >
        </div>
      {/if}
    </div>
  </div>
{/if}

<!-- Grade data for the selected scope -->
<section aria-label="Grade distribution" class="mt-4 flex flex-col">
  {#if scoped === null}
    <p class="text-text-secondary text-sm">
      No grade data is linked to this instructor. Jupiterp's grade records cover Fall and Spring terms from 2010 onward
      and name an instructor for about three quarters of sections, so a professor who teaches only in Summer or Winter,
      or whose sections were never attributed, will have none.
    </p>
  {:else}
    {#if showScopedGpa && scoped.gpa !== null}
      <GpaScale gpa={scoped.gpa} instructorSlug={data.instructor.slug} courseCode={selectedCode} />
    {:else}
      <span class="text-text-secondary"> Not enough data for an average GPA. </span>
    {/if}

    <div class="mt-8">
      <GradeDistribution distribution={scoped} />
    </div>
  {/if}
</section>

<!-- Trend -->
{#if data.terms.length > 1}
  <section aria-label="Grades over time" class="mt-8 flex flex-col gap-4">
    <h3 class="mb-2 text-lg font-bold">GPA Over time (All courses)</h3>
    <GradeTrend terms={data.terms} />
  </section>
{/if}

<!-- Reviews -->
<ReviewList instructorSlug={data.instructor.slug} courseCode={selectedCode} bind:reviewsEl />

<section aria-label="Write a review" class="mt-4 flex flex-col gap-2">
  {#if showForm}
    <ReviewForm
      instructorSlug={data.instructor.slug}
      instructorName={data.instructor.name}
      courseCodes={allCourseCodes}
      onsent={() => (reviewSent = true)}
    />
    {#if !reviewSent}
      <button class="text-orange self-start text-sm font-bold underline" onclick={() => (showForm = false)}>
        Cancel
      </button>
    {/if}
  {:else}
    <button
      class="bg-orange text-bg-primary self-start rounded-lg px-4 py-2 font-bold"
      onclick={() => (showForm = true)}
    >
      Write a review
    </button>
  {/if}
</section>

<!-- Caveats. These generate "your numbers are wrong" reports if left
       implicit, because every one of them is invisible in the figures. -->
<footer class="text-text-secondary mt-8 flex flex-col gap-2 text-justify text-sm">
  <p>
    <b>Privacy & Moderation:</b> Requires a UMD email address to submit a review <b>(it cannot be seen by anyone)</b>.
    Every review is manually approved by a moderator before publishing.
  </p>
  <p>
    <b>Grade Data Source:</b> Obtained via public records requests from the UMD Office of the Registrar. It covers
    <b>Fall and Spring semesters only</b> (No Winter and Summer terms).
  </p>
  <p>
    <b>Instructor Discrepancy:</b> About a quarter of sections carry no instructor name in the registrar's records. Those
    attributed to the instructor of the lecture are unambiguously listed, otherwise left unattributed. Therefore, a professor's
    totals here may not cover everything they taught.
  </p>
</footer>
