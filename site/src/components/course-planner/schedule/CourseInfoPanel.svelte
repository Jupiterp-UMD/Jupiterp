<!--
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).

-->
<script lang="ts">
  import type { CourseBasic, Section } from '@jupiterp/jupiterp';
  import { ArrowUpRightFromSquareOutline, CloseOutline } from 'flowbite-svelte-icons';
  import { formatCredits, testudoLink } from '../../../lib/course-planner/Formatting';
  import InstructorListing from '../course-search/InstructorListing.svelte';
  import MeetingListing from '../course-search/MeetingListing.svelte';
  import CourseCondition from '../course-search/CourseCondition.svelte';

  interface Props {
    course: CourseBasic;
    section: Section;
    onclose: () => void;
  }

  let { course, section, onclose }: Props = $props();

  // Descriptions past this length start clamped, with a toggle to expand.
  const DESCRIPTION_CLAMP_CHARS = 240;

  const headingId = $derived(`course-info-${course.courseCode}-${section.sectionCode}`);

  // Timed meetings first, then untimed ones. Untimed meetings are bare strings
  // like 'OnlineAsync' and repeat once per timed meeting in some sections, so
  // duplicates are dropped; they carry no information beyond the first.
  const meetings = $derived.by(() => {
    const timed = section.meetings.filter((m) => typeof m !== 'string');
    const untimed = [...new Set(section.meetings.filter((m) => typeof m === 'string'))];
    return [...timed, ...untimed];
  });

  const genEds = $derived(course.genEds ?? []);
  const conditions = $derived(course.conditions ?? []);
  const isFull = $derived(section.openSeats === 0);

  const descriptionIsLong = $derived((course.description?.length ?? 0) > DESCRIPTION_CLAMP_CHARS);
  let descriptionExpanded = $state(false);

  function handleWindowKeydown(event: KeyboardEvent) {
    // Popovers inside the panel (e.g. the GPA chip) stop propagation on
    // Escape, so this only fires when nothing nested wanted it.
    if (event.key === 'Escape') {
      onclose();
    }
  }
</script>

<svelte:window onkeydown={handleWindowKeydown} />

<section aria-labelledby={headingId} class="flex flex-col gap-3 p-3 text-left 2xl:p-4">
  <!-- Header: identity on the left, actions on the right -->
  <header class="flex items-start gap-2">
    <div class="min-w-0 grow">
      <h2 id={headingId} class="text-lg leading-tight 2xl:text-xl">
        <span class="font-bold">{course.courseCode}</span>
        <span class="text-text-secondary font-normal">{course.name}</span>
      </h2>

      <ul class="mt-1.5 flex flex-wrap gap-1.5 text-xs font-medium 2xl:text-sm" aria-label="Course details">
        <li class="chip">{formatCredits(course.minCredits, course.maxCredits)} credits</li>
        <li class="chip">Section {section.sectionCode}</li>
        {#each genEds as genEd (genEd.code)}
          <li class="chip" title={genEd.name}>
            <span class="sr-only">GenEd: </span>{genEd.code}
          </li>
        {/each}
        {#if section.totalSeats > 0}
          <li
            class="chip"
            class:seats-open={!isFull}
            class:seats-full={isFull}
            title={section.holdfile != null ? `Holdfile: ${section.holdfile}` : undefined}
          >
            {#if isFull}
              Full · {section.waitlist} waitlisted
            {:else}
              {section.openSeats} / {section.totalSeats} seats open
            {/if}
          </li>
        {/if}
      </ul>
    </div>

    <a
      href={testudoLink(course.courseCode)}
      rel="external noopener noreferrer"
      target="_blank"
      class="border-outline text-orange hover:bg-hover inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-sm"
    >
      Testudo
      <ArrowUpRightFromSquareOutline class="h-3.5 w-3.5" aria-hidden="true" />
      <span class="sr-only">(opens in new tab)</span>
    </a>
    <button
      type="button"
      class="hover:bg-hover shrink-0 rounded-md p-1"
      onclick={onclose}
      aria-label="Close course info"
      title="Close (Esc)"
    >
      <CloseOutline class="h-5 w-5" aria-hidden="true" />
    </button>
  </header>

  <!-- Body: logistics in a narrow column, prose in a wide one -->
  <div class="grid gap-x-6 gap-y-3 md:grid-cols-[minmax(14rem,22rem)_1fr]">
    <div class="flex flex-col gap-3">
      <div>
        <h3 class="panel-label">{section.instructors.length === 1 ? 'Instructor' : 'Instructors'}</h3>
        <!-- Keyed by index: instructor names are not guaranteed unique, and a
             duplicate key is fatal in Svelte 5. -->
        {#each section.instructors as instructor, i (i)}
          <InstructorListing
            {instructor}
            slug={section.instructorSlugs?.[i]}
            courseCode={course.courseCode}
            profsHover={false}
            removeHoverSection={() => {}}
          />
        {/each}
      </div>

      <div>
        <h3 class="panel-label">Meetings</h3>
        <div class="flex flex-col gap-0.5">
          {#each meetings as meeting, i (i)}
            <MeetingListing {meeting} locationHover={false} removeHoverSection={() => {}} />
          {/each}
        </div>
      </div>
    </div>

    <div class="flex flex-col gap-3">
      {#if course.description != null}
        <div>
          <h3 class="panel-label">Description</h3>
          <p
            class="max-w-prose text-sm leading-relaxed 2xl:text-base"
            class:line-clamp-3={descriptionIsLong && !descriptionExpanded}
          >
            {course.description}
          </p>
          {#if descriptionIsLong}
            <button
              type="button"
              class="text-orange mt-0.5 text-xs underline 2xl:text-sm"
              aria-expanded={descriptionExpanded}
              onclick={() => (descriptionExpanded = !descriptionExpanded)}
            >
              {descriptionExpanded ? 'Show less' : 'Show more'}
            </button>
          {/if}
        </div>
      {/if}

      {#if conditions.length > 0}
        <div class="text-sm 2xl:text-base">
          <!-- Keyed by index: conditions are not guaranteed unique. -->
          {#each conditions as condition, i (i)}
            <CourseCondition {condition} />
          {/each}
        </div>
      {/if}
    </div>
  </div>
</section>

<style>
  .chip {
    border: 1px solid var(--color-outline);
    border-radius: 9999px;
    padding: 0.125rem 0.5rem;
    white-space: nowrap;
  }

  .seats-open {
    border-color: color-mix(in srgb, var(--color-success) 50%, transparent);
    color: var(--color-success);
  }

  .seats-full {
    border-color: color-mix(in srgb, var(--color-danger) 50%, transparent);
    color: var(--color-danger);
  }

  .panel-label {
    margin-bottom: 0.25rem;
    font-size: 0.6875rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--color-text-secondary);
  }
</style>
