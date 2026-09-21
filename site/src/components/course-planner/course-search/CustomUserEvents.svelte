<!-- 
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).

-->
<script lang="ts">
  import { AddCustomEventStore, CurrentScheduleStore, EventEditStore } from '../../../stores/CoursePlannerStores';
  import type { ScheduleBlock, UserEvent } from '../../../types';
  import UserEventModal from './UserEventModal.svelte';
  import { firstAvailableColor } from '$lib/course-planner/ColorSelector';

  let showCustomEventModal = $state(false);
  $effect(() => {
    return AddCustomEventStore.subscribe((val) => {
      showCustomEventModal = val;
    });
  });

  // get selections and user events from store
  let selectionsList: ScheduleBlock[] = $state([]);
  let scheduleName: string = $state('');
  $effect(() => {
    return CurrentScheduleStore.subscribe((stored) => {
      selectionsList = stored.selections;
      scheduleName = stored.scheduleName;
    });
  });

  let eventEditVal: { eventId: string } | null = $state(null);
  $effect(() => {
    return EventEditStore.subscribe((val) => {
      eventEditVal = val;
    });
  });

  let editEventData: UserEvent | null = $derived(
    eventEditVal
      ? (selectionsList.find((s) => !('course' in s) && s.id === eventEditVal!.eventId) as UserEvent) || null
      : null
  );

  // function to add user event from UserEventModal
  function addUserEvent(event: UserEvent) {
    const existingIndex = selectionsList.findIndex((s) => !('course' in s) && s.id === event.id);
    let updatedSelections: ScheduleBlock[];
    if (existingIndex !== -1) {
      // Edit: preserve color and replace in-place
      event.colorNumber = selectionsList[existingIndex].colorNumber;
      updatedSelections = [...selectionsList];
      updatedSelections[existingIndex] = event;
    } else {
      // New: assign next available color and append
      event.colorNumber = firstAvailableColor(selectionsList);
      updatedSelections = [...selectionsList, event];
    }
    CurrentScheduleStore.set({ scheduleName, selections: updatedSelections });
    showCustomEventModal = false;
    AddCustomEventStore.set(false);
    EventEditStore.set(null);
  }
</script>

{#if showCustomEventModal}
  <UserEventModal
    onClose={() => {
      showCustomEventModal = false;
      AddCustomEventStore.set(false);
    }}
    onSubmit={(event) => addUserEvent(event)}
  />
{/if}

{#if eventEditVal !== null}
  <UserEventModal
    onClose={() => EventEditStore.set(null)}
    onSubmit={(event) => addUserEvent(event)}
    initialEventData={editEventData}
  />
{/if}
