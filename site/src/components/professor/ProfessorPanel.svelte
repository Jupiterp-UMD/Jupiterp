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
  import { formatSemester, hasEnoughForGpa } from '../../lib/course-planner/Grades';
  import { ratingBreakdown, type ProfessorData } from '../../lib/professor/ProfessorData';
  import GradeDistributionBars from '../course-planner/course-search/GradeDistributionBars.svelte';
  import GradeTrend from './GradeTrend.svelte';
  import ReviewForm from './ReviewForm.svelte';
  import ReviewList from './ReviewList.svelte';

  interface Props {
    data: ProfessorData;
    /** Renders the name as an h1 on the route, an h2 inside the modal. */
    headingLevel?: 1 | 2;
  }

  let { data, headingLevel = 1 }: Props = $props();

  let rating = $derived(ratingBreakdown(data.instructor));
  let overall = $derived(data.overall);
  let showOverallGpa = $derived(overall !== null && hasEnoughForGpa(overall));

  /** Courses worth showing a GPA for, largest first. */
  let courses = $derived(data.courses);

  let showForm = $state(false);
</script>

<article class="flex flex-col gap-4">
  <!-- Header -->
  <header class="flex flex-col gap-1">
    {#if headingLevel === 1}
      <h1 class="text-2xl font-bold">{data.instructor.name}</h1>
    {:else}
      <h2 class="text-xl font-bold">{data.instructor.name}</h2>
    {/if}

    <div class="text-text-secondary flex flex-row flex-wrap items-center gap-2 text-sm">
      {#if data.departments.length > 0}
        <span>{data.departments.slice(0, 3).join(', ')}</span>
      {/if}
      {#if data.instructor.is_active}
        <span class="border-orange text-orange rounded-xl border px-2 text-xs font-bold"> Currently teaching </span>
      {:else}
        <span class="border-outline rounded-xl border px-2 text-xs">Not teaching this term</span>
      {/if}
    </div>
  </header>

  <!-- Rating, with the split always visible. A single blended number with no
       explanation invites the reader to trust it more than it deserves. -->
  <section aria-label="Rating" class="flex flex-col gap-1">
    {#if rating.displayable && rating.combined !== null}
      <div class="flex flex-row items-baseline gap-2">
        <span class="text-orange text-3xl font-bold">{rating.combined.toFixed(1)}</span>
        <span class="text-text-secondary text-sm">out of 5</span>
      </div>
    {:else}
      <p class="text-text-secondary text-sm">Not enough reviews yet.</p>
    {/if}
  </section>

  <!-- Overall grade data -->
  <section aria-label="Grade distribution" class="flex flex-col gap-2">
    <h3 class="text-lg font-bold">Grades</h3>

    {#if overall === null}
      <p class="text-text-secondary text-sm">
        No grade data is linked to this instructor. Jupiterp's grade records cover Fall and Spring terms from 2010
        onward and name an instructor for about three quarters of sections, so a professor who teaches only in Summer or
        Winter, or whose sections were never attributed, will have none.
      </p>
    {:else}
      <div class="flex flex-row flex-wrap items-baseline gap-3">
        {#if showOverallGpa && overall.gpa !== null}
          <span class="text-3xl font-bold">
            {overall.gpa.toFixed(2)}
          </span>
          <span class="text-text-secondary text-sm">
            average GPA across {overall.graded.toLocaleString()} graded students
            {#if data.courses.length > 0}
              in {data.courses.length}
              {data.courses.length === 1 ? 'course' : 'courses'}
            {/if}
          </span>
        {:else}
          <span class="text-text-secondary text-sm">
            Limited data &middot; {overall.graded.toLocaleString()} graded students. Too few to show an average GPA.
          </span>
        {/if}
      </div>

      <div class="max-w-md">
        <GradeDistributionBars distribution={overall} />
      </div>

      <p class="text-text-secondary text-xs">
        {#if overall.firstTerm !== null && overall.lastTerm !== null}
          {formatSemester(overall.firstTerm)} – {formatSemester(overall.lastTerm)} &middot;
        {/if}
        {overall.barTotal.toLocaleString()} students
      </p>
    {/if}
  </section>

  <!-- Trend -->
  {#if data.terms.length > 1}
    <section aria-label="Grades over time" class="flex flex-col gap-2">
      <h3 class="text-lg font-bold">Over time</h3>
      <GradeTrend terms={data.terms} />
    </section>
  {/if}

  <!-- Per course -->
  {#if courses.length > 0}
    <section aria-label="Grades by course" class="flex flex-col gap-2">
      <h3 class="text-lg font-bold">By course</h3>
      <ul class="flex flex-col gap-3">
        {#each courses as course (course.courseCode)}
          <li class="border-outline rounded-lg border p-2">
            <div class="flex flex-row flex-wrap items-baseline gap-2">
              <span class="font-bold">{course.courseCode}</span>
              {#if hasEnoughForGpa(course.distribution) && course.distribution.gpa !== null}
                <span class="font-bold">
                  {course.distribution.gpa.toFixed(2)}
                </span>
              {:else}
                <span class="text-text-secondary text-xs">Limited data</span>
              {/if}
              <span class="text-text-secondary text-xs">
                {course.distribution.graded.toLocaleString()} graded &middot;
                {course.distribution.sectionCount}
                {course.distribution.sectionCount === 1 ? 'section' : 'sections'}
              </span>
            </div>
            <div class="max-w-md pt-1">
              <GradeDistributionBars distribution={course.distribution} />
            </div>
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  <!-- Reviews -->
  <ReviewList instructorSlug={data.instructor.slug} />

  <section aria-label="Write a review" class="flex flex-col gap-2">
    {#if showForm}
      <ReviewForm
        instructorSlug={data.instructor.slug}
        instructorName={data.instructor.name}
        courseCodes={[
          ...new Set([...data.currentCourseCodes, ...data.courses.map((course) => course.courseCode)]),
        ]}
      />
      <button class="text-text-secondary self-start text-sm underline" onclick={() => (showForm = false)}>
        Cancel
      </button>
    {:else}
      <button
        class="bg-orange text-bg-primary self-start rounded-lg px-4 py-2 font-bold"
        onclick={() => (showForm = true)}
      >
        Write a review
      </button>
      <p class="text-text-secondary text-xs">
        Requires a UMD email address. Every review is read by a moderator before it appears.
      </p>
    {/if}
  </section>

  <!-- Caveats. These generate "your numbers are wrong" reports if left
       implicit, because every one of them is invisible in the figures. -->
  <footer class="text-text-secondary flex flex-col gap-1 text-xs">
    <p>
      Grade data comes from the University of Maryland's Office of the Registrar, obtained by public records request. It
      covers <b>Fall and Spring terms only</b> — Winter and Summer are not included.
    </p>
    <p>
      About a quarter of sections carry no instructor name in the registrar's records. Those are attributed to the
      instructor of the lecture they belong to where that is unambiguous, and left unattributed otherwise, so a
      professor's totals here may not cover everything they taught.
    </p>
  </footer>
</article>
