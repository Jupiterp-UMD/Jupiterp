<!--
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).
Copyright (C) 2026 Andrew Cupps
-->
<script lang="ts">
  import { clickoutside } from '@svelte-put/clickoutside';
  import { resolve } from '$app/paths';
  import { CourseGradesStore, ProfsLookupStore } from '../../../stores/CoursePlannerStores';
  import { hasEnoughForGpa } from '../../../lib/course-planner/Grades';
  import GradesPopover from './GradesPopover.svelte';

  // 1. Properly define the component props type contract
  interface Props {
    instructor?: string;
    /**
     * The professor page slug for this instructor, resolved by the API from
     * `section.instructorSlugs`. Null when the name has not been resolved yet
     * (a new spelling awaiting triage), in which case the name renders as
     * plain text.
     */
    slug?: string | null;
    /**
     * Course code used to look up this instructor's grade data in
     * `CourseGradesStore`; without it, no GPA chip is shown.
     */
    courseCode?: string;
    profsHover: boolean;
    removeHoverSection: () => void;
  }

  let {
    instructor = 'No instructor',
    slug = null,
    courseCode = undefined,
    // eslint-disable-next-line no-useless-assignment
    profsHover = $bindable(),
    removeHoverSection,
  }: Props = $props();

  let profs = $derived($ProfsLookupStore);

  /**
   * The professor as the planner needs them: a link target, and a rating only
   * if one exists.
   *
   * These used to be one condition. A professor was linked only when
   * `average_rating != null`, which made the link a side effect of having been
   * rated -- reasonable when the destination was a PlanetTerp page that existed
   * because of those ratings, and wrong now that the destination is a Jupiterp
   * page built mostly from grade data. 1,009 of 2,976 active instructors have
   * no rating, and every one of them has a page with their full grade history
   * that nothing in the planner pointed at.
   *
   * So the link is gated on having a slug, and the stars are gated separately
   * on having a rating.
   */
  let currentProf = $derived.by(() => {
    const name = instructor ?? 'No instructor';
    if (!slug) {
      return null;
    }
    // Looked up by slug, never by name. The API resolves each section's
    // instructors through the alias table, so this works for a professor whose
    // Testudo spelling differs from their canonical record, and for two
    // professors who share a name.
    const profData = profs?.[slug];
    const rating = profData?.average_rating ?? null;
    return {
      name,
      slug,
      rating,
      starsStyle: rating != null ? `--rating: ${convertRating(rating)}%` : undefined,
    };
  });

  // Convert rating to a percentage for CSS.
  //
  // Takes a number: `average_rating` is a Postgres `real` and arrives as JSON,
  // so the parseFloat this used to do was coercing a value that was already
  // numeric. The caller only reaches here when the rating is non-null.
  function convertRating(rating: number | null): number {
    if (rating == null) {
      throw Error('Rating was null in `convertRating`; this should never happen!');
    }
    return rating * 20;
  }

  function handleLinkClick(event: MouseEvent) {
    // Prevent the event from propagating to the button
    event.stopPropagation();
  }

  // Grade data for this instructor in this course, if loaded.
  //
  // Matched by slug rather than by name. The distributions are keyed on the
  // instructor's Jupiterp slug, and Testudo's spelling of a name routinely
  // differs from the registrar's -- "Shane Walsh" against "Shane Bolles
  // Walsh". Matching on the raw string is what made per-professor grade data
  // silently absent for a large share of instructors.
  let entry = $derived(courseCode != null ? $CourseGradesStore[courseCode] : undefined);
  // The slug comes straight from the section now, rather than from a name
  // lookup, so the chip appears for the same set of professors the link does.
  let profSlug = $derived(slug ?? undefined);
  let profDist = $derived(
    entry !== undefined && entry.status === 'loaded' && profSlug !== undefined
      ? (entry.grades.byInstructorSlug[profSlug] ?? null)
      : null
  );
  let showChip = $derived(profDist != null && hasEnoughForGpa(profDist));

  let gpaOpen = $state(false);

  let chipTitle = $derived(
    profDist != null && profDist.gpa != null
      ? 'Avg. GPA ' + profDist.gpa.toFixed(2) + ' for ' + instructor + (courseCode != null ? ' in ' + courseCode : '')
      : ''
  );

  function handleChipClick(event: MouseEvent) {
    event.stopPropagation();
    // Only ever open on click; closing is handled by mouseleave on
    // desktop and clickoutside on touch devices, so the mouseenter
    // that precedes a tap's click doesn't cancel it out.
    gpaOpen = true;
  }

  function handleChipKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      gpaOpen = !gpaOpen;
    }
  }
</script>

<div class="text-sm xl:text-base">
  {#if currentProf}
    <!-- Internal professor page, not an outbound PlanetTerp link. -->
    <a
      href={resolve('/professor/[slug]', { slug: currentProf.slug })}
      class="text-orange hover:bg-hover inline-flex flex-wrap rounded-md underline"
      onmouseenter={() => {
        profsHover = true; // Mutating properties directly updates parent binding
        removeHoverSection();
      }}
      onmouseleave={() => {
        profsHover = false;
        removeHoverSection();
      }}
      onclick={handleLinkClick}
      title="View {currentProf.name} on Jupiterp"
    >
      {currentProf.name}
    </a>
    {#if currentProf.rating != null}
      <span
        style={currentProf.starsStyle}
        class="stars text-orange text-xs font-bold xl:text-sm 2xl:text-base"
        aria-hidden="true"
      >
        ★★★★★
      </span>
      <!-- The stars are a CSS gradient over text; the value itself has to be
           readable by a screen reader some other way. -->
      <span class="sr-only">Rated {currentProf.rating} out of 5</span>
    {/if}
  {:else}
    {instructor ?? 'No instructor'}
  {/if}
  {#if showChip && profDist != null && profDist.gpa != null}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <span
      class="relative inline-block"
      use:clickoutside
      onclickoutside={() => (gpaOpen = false)}
      onmouseenter={() => {
        profsHover = true;
        removeHoverSection();
        gpaOpen = true;
      }}
      onmouseleave={() => {
        profsHover = false;
        removeHoverSection();
        gpaOpen = false;
      }}
    >
      <span
        role="button"
        tabindex="0"
        aria-expanded={gpaOpen}
        class="border-outline ml-1 cursor-pointer rounded-md border px-1 align-[2px] text-[0.625rem] font-bold leading-tight 2xl:text-xs"
        title={chipTitle}
        onclick={handleChipClick}
        onkeydown={handleChipKeydown}
      >
        {profDist.gpa.toFixed(2)}
      </span>
      {#if gpaOpen}
        <GradesPopover heading={instructor} distribution={profDist} slug={profSlug} onclose={() => (gpaOpen = false)} />
      {/if}
    </span>
  {/if}
</div>

<style>
  .stars {
    background: rgb(246, 116, 60);
    background: linear-gradient(
      90deg,
      rgba(246, 116, 60, 1) 0%,
      rgba(246, 116, 60, 1) var(--rating),
      rgba(115, 53, 26, 1) var(--rating),
      rgba(115, 53, 26, 1) 100%
    );

    /* Set the background size and repeat properties. */
    background-size: 100%;
    background-repeat: repeat;

    /* Use the text as a mask for the background. */
    /* This will show the gradient as a text color. */
    background-clip: text;
    -webkit-text-fill-color: transparent;
    -moz-background-clip: text;
    -moz-text-fill-color: transparent;
  }
</style>
