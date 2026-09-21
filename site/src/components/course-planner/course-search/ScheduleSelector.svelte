<!-- 
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).
Copyright (C) 2026 Andrew Cupps
-->
<script lang="ts">
  import { onMount } from 'svelte';

  import { AngleRightOutline, PlusOutline, ForwardOutline, TrashBinOutline } from 'flowbite-svelte-icons';
  import { CurrentScheduleStore, NonselectedScheduleStore } from '../../../stores/CoursePlannerStores';
  import ScheduleOptionsDropdown from './ScheduleOptionsDropdown.svelte';
  import { slide } from 'svelte/transition';
  import { deleteNonselectedSchedule, uniqueScheduleName } from '$lib/course-planner/ScheduleSelector';
  import type { ScheduleBlock, StoredSchedule } from '../../../types';
  import PopupShare from './PopupShare.svelte';

  let dropdownOpen: boolean = $state(false);
  let sharePopUpOpen: boolean = $state(false);

  let currentScheduleName: string = $state('');
  let currentScheduleSelections: ScheduleBlock[];

  $effect(() => {
    return CurrentScheduleStore.subscribe((stored) => {
      currentScheduleName = stored.scheduleName;
      currentScheduleSelections = stored.selections;
    });
  });

  function changeScheduleName() {
    const inputScheduleName = scheduleNameElement?.value ?? '';
    if (inputScheduleName.trim().length > 0) {
      currentScheduleName = uniqueScheduleName(inputScheduleName, 'New ', nonselectedSchedules);
      CurrentScheduleStore.set({
        scheduleName: currentScheduleName,
        selections: currentScheduleSelections,
      });
    } else {
      currentScheduleName = uniqueScheduleName('New schedule', 'New ', nonselectedSchedules);
      CurrentScheduleStore.set({
        scheduleName: currentScheduleName,
        selections: currentScheduleSelections,
      });
    }
  }

  let scheduleNameElement: HTMLInputElement | null = $state(null);

  $effect(() => {
    if (currentScheduleName && scheduleNameElement) {
      scheduleNameElement.value = currentScheduleName;
    }
  });

  let nonselectedSchedules: StoredSchedule[] = $state([]);
  $effect(() => {
    return NonselectedScheduleStore.subscribe((stored) => {
      nonselectedSchedules = stored;
    });
  });

  let containerElement: HTMLDivElement | null = null;
  onMount(() => {
    const handleDocumentMouseDown = (event: MouseEvent) => {
      if (dropdownOpen && containerElement && !containerElement.contains(event.target as Node)) {
        dropdownOpen = false;
      }
    };

    document.addEventListener('mousedown', handleDocumentMouseDown);
    return () => {
      document.removeEventListener('mousedown', handleDocumentMouseDown);
    };
  });

  function changeSchedule(newSchedule: StoredSchedule) {
    const index = nonselectedSchedules.indexOf(newSchedule);
    if (index === -1) {
      // This should not be possible
      console.log('Could not find schedule: ' + newSchedule.scheduleName);
    } else {
      const scheduleToReplace: StoredSchedule = {
        scheduleName: currentScheduleName,
        selections: currentScheduleSelections,
      };
      nonselectedSchedules.splice(index, 1);
      nonselectedSchedules = [scheduleToReplace, ...nonselectedSchedules];
      currentScheduleName = newSchedule.scheduleName;
      currentScheduleSelections = newSchedule.selections;

      CurrentScheduleStore.set({
        scheduleName: currentScheduleName,
        selections: currentScheduleSelections,
      });

      NonselectedScheduleStore.set(nonselectedSchedules);
    }
  }

  function createNewSchedule() {
    const oldSchedule: StoredSchedule = {
      scheduleName: currentScheduleName,
      selections: currentScheduleSelections,
    };
    nonselectedSchedules = [oldSchedule, ...nonselectedSchedules];
    NonselectedScheduleStore.set(nonselectedSchedules);
    currentScheduleName = uniqueScheduleName('New schedule', 'New ', nonselectedSchedules);
    currentScheduleSelections = [];
    CurrentScheduleStore.set({
      scheduleName: currentScheduleName,
      selections: currentScheduleSelections,
    });
  }
</script>

<div bind:this={containerElement} class="flex w-full flex-col">
  <div class="2xl:text-md flex w-full flex-row pb-1 text-sm" title="Toggle schedule dropdown">
    <div class="hover:bg-hover flex grow flex-row justify-start rounded-md py-1 pr-1 text-left">
      <button
        title="Show other schedules"
        class:rotate-90={dropdownOpen}
        class="-my-1 origin-center p-1"
        onclick={() => (dropdownOpen = !dropdownOpen)}
      >
        <AngleRightOutline class="h-4 w-4" />
      </button>

      <input
        bind:this={scheduleNameElement}
        id="schedule-name-input"
        contenteditable="true"
        onblur={changeScheduleName}
        title="Schedule name"
        class="2xl:text-md bg-bg-primary outline-hidden grow rounded-sm border-none px-0.5 py-0 text-sm"
      />
    </div>
    <ScheduleOptionsDropdown />
    <button class="hover:bg-hover rounded-md px-1" title="Create new schedule" onclick={createNewSchedule}>
      <PlusOutline class="h-4 w-4" />
    </button>
    <button
      class="hover:bg-hover rounded-md px-1"
      title="Export schedule"
      onclick={() => (sharePopUpOpen = !sharePopUpOpen)}
    >
      <ForwardOutline class="h-4 w-4" />
    </button>
  </div>
  {#if dropdownOpen}
    <!-- in: and out: instead of transition: due to lag when closing dropdown if some schedule are deleted -->
    <div class="w-full pb-0.5 pl-4 pr-6" in:slide out:slide>
      {#each nonselectedSchedules as schedule (schedule.scheduleName)}
        <div class="flex h-6 w-full flex-row">
          <button
            class="hover:bg-hover h-6 min-w-0 grow items-center rounded-md pl-1.5 text-left text-sm"
            title={'Switch to ' + schedule.scheduleName}
            onclick={() => changeSchedule(schedule)}
          >
            <span class="no-scrollbar block w-full min-w-0 overflow-x-auto whitespace-nowrap">
              {schedule.scheduleName}
            </span>
          </button>
          <button
            class="hover:bg-hover flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
            title={'Delete ' + schedule.scheduleName}
            onclick={() => deleteNonselectedSchedule(schedule, nonselectedSchedules)}
          >
            <TrashBinOutline class="h-4 w-4" />
          </button>
        </div>
      {/each}
    </div>
  {/if}

  {#if sharePopUpOpen}
    <PopupShare onCloseExport={() => (sharePopUpOpen = false)} />
  {/if}
</div>
