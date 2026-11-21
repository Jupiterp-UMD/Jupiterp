<!--
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).

This component handles segmented time entry for custom schedule events.
-->
<script lang="ts">
  interface Props {
    label: string;
    value: string;
    onTimeInput: (value: string) => void;
  }

  let { label, value, onTimeInput }: Props = $props();

  let hour = $state('');
  let minute = $state('');
  let period = $state('');
  let hourInput: HTMLInputElement;
  let minuteInput: HTMLInputElement;
  let periodInput: HTMLInputElement;

  // Keep partially entered segments when the parent echoes an empty value.
  let lastValue = '';

  $effect(() => {
    const time = value;
    if (time === lastValue) return;

    lastValue = time;
    const [hours, minutes] = time.split(':');
    const hour24 = Number(hours) % 24;
    hour = time ? String(hour24 % 12 || 12).padStart(2, '0') : '';
    minute = minutes ?? '';
    period = time ? (hour24 < 12 ? 'AM' : 'PM') : '';
  });

  function publishTime() {
    const validHour = Number(hour) >= 1 && Number(hour) <= 12;
    const validMinute = minute.length === 2 && Number(minute) < 60;
    let time = '';

    if (validHour && validMinute && (period === 'AM' || period === 'PM')) {
      const hours = (Number(hour) % 12) + (period === 'PM' ? 12 : 0);
      time = `${String(hours).padStart(2, '0')}:${minute}`;
    }

    lastValue = time;
    onTimeInput(time);
  }

  function focusSegment(segment: HTMLInputElement) {
    segment.focus();
    segment.select();
  }

  function handleDigits(segment: 'hour' | 'minute', input: HTMLInputElement) {
    const digits = input.value.replace(/\D/g, '').slice(0, 2);
    const number = Number(digits);
    const hasTwoDigits = digits.length === 2;
    input.value = digits;

    if (segment === 'hour') {
      hour = digits;
      if (hasTwoDigits && number >= 1 && number <= 12) {
        focusSegment(minuteInput);
      }
    } else {
      minute = digits;
      if (hasTwoDigits && number < 60) {
        focusSegment(periodInput);
      }
    }

    publishTime();
  }

  /** Moves focus to the neighboring segment in the arrow key's direction. */
  function navigate(event: KeyboardEvent, previous?: HTMLInputElement, next?: HTMLInputElement) {
    const neighbors = { ArrowLeft: previous, ArrowRight: next };
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;

    const destination = neighbors[event.key];
    if (destination) {
      event.preventDefault();
      focusSegment(destination);
    }
  }
</script>

<fieldset class="min-w-0 flex-1">
  <legend class="mb-0.5 text-sm">{label}<span class="text-orange">*</span></legend>
  <div class="border-outline flex items-center rounded-lg border px-2 py-1 text-sm">
    <input
      bind:this={hourInput}
      value={hour}
      type="text"
      inputmode="numeric"
      placeholder="12"
      aria-label={`${label} hour`}
      oninput={(event) => handleDigits('hour', event.currentTarget)}
      onkeydown={(event) => navigate(event, undefined, minuteInput)}
      class="time-segment hour"
      class:single-digit={hour.length === 1}
    />
    <span aria-hidden="true">:</span>
    <input
      bind:this={minuteInput}
      value={minute}
      type="text"
      inputmode="numeric"
      placeholder="30"
      aria-label={`${label} minute`}
      oninput={(event) => handleDigits('minute', event.currentTarget)}
      onkeydown={(event) => navigate(event, hourInput, periodInput)}
      class="time-segment"
    />
    <input
      bind:this={periodInput}
      value={period}
      type="text"
      placeholder="PM"
      aria-label={`${label} AM or PM`}
      onclick={(event) => event.currentTarget.select()}
      oninput={(event) => {
        const input = event.currentTarget;
        const typed = input.value.toUpperCase();
        if (typed === '' || typed === 'AM' || typed === 'PM') {
          period = typed;
        } else if (typed === 'A' || typed === 'P') {
          const isDeleting = event instanceof InputEvent && event.inputType.startsWith('delete');
          period = isDeleting ? '' : `${typed}M`;
        }
        input.value = period;
        publishTime();
      }}
      onkeydown={(event) => navigate(event, minuteInput)}
      class="time-segment period"
    />
  </div>
</fieldset>

<style>
  .time-segment {
    width: 2ch;
    min-width: 0;
    border: 0;
    border-radius: 0.125rem;
    background: transparent;
    padding: 0;
    font: inherit;
    color: inherit;
    text-align: center;
  }

  .period {
    width: 2.75ch;
    field-sizing: content;
    margin-inline-start: 0.35em;
  }

  .hour.single-digit {
    width: 1ch;
  }

  .time-segment::placeholder {
    color: var(--color-text-secondary);
    opacity: 1;
  }

  .time-segment:focus {
    outline: none;
    box-shadow: none;
    background-color: #2563eb;
    color: #fff;
  }

  .time-segment:focus::placeholder,
  .time-segment::selection {
    background-color: #2563eb;
    color: #fff;
  }
</style>
