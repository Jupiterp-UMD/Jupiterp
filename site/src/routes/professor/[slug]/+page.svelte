<!--
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).
Copyright (C) 2026 Andrew Cupps

A thin wrapper: metadata, chrome, and ProfessorPanel. Everything that renders
the professor is in the panel, which the planner's modal shows too.
-->
<script lang="ts">
  import ProfessorPanel from '../../../components/professor/ProfessorPanel.svelte';
  import { hasEnoughForGpa } from '../../../lib/course-planner/Grades';
  import { ratingBreakdown } from '../../../lib/professor/ProfessorData';
  import { resolve } from '$app/paths';
  import type { PageData } from './$types';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();

  let professor = $derived(data.professor);
  let rating = $derived(ratingBreakdown(professor.instructor));

  let title = $derived(`${professor.instructor.name} — UMD grades and ratings | Jupiterp`);

  let description = $derived.by(() => {
    const parts: string[] = [];
    const overall = professor.overall;
    if (overall !== null && hasEnoughForGpa(overall) && overall.gpa !== null) {
      parts.push(`Average GPA ${overall.gpa.toFixed(2)} across ${overall.graded.toLocaleString()} graded students`);
    }
    if (professor.courses.length > 0) {
      parts.push(`${professor.courses.length} courses at the University of Maryland`);
    }
    if (rating.displayable && rating.combined !== null) {
      parts.push(`rated ${rating.combined.toFixed(1)} out of 5`);
    }
    return parts.length > 0
      ? `${professor.instructor.name}: ${parts.join(', ')}.`
      : `Grade distributions and ratings for ${professor.instructor.name} at the University of Maryland.`;
  });

  /**
   * Structured data, so a search result can show the rating.
   *
   * `aggregateRating` is only emitted when there is a rating worth standing
   * behind. Claiming one built on a single review is the kind of thing that
   * gets structured data ignored altogether.
   */
  let jsonLd = $derived.by(() => {
    const person: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: professor.instructor.name,
      jobTitle: 'Instructor',
      worksFor: {
        '@type': 'CollegeOrUniversity',
        name: 'University of Maryland',
      },
    };
    if (rating.displayable && rating.combined !== null) {
      person.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: rating.combined,
        bestRating: 5,
        worstRating: 1,
        ratingCount: rating.jupiterpCount + rating.planetterpCount,
      };
    }
    // Escape `<` as its unicode form.
    //
    // JSON.stringify escapes quotes and backslashes but not angle brackets, so
    // an instructor name containing a closing script tag would otherwise end
    // the element and let whatever followed it execute. The name comes from
    // Testudo and
    // the registrar rather than from a user, but it is still data crossing
    // into a script context, and `<` is valid inside a JSON string, so
    // the parsed structured data is unchanged.
    return JSON.stringify(person).replaceAll('<', '\\u003c');
  });

  const LD_OPEN = '<script type="application/ld+json">';
  // Assembled rather than written literally: a closing script tag written out
  // in full would end this component's own script block where the compiler
  // scans for it, even inside a string.
  const LD_CLOSE = '</' + 'script>';
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />

  <meta property="og:type" content="profile" />
  <meta property="og:title" content="{professor.instructor.name} | Jupiterp" />
  <meta property="og:description" content={description} />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="{professor.instructor.name} | Jupiterp" />
  <meta name="twitter:description" content={description} />

  <!-- Structured data has to reach the page as a script element. The `<`
       characters are escaped above, so a name cannot break out of it. -->
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html LD_OPEN + jsonLd + LD_CLOSE}
</svelte:head>

<!--
  `fixed top-12 bottom-0` with its own `overflow-y-auto`, matching every other
  document page on the site (/about, /changelog, the policies).

  It is not optional styling. `body` is `height: 100svh; overflow-y: clip` so
  the planner occupies exactly one viewport and never scrolls, which means a
  page that scrolls has to own its scroll container. Without this the professor
  page was clipped at the fold with no way to reach the rest -- the grade
  history, the reviews, and the review form were all rendered and all
  unreachable -- and `top-12` is what keeps the first line out from under the
  fixed header.
-->
<main class="custom-scrollbar fixed inset-x-0 bottom-0 top-12 overflow-y-auto">
  <div class="mx-auto w-full max-w-3xl px-4 py-6">
    <nav class="text-text-secondary pb-4 text-sm">
      <a href={resolve('/professors')} class="text-orange underline">All professors</a>
    </nav>

    <ProfessorPanel data={professor} headingLevel={1} />
  </div>
</main>
