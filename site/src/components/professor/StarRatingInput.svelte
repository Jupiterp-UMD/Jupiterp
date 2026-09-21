<!--
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).
Copyright (C) 2026 Andrew Cupps

A 1-5 half-star rating input.

Built as a native `range` input rather than as ten clickable half-star hit
targets. Half-star targets on a phone are about 16px wide, which is half the
minimum recommended touch target and is the part of a widget like this that
reliably goes wrong; a range input is draggable, arrow-key operable, and
announced correctly by screen readers without any of that being reimplemented.
The stars are painted on top and are decorative.

Submits the decimal, not an index: the API takes 4.5, not 9.
-->
<script lang="ts">
  interface Props {
    value: number;
    id?: string;
  }

  let { value = $bindable(), id = 'rating' }: Props = $props();

  /** Fill fraction for one star position, 0 to 1. */
  function fillOf(position: number): number {
    return Math.max(0, Math.min(1, value - (position - 1)));
  }
</script>

<div class="flex flex-row items-center gap-3">
  <!-- Decorative: the range input below is the accessible control. -->
  <div class="flex flex-row gap-0.5" aria-hidden="true">
    {#each [1, 2, 3, 4, 5] as position (position)}
      <span class="relative inline-block text-2xl leading-none">
        <span class="text-border">★</span>
        <span style="width: {fillOf(position) * 100}%" class="text-orange absolute left-0 top-0 overflow-hidden">
          ★
        </span>
      </span>
    {/each}
  </div>

  <output class="w-16 text-sm font-bold" for={id}>
    {value.toFixed(1)} / 5
  </output>
</div>

<input
  {id}
  type="range"
  min="1"
  max="5"
  step="0.5"
  bind:value
  class="accent-orange w-48 max-w-full"
  aria-label="Rating, 1 to 5 stars in half steps"
  aria-valuetext="{value.toFixed(1)} out of 5"
/>
