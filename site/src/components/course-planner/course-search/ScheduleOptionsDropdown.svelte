<!-- 
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).

 -->
<script lang="ts">
  import { Dropdown, DropdownItem } from 'flowbite-svelte';
  import { DotsVerticalOutline, TrashBinOutline, FileCopyOutline, PlusOutline } from 'flowbite-svelte-icons';
  import {
    AddCustomEventStore,
    CurrentScheduleStore,
    NonselectedScheduleStore,
  } from '../../../stores/CoursePlannerStores';
  import { uniqueScheduleName } from '$lib/course-planner/ScheduleSelector';

  let dropdownOpen = $state(false);

  // Core operations using modern $store reactive syntax
  function addCustomEvent() {
    dropdownOpen = false;
    AddCustomEventStore.set(true);
  }

  function deleteCurrentSchedule() {
    dropdownOpen = false;

    if ($NonselectedScheduleStore.length > 0) {
      // Create a shallow copy to safely update state without direct mutation side-effects
      const updatedNonselected = [...$NonselectedScheduleStore];
      const nextSchedule = updatedNonselected.shift()!; // Removes and captures first item

      CurrentScheduleStore.set({
        scheduleName: nextSchedule.scheduleName,
        selections: nextSchedule.selections,
      });
      NonselectedScheduleStore.set(updatedNonselected);
    } else {
      CurrentScheduleStore.set({
        scheduleName: 'My schedule',
        selections: [],
      });
    }
  }

  function duplicateSchedule() {
    dropdownOpen = false;

    const currentName = $CurrentScheduleStore.scheduleName;
    const currentSelections = $CurrentScheduleStore.selections;

    const updatedNonselected = [
      { scheduleName: currentName, selections: currentSelections },
      ...$NonselectedScheduleStore,
    ];

    const newName = uniqueScheduleName(currentName, 'Copy of ', updatedNonselected);

    NonselectedScheduleStore.set(updatedNonselected);
    CurrentScheduleStore.set({
      scheduleName: newName,
      selections: currentSelections,
    });
  }

  // JSON configuration array mapping actions and metadata
  const menuItems = [
    { label: 'Add Event', icon: PlusOutline, onclick: addCustomEvent },
    { label: 'Delete', icon: TrashBinOutline, onclick: deleteCurrentSchedule },
    { label: 'Duplicate', icon: FileCopyOutline, onclick: duplicateSchedule },
  ];
</script>

<button class="hover:bg-hover rounded-md px-0.5" title="Schedule options">
  <DotsVerticalOutline class="h-5 w-5" />
</button>

<!-- TEMP FIX: Added "-translate-y-2" to fix dropdown positioning -->
<Dropdown
  class="bg-border text-text-primary border-outline -translate-y-2 list-none rounded-md border shadow-lg"
  bind:isOpen={dropdownOpen}
>
  {#each menuItems as item (item.label)}
    <DropdownItem class="hover:bg-hover flex items-center p-2 text-sm" onclick={item.onclick}>
      <item.icon class="mr-1" height="16" width="16" />
      {item.label}
    </DropdownItem>
  {/each}
</Dropdown>
