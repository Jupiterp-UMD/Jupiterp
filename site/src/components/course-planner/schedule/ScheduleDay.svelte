<!-- 
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).

-->
<script lang="ts">
  import type { ClassMeetingExtended } from '../../../types';
  import ClassMeeting from './ClassMeeting.svelte';

  interface Props {
    name: string;
    classes: ClassMeetingExtended[];
    earliestClassStart?: number;
    latestClassEnd?: number;
    bgHeight?: number;
    /**
     * "Other" for the column holding meetings with no real classtime
     * (TBA, OnlineAsync, ...), which are laid out stacked rather than
     * positioned by time. "Day" for the five weekday columns.
     */
    type?: string;
  }

  let {
    name,
    classes,
    earliestClassStart = $bindable(0),
    latestClassEnd = $bindable(0),
    bgHeight = $bindable(0),
    type = 'Day',
  }: Props = $props();
</script>

<div class="z-10 flex h-full w-full flex-col px-1">
  <div>{name}</div>
  <div style="height: {bgHeight}px;" class="relative top-2.5 text-black">
    {#each classes as classMeeting, index (`${index}-${classMeeting.instructors}`)}
      <ClassMeeting meeting={classMeeting} isInOther={type === 'Other'} {earliestClassStart} {latestClassEnd} />
    {/each}
  </div>
</div>
