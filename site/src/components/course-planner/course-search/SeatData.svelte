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
  <div class="flex w-full flex-row pb-1 text-xs font-medium 2xl:text-base">
    {section.openSeats} / {section.totalSeats} seats available
    <br />
    {#if section.openSeats == 0}
      Waitlist: {section.waitlist}
    {/if}
    {#if section.holdfile != null}
      <br />
      Holdfile: {section.holdfile}
    {/if}
  </div>
{/if}
