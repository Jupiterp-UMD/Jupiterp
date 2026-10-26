<!-- 
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).

-->
<script lang="ts">
  import type { Section } from '@jupiterp/jupiterp';

  interface Props {
    section: Section;
  }

  let { section }: Props = $props();
</script>

{#if section.totalSeats > 0}
  <div class="pb-1 text-[0.625rem] font-medium xl:text-xs 2xl:text-sm">
    <span class="block whitespace-nowrap">{section.openSeats} / {section.totalSeats} seats available</span>
    {#if section.openSeats == 0}
      Waitlist: {section.waitlist}
    {/if}
    {#if section.holdfile != null}
      Holdfile: {section.holdfile}
    {/if}
  </div>
{/if}
