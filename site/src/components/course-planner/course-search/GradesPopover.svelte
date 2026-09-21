<!--
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).
Copyright (C) 2026 Andrew Cupps
-->
<script lang="ts">
  import {
    formatSemesterRange,
    hasEnoughForGpa,
    MIN_GRADED_FOR_GPA,
    type GradeDistribution,
  } from '../../../lib/course-planner/Grades';
  import GradeDistributionBars from './GradeDistributionBars.svelte';
  import { resolve } from '$app/paths';

  interface Props {
    /** Professor name or course code shown at the top of the popover */
    heading: string;
    distribution: GradeDistribution;
    /** Instructor slug; when given, the heading links to their page */
    slug?: string;
    /** Called when the popover should close, e.g. on Escape */
    onclose?: () => void;
  }

  let { heading, distribution, slug = undefined, onclose = undefined }: Props = $props();

  /**
   * Where the popover sits horizontally.
   *
   * It wants its right edge aligned with the GPA chip's, growing leftward. What
   * stops that being the whole story is the search results panel: it is
   * `overflow-y-scroll`, and CSS turns the other axis from `visible` into
   * `auto` whenever one axis is not `visible` -- so the panel clips
   * horizontally too, and its scrollbar takes ~10px of that width.
   *
   * This used to be a binary left/right flip decided by whether the popover
   * would land within 8px of the *window's* left edge. Both halves were wrong
   * frames of reference. The panel is not the window -- on a desktop layout it
   * is a ~350px column -- so a popover could sit comfortably inside the window
   * and still be cut off by the panel. And flipping rightward was never checked
   * against anything at all: at a 1100px viewport a flipped popover measured
   * 201px to 441px against a content edge at 354px, so 87px of it was hidden
   * behind and past the scrollbar.
   *
   * So rather than choosing a side, this clamps: take the preferred position,
   * then push it back inside whichever ancestor actually does the clipping.
   * Measured once per open, like the flip it replaces -- a popover that moves
   * while being read is worse than one on the unexpected side -- and safe to
   * measure once because vertical scrolling does not change any of these
   * numbers.
   */
  let popover = $state<HTMLDivElement | undefined>(undefined);
  let leftOffset = $state<number | null>(null);
  let placed = false;

  /** A small gap, so the popover never sits flush against the clipping edge. */
  const EDGE_MARGIN = 4;

  /**
   * The nearest ancestor that clips overflow, which is what actually decides
   * whether this is visible. Found by walking up rather than by naming the
   * panel, so moving the popover somewhere else does not silently reintroduce
   * the bug.
   */
  function clippingAncestor(element: HTMLElement): HTMLElement | null {
    let node = element.parentElement;
    while (node) {
      const style = getComputedStyle(node);
      if (style.overflowX !== 'visible' || style.overflowY !== 'visible') {
        return node;
      }
      node = node.parentElement;
    }
    return null;
  }

  $effect(() => {
    const element = popover;
    if (!element || placed) {
      return;
    }
    placed = true;

    const anchor = element.offsetParent as HTMLElement | null;
    if (anchor === null) {
      return;
    }
    const anchorRect = anchor.getBoundingClientRect();
    const width = element.offsetWidth;

    const clip = clippingAncestor(element);
    // `clientLeft` is the border, and `clientWidth` excludes the scrollbar, so
    // these two are the inside edges of the box that actually clips -- the
    // right one being the edge of the scrollbar rather than of the element.
    const bounds =
      clip === null
        ? { left: 0, right: window.innerWidth }
        : (() => {
            const rect = clip.getBoundingClientRect();
            const inner = rect.left + clip.clientLeft;
            return { left: inner, right: inner + clip.clientWidth };
          })();

    // Preferred: right edge aligned with the chip's. Then pulled inside the
    // right edge, then pushed inside the left -- in that order, so that a
    // container too narrow to fit the popover at all pins it to the left and
    // overflows right, which is the readable half.
    let left = anchorRect.right - width;
    left = Math.min(left, bounds.right - width - EDGE_MARGIN);
    left = Math.max(left, bounds.left + EDGE_MARGIN);

    leftOffset = left - anchorRect.left;
  });

  let semesterRange = $derived(formatSemesterRange(distribution));
  let showGpa = $derived(hasEnoughForGpa(distribution));

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onclose?.();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- `right-0` is the starting position: aligned with the chip, growing leftward.
     The effect above then measures it against whatever ancestor clips overflow
     -- the search results panel, whose scrollbar eats into its own width -- and
     replaces it with a clamped `left`. Hidden for that one frame, so it is
     never painted in the unclamped position. See the note on `leftOffset`. -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
  bind:this={popover}
  style={leftOffset === null ? undefined : `left: ${leftOffset}px; right: auto;`}
  class="border-outline bg-bg-primary text-text-primary absolute top-full z-50 mt-1 w-60 cursor-default rounded-lg border-2 p-2 text-left font-normal normal-case shadow-lg {leftOffset ===
  null
    ? 'invisible right-0'
    : ''}"
  aria-label="Grade distribution for {heading}"
  onclick={(event) => event.stopPropagation()}
>
  <div class="truncate text-xs font-bold">
    {#if slug}
      <a
        href={resolve('/professor/[slug]', { slug })}
        class="hover:underline"
        onclick={(event) => event.stopPropagation()}>{heading}</a
      >
    {:else}
      {heading}
    {/if}
  </div>

  {#if showGpa && distribution.gpa != null}
    <div class="flex flex-row items-baseline gap-1 pb-1">
      <span class="text-lg font-bold">
        {distribution.gpa.toFixed(2)}
      </span>
      <span class="text-text-secondary text-xs">
        avg GPA &middot;
        {distribution.graded.toLocaleString()} graded
      </span>
    </div>
  {:else}
    <!-- A 4.00 computed from three students is noise presented as a fact. -->
    <div class="text-text-secondary pb-1 text-xs">
      Limited data &middot; {distribution.graded.toLocaleString()} graded
      {#if distribution.graded < MIN_GRADED_FOR_GPA}
        <span class="block">Too few students to show an average GPA.</span>
      {/if}
    </div>
  {/if}

  <GradeDistributionBars {distribution} />

  <div class="text-text-secondary mt-1 text-[10px] leading-tight">
    {#if semesterRange != null}
      {semesterRange} &middot;
    {/if}
    Percentages over {distribution.barTotal.toLocaleString()} students including withdrawals; GPA excludes them.
    <span class="block">Grade data from UMD's Office of the Registrar.</span>
  </div>
</div>
