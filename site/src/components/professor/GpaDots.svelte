<!--
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).
Copyright (C) 2026 Andrew Cupps
-->
<script lang="ts">
  import { resolve } from '$app/paths';
  import { courseQuery } from '../../lib/professor/ProfessorData';
  import { groupGpaDots, type ProfessorGpa } from '../../lib/professor/Comparison';

  interface Props {
    professors: ProfessorGpa[];
    courseCode: string | null;
    markers: { gpa: number; label?: string; name?: string; color?: string }[];
    mean: number | null;
    meanLabel?: string;
    min?: number;
    showMidpoint?: boolean;
  }

  let {
    professors,
    courseCode,
    markers,
    mean,
    meanLabel = "Other instructors' average",
    min = 2,
    showMidpoint = false,
  }: Props = $props();
  const detailsId = $props.id();
  let scaleWidth = $state(0);
  let scaleRoot: HTMLDivElement;
  let openGroup = $state<string | null>(null);
  let groups = $derived(groupGpaDots(professors, scaleWidth || 320, min));
  let activeGroup = $derived(groups.find((group) => group.professors[0].slug === openGroup));

  function pos(value: number) {
    return Math.max(0, Math.min(100, ((value - min) / (4 - min)) * 100));
  }

  function tooltipLeft(gpa: number) {
    const width = Math.min(224, scaleWidth);
    const center = (pos(gpa) / 100) * scaleWidth;
    return Math.max(0, Math.min(scaleWidth - width, center - width / 2)) - center + 8;
  }

  $effect(() => {
    void courseCode;
    void professors;
    openGroup = null;
  });
</script>

<svelte:window
  onpointerdown={(event) => {
    if (openGroup && scaleRoot && !scaleRoot.contains(event.target as Node)) openGroup = null;
  }}
  onkeydown={(event) => {
    if (event.key === 'Escape' && openGroup && scaleRoot?.contains(document.activeElement)) {
      const marker = document.getElementById(`${detailsId}-${openGroup}`);
      openGroup = null;
      marker?.focus();
    }
  }}
/>

<div bind:this={scaleRoot} class="flex flex-col gap-2" role="group" aria-label="Professor GPA comparison">
  <div>
    <div bind:clientWidth={scaleWidth} class="gpa-scale relative h-7">
      <div class="scale-track bg-outline top-3.25 absolute inset-x-0 h-0.5 rounded"></div>

      {#each professors as other (other.slug)}
        <a
          href="{resolve('/professor/[slug]', { slug: other.slug })}{courseQuery(courseCode)}"
          data-sveltekit-preload-data="off"
          style:left={`${pos(other.gpa)}%`}
          class="desktop-dot group/dot focus-visible:outline-orange absolute top-1.5 -ml-2 flex h-4 w-4 items-center justify-center rounded-full hover:z-20 focus-visible:z-20 focus-visible:outline-2 focus-visible:outline-offset-2"
          aria-label={`${other.name}: ${other.gpa.toFixed(2)} average GPA in ${courseCode}. View professor.`}
        >
          <span
            class="border-text-secondary bg-bg-secondary group-hover/dot:border-orange group-focus-visible/dot:border-orange h-3 w-3 rounded-full border-2"
          ></span>
          <span
            aria-hidden="true"
            style:left={`${tooltipLeft(other.gpa)}px`}
            style:width={`${Math.min(224, scaleWidth)}px`}
            class="bg-text-primary text-bg-primary pointer-events-none invisible absolute bottom-full mb-2 rounded-lg px-3 py-2 text-center text-sm opacity-0 shadow-lg group-hover/dot:visible group-hover/dot:opacity-100 group-focus-visible/dot:visible group-focus-visible/dot:opacity-100"
          >
            <span class="block font-semibold">{other.name}</span>
            <span class="block">{other.gpa.toFixed(2)} average GPA</span>
          </span>
        </a>
      {/each}
      <div class="touch-dots">
        {#each groups as group (group.professors[0].slug)}
          {@const key = group.professors[0].slug}
          <button
            type="button"
            id={`${detailsId}-${key}`}
            aria-expanded={openGroup === key}
            aria-controls={openGroup === key ? detailsId : undefined}
            aria-label={group.professors.length === 1
              ? `Show ${group.professors[0].name}, ${group.gpa.toFixed(2)} GPA`
              : `Show ${group.professors.length} professors near ${group.gpa.toFixed(2)} GPA`}
            class="focus-visible:outline-orange group absolute top-0 z-10 flex h-11 w-11 -translate-x-1/2 items-center justify-center rounded-full focus-visible:outline-2"
            style:left={`clamp(22px, ${pos(group.gpa)}%, calc(100% - 22px))`}
            onclick={() => (openGroup = openGroup === key ? null : key)}
          >
            <span
              class="border-text-secondary bg-bg-secondary flex h-6 min-w-6 items-center justify-center rounded-full border-2 px-1 text-xs font-bold"
              class:border-orange={openGroup === key}
            >
              {group.professors.length === 1 ? '·' : group.professors.length}
            </span>
            <span class="bg-outline pointer-events-none absolute top-8 h-2.5 w-px" aria-hidden="true"></span>
          </button>
        {/each}
      </div>
      {#if mean !== null}
        <div
          style="left: {pos(mean)}%"
          class="mean-marker bg-text-primary pointer-events-none absolute top-0.5 -ml-px h-6 w-0.5"
          title={`${meanLabel}: ${mean.toFixed(2)}`}
        ></div>
      {/if}
      {#each markers as marker, index (index)}
        <div
          style:left={`${pos(marker.gpa)}%`}
          style:background={marker.color ?? 'var(--orange)'}
          class="active-marker top-1.25 h-4.5 w-4.5 pointer-events-none absolute flex -translate-x-1/2 items-center justify-center rounded-full text-xs font-bold text-black"
          class:numbered={marker.label !== undefined}
          title={marker.name}
        >
          {marker.label ?? ''}
        </div>
      {/each}
    </div>
    <div class="text-text-secondary flex flex-row justify-between text-sm">
      <span>{min.toFixed(1)}</span>
      {#if showMidpoint}<span>{((min + 4) / 2).toFixed(1)}</span>{/if}
      <span>4.0</span>
    </div>
  </div>
  {#if activeGroup}
    <section
      id={detailsId}
      aria-label="Professors at this marker"
      class="touch-dots border-outline bg-bg-primary rounded-lg border p-3 shadow-lg"
    >
      <div class="mb-2 flex items-center justify-between gap-2">
        <h3 class="text-sm font-semibold">
          {activeGroup.professors.length === 1 ? 'Professor' : `${activeGroup.professors.length} professors`}
        </h3>
        <button
          type="button"
          aria-label="Close professor list"
          class="text-text-secondary px-2 py-1"
          onclick={() => {
            document.getElementById(`${detailsId}-${openGroup}`)?.focus();
            openGroup = null;
          }}>×</button
        >
      </div>
      <ul class="custom-scrollbar max-h-56 space-y-1 overflow-y-auto">
        {#each activeGroup.professors as professor (professor.slug)}
          <li>
            <a
              href="{resolve('/professor/[slug]', { slug: professor.slug })}{courseQuery(courseCode)}"
              data-sveltekit-preload-data="off"
              class="hover:bg-hover focus-visible:outline-orange flex min-h-11 items-center justify-between gap-3 rounded-md px-2 py-2 text-sm"
            >
              <span class="text-orange min-w-0">{professor.name}</span>
              <span class="shrink-0">{professor.gpa.toFixed(2)} GPA →</span>
            </a>
          </li>
        {/each}
      </ul>
    </section>
  {/if}
</div>

<style>
  .numbered {
    width: 1.4rem;
    height: 1.4rem;
    top: 2px;
    border: 2px solid var(--bg-primary);
  }
  .touch-dots {
    display: none;
  }
  @media (hover: none), (pointer: coarse) {
    .desktop-dot {
      display: none;
    }
    .touch-dots {
      display: block;
    }
    .gpa-scale {
      height: 3.5rem;
    }
    .scale-track {
      top: 42px;
    }
    .mean-marker {
      top: 30px;
    }
    .active-marker {
      top: 33px;
    }
    .numbered {
      top: 31px;
    }
  }
</style>
