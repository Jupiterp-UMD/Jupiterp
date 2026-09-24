<!--
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).
Copyright (C) 2026 Andrew Cupps

Read-only 0-5 star display, partially filling the last star (4.3 fills 30% of
the fifth). Decorative: always shown next to the number, which carries the
value for screen readers.
-->
<script lang="ts">
  interface Props {
    value: number;
    size?: string;
  }

  let { value, size = 'text-base' }: Props = $props();

  function fillOf(position: number): number {
    return Math.max(0, Math.min(1, value - (position - 1)));
  }
</script>

<span class="inline-flex flex-row gap-0.5 {size}" aria-hidden="true">
  {#each [1, 2, 3, 4, 5] as position (position)}
    <span class="relative inline-block leading-none">
      <span class="text-outline">★</span>
      <span style="width: {fillOf(position) * 100}%" class="text-orange absolute left-0 top-0 overflow-hidden">★</span>
    </span>
  {/each}
</span>
