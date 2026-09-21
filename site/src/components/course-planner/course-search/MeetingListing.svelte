<!-- 
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).

-->
<script lang="ts">
  import type { ClassMeeting } from '@jupiterp/jupiterp';
  import { formatClassDayTime, formatLocation } from '../../../lib/course-planner/Formatting';

  interface Props {
    meeting: ClassMeeting;
    locationHover: boolean;
    removeHoverSection: () => void;
    condensed?: boolean;
  }

  // eslint-disable-next-line no-useless-assignment
  let { meeting, locationHover = $bindable(), removeHoverSection, condensed = false }: Props = $props();

  function handleLinkClick(event: MouseEvent) {
    // Prevent the event from propagating to the button
    event.stopPropagation();
  }

  function generateMapURL(location: string): string {
    // format-check exempt 1
    return (
      'https://maps.umd.edu/map/index.html?defaultpopups=false&Nav=hide&hidemenu=true&MapView=Simple&LocationType=Building&LocationName=' +
      location
    );
  }
</script>

<div class="flex w-full flex-row text-xs font-medium 2xl:text-base">
  {#if typeof meeting === 'string'}
    {meeting}
  {:else}
    <!-- Classtime -->
    <span class:grow={!condensed}>
      {formatClassDayTime(meeting.classtime)}
    </span>

    <!-- Location -->
    <span class:grow={!condensed} class:text-right={!condensed}>
      {#if condensed}&nbsp;in
      {/if}
      {#if meeting.location.building.length !== 3 || meeting.location.room == null}
        <span class="pr-0.5">
          {formatLocation(meeting.location)}
        </span>
      {:else}
        <a
          href={generateMapURL(meeting.location.building)}
          rel="external noopener noreferrer"
          class="text-orange hover:bg-hover rounded-md p-0.5 underline"
          onmouseenter={() => {
            locationHover = true; // Fixed: Mutates the property directly on the object
            removeHoverSection();
          }}
          onmouseleave={() => {
            locationHover = false; // Fixed: Mutates the property directly on the object
            removeHoverSection();
          }}
          onclick={handleLinkClick}
          target="_blank"
          title="View on UMD Map"
        >
          {formatLocation(meeting.location)}
        </a>
      {/if}
    </span>
  {/if}
</div>
