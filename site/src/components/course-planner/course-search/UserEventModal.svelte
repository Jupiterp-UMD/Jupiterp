<!--
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).

-->
<script lang="ts">
  import type { UserEvent } from '../../../types';
  import EventTimeInput from './EventTimeInput.svelte';

  interface Props {
    onClose: () => void;
    onSubmit: (event: UserEvent) => void | Promise<void>;
    initialEventData?: UserEvent | null;
  }

  let { onClose, onSubmit, initialEventData = null }: Props = $props();

  const DAYS = ['M', 'Tu', 'W', 'Th', 'F'];

  let name = $state('');
  let selectedDays: string[] = $state([]);
  let startTime = $state('');
  let endTime = $state('');
  let location = $state('');
  let notes = $state('');
  let errors: string[] = $state([]);
  let isSubmitting = $state(false);

  let lastChanged: 'start' | 'end' | null = null;

  $effect(() => {
    if (initialEventData) {
      name = initialEventData.name;
      selectedDays = initialEventData.days;
      startTime = decimalToTimeString(initialEventData.startTime);
      endTime = decimalToTimeString(initialEventData.endTime);
      location = initialEventData.location;
      notes = initialEventData.notes;
    }
  });

  $effect(() => {
    if (
      startTime &&
      endTime &&
      lastChanged === 'start' &&
      timeStringToDecimal(startTime) >= timeStringToDecimal(endTime)
    ) {
      endTime = addHour(startTime, 1);
    }
  });

  $effect(() => {
    if (
      startTime &&
      endTime &&
      lastChanged === 'end' &&
      timeStringToDecimal(startTime) >= timeStringToDecimal(endTime)
    ) {
      startTime = addHour(endTime, -1);
    }
  });

  function timeStringToDecimal(timeStr: string): number {
    if (!timeStr.includes(':')) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours + minutes / 60;
  }

  function decimalToTimeString(decimal: number): string {
    const hours = Math.floor(decimal);
    const minutes = Math.round((decimal - hours) * 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  function handleTimeInput(type: 'start' | 'end', value: string) {
    lastChanged = type;
    if (type === 'start') {
      startTime = value;
    } else {
      endTime = value;
    }
  }

  function addHour(timeStr: string, delta: number): string {
    let decimal = timeStringToDecimal(timeStr) + delta;
    if (decimal < 0) decimal = 0;
    if (decimal > 24) decimal = 24;
    return decimalToTimeString(decimal);
  }

  function toggleDay(day: string) {
    if (selectedDays.includes(day)) {
      selectedDays = selectedDays.filter((d) => d !== day);
    } else {
      selectedDays = [...selectedDays, day];
    }
  }

  function expandDayString(day: string): string {
    switch (day) {
      case 'M':
        return 'Monday';
      case 'Tu':
        return 'Tuesday';
      case 'W':
        return 'Wednesday';
      case 'Th':
        return 'Thursday';
      case 'F':
        return 'Friday';
      default:
        return day;
    }
  }

  async function handleSubmit() {
    if (isSubmitting) return;

    errors = [];
    if (!name.trim()) errors.push('Name is required');
    if (selectedDays.length === 0) errors.push('Select at least one day');
    if (!startTime) errors.push('Start time is required');
    if (!endTime) errors.push('End time is required');
    if (startTime && endTime && timeStringToDecimal(startTime) >= timeStringToDecimal(endTime)) {
      errors.push('End time must be after start time');
    }

    if (errors.length > 0) return;

    isSubmitting = true;

    const event: UserEvent = {
      id: initialEventData ? initialEventData.id : Date.now().toString(),
      name: name.trim(),
      days: selectedDays,
      startTime: timeStringToDecimal(startTime),
      endTime: timeStringToDecimal(endTime),
      location,
      notes,
      colorNumber: 0,
    };

    try {
      await onSubmit(event);
      onClose();
    } finally {
      isSubmitting = false;
    }
  }
</script>

<!-- Backdrop overlay button -->
<button
  type="button"
  class="fixed inset-x-0 bottom-0 top-12 z-10 cursor-pointer bg-black/40"
  onclick={onClose}
  aria-label="Close modal background"
></button>

<!-- Main Modal Content Container -->
<div
  style="top:clamp(3.5rem, 50svh - 13rem, 12rem); max-height: calc(100svh - 4rem);"
  class="border-outline text-text-primary bg-bg-primary w-100 fixed left-1/2 z-20 m-0 max-w-[90vw] -translate-x-1/2 overflow-y-scroll rounded-lg border p-4 shadow-xl"
>
  <h2 class="mb-3 text-base font-semibold">
    {initialEventData ? 'Edit Event' : 'Add Custom Event'}
  </h2>

  <!-- Name -->
  <div class="mb-2">
    <label class="mb-0.5 block text-sm" for="user-event-name">Name<span class="text-orange">*</span></label>
    <input
      id="user-event-name"
      type="text"
      bind:value={name}
      placeholder="Event name"
      class="border-outline w-full rounded-lg border border-solid bg-transparent px-2 py-1 text-sm"
    />
  </div>

  <!-- Days -->
  <div class="mb-2">
    <label class="mb-0.5 block text-sm" for="user-event-days">Days<span class="text-orange">*</span></label>
    <div class="flex gap-1.5">
      {#each DAYS as day (day)}
        <button
          type="button"
          title={expandDayString(day)}
          class="rounded border px-2.5 py-1 text-sm transition-colors {selectedDays.includes(day)
            ? 'border-outline bg-outline'
            : 'border-outline hover:bg-hover'}"
          onclick={() => toggleDay(day)}
        >
          {day}
        </button>
      {/each}
    </div>
  </div>

  <div class="mb-2 flex gap-2">
    <EventTimeInput label="Start" value={startTime} onTimeInput={(value) => handleTimeInput('start', value)} />
    <EventTimeInput label="End" value={endTime} onTimeInput={(value) => handleTimeInput('end', value)} />
  </div>

  <!-- Location -->
  <div class="mb-2">
    <label class="mb-0.5 block text-sm" for="user-event-location">Location</label>
    <input
      id="user-event-location"
      type="text"
      bind:value={location}
      placeholder="Optional"
      class="border-outline w-full rounded-lg border border-solid bg-transparent px-2 py-1 text-sm"
    />
  </div>

  <!-- Notes -->
  <div class="mb-3">
    <label class="mb-0.5 block text-sm" for="user-event-notes">Notes</label>
    <textarea
      id="user-event-notes"
      bind:value={notes}
      placeholder="Optional"
      rows="2"
      class="border-outline w-full rounded-lg border border-solid bg-transparent px-2 py-1 text-sm"></textarea>
  </div>

  <!-- Validation errors -->
  {#if errors.length > 0}
    <div class="text-orange mb-2 text-xs">
      {#each errors as error, i (i)}
        <div>{error}</div>
      {/each}
    </div>
  {/if}

  <!-- Actions -->
  <div class="flex justify-end gap-2">
    <button type="button" onclick={onClose} class="hover:bg-hover rounded-sm px-3 py-1.5 text-sm"> Cancel </button>
    <button
      type="button"
      onclick={handleSubmit}
      disabled={isSubmitting}
      aria-busy={isSubmitting}
      class="bg-outline hover:bg-hover rounded-sm px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isSubmitting ? 'Adding...' : initialEventData ? 'Save Event' : 'Add Event'}
    </button>
  </div>
</div>
