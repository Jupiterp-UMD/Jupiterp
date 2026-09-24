<!-- 
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).
Copyright (C) 2026 Andrew Cupps
-->
<script lang="ts">
  import type { Schedule } from '../../../types';

  interface Props {
    /** Earliest hour shown on the schedule, as a decimal hour. */
    earliestClassStart: number;

    /** Latest hour shown on the schedule, as a decimal hour. */
    latestClassEnd: number;

    /**
     * Distance in pixels from the first hour line to the last, as measured by
     * `ScheduleBackground`. Also used to detect that the schedule has actually
     * been laid out; it is 0 during SSR and before the first measurement.
     */
    bgHeight: number;

    /** Whether the schedule is currently showing an "Other" column. */
    hasOther: boolean;

    /**
     * The full schedule, used to work out how long is left in the current
     * class or event and when the next one starts. `schedulify` has already
     * flattened course sections and user events into the same
     * `ClassMeetingExtended` shape, so both are handled identically here.
     */
    schedule: Schedule;
  }

  let { earliestClassStart, latestClassEnd, bgHeight, hasOther, schedule }: Props = $props();

  /** Weekday keys of `Schedule`, indexed the same way as the day columns. */
  const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const;

  /**
   * Tick once a second to keep the time line up to date, even if the page
   * was loaded in the middle of a minute.
   */
  let now = $state(new Date());
  $effect(() => {
    const interval = setInterval(() => {
      now = new Date();
    }, 1000);
    return () => clearInterval(interval);
  });

  /**
   * The current time as a decimal hour, matching `Classtime.start`/`.end`.
   * Includes seconds for the sub-minute countdown as well.
   */
  let nowDecimal = $derived(now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600);

  /**
   * Index of today's column, where 0 is Monday. `-1` on a weekend, in which
   * case no column is highlighted and every line is drawn translucent.
   */
  let todayColumn = $derived(now.getDay() >= 1 && now.getDay() <= 5 ? now.getDay() - 1 : -1);

  /** Position of the line within the hour-line band, as a percentage. */
  let topPercent = $derived(((nowDecimal - earliestClassStart) / (latestClassEnd - earliestClassStart)) * 100);

  /**
   * Only render once the schedule has been measured, and only while the
   * current time falls inside the window the schedule actually displays.
   */
  let visible = $derived(
    bgHeight > 0 &&
      latestClassEnd > earliestClassStart &&
      nowDecimal >= earliestClassStart &&
      nowDecimal <= latestClassEnd
  );

  /** The current time as a 12-hour `h:mm` label for the bubble. */
  let label = $derived.by(() => {
    const hour = now.getHours() % 12 === 0 ? 12 : now.getHours() % 12;
    return `${hour}:${String(now.getMinutes()).padStart(2, '0')}`;
  });

  /**
   * Today's meetings, excluding hover previews so that pointing at a section
   * in course search never changes the countdown.
   */
  let todayMeetings = $derived(todayColumn < 0 ? [] : schedule[DAY_KEYS[todayColumn]].filter((m) => !m.hover));

  /**
   * Render a duration given in decimal hours as a compact `1h 23m` label,
   * counting down in seconds once under a minute is left. Rounded up, so a
   * countdown never reads `0s` while it is still running.
   */
  function formatDuration(hours: number): string {
    // Normalise to whole milliseconds first: `hours` is a difference of
    // decimal hours, so an exact 59s arrives as 59.00000000000001 seconds and
    // would otherwise round up to a full minute.
    const totalSeconds = Math.ceil(Math.round(hours * 3_600_000) / 1000);
    if (totalSeconds < 60) {
      return `${totalSeconds}s`;
    }
    const totalMinutes = Math.ceil(totalSeconds / 60);
    const wholeHours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (wholeHours === 0) {
      return `${minutes}m`;
    }
    if (minutes === 0) {
      return `${wholeHours}h`;
    }
    return `${wholeHours}h ${minutes}m`;
  }

  /**
   * The status tag shown on today's line: how long is left in whatever is
   * happening now, otherwise how long until the next thing starts, otherwise
   * that the day is over. `null` when there is nothing scheduled today at
   * all, so an empty schedule shows no tag rather than "done today!".
   */
  let tagLabel: string | null = $derived.by(() => {
    if (todayColumn < 0 || todayMeetings.length === 0) {
      return null;
    }

    // The soonest end among things happening now, and the soonest start
    // among things still to come.
    let currentEnd: number | null = null;
    let nextStart: number | null = null;

    for (const block of todayMeetings) {
      const meeting = block.meeting;
      if (typeof meeting === 'string') {
        continue;
      }
      const { start, end } = meeting.classtime;
      if (start <= nowDecimal && nowDecimal < end) {
        currentEnd = currentEnd === null ? end : Math.min(currentEnd, end);
      } else if (start > nowDecimal) {
        nextStart = nextStart === null ? start : Math.min(nextStart, start);
      }
    }

    if (currentEnd !== null) {
      return `${formatDuration(currentEnd - nowDecimal)} left`;
    }
    if (nextStart !== null) {
      return `${formatDuration(nextStart - nowDecimal)} until`;
    }
    return 'done today!';
  });
</script>

{#if visible}
  <div style="height: {bgHeight}px;" class="top-9.5 pointer-events-none absolute left-0 z-10 w-full">
    <!-- One segment per day column, so the solid/translucent split lands
         exactly on a day boundary and the "Other" column is skipped. -->
    <div
      class="absolute inset-y-0 left-9 grid w-[calc(100%-2.25rem)] 2xl:left-11 2xl:w-[calc(100%-2.75rem)]"
      class:grid-cols-5={!hasOther}
      class:grid-cols-6={hasOther}
    >
      {#each Array.from({ length: hasOther ? 6 : 5 }, (_, i) => i) as columnIndex (columnIndex)}
        <div class="relative">
          {#if columnIndex < 5}
            <div
              style="top: {topPercent}%"
              class="absolute h-0.5 w-full -translate-y-1/2 {columnIndex === todayColumn
                ? 'bg-red-500'
                : 'bg-red-500/30'}"
            ></div>
          {/if}

          <!-- Status tag, pinned to the right end of today's solid segment -->
          {#if columnIndex === todayColumn && tagLabel !== null}
            <div
              style="top: {topPercent}%"
              class="absolute right-0 -translate-y-1/2 whitespace-nowrap rounded-full bg-red-500 px-1.5 py-0.5 text-[0.625rem] font-semibold leading-none text-white"
            >
              {tagLabel}
            </div>
          {/if}
        </div>
      {/each}
    </div>

    <!-- Current time bubble. Anchored by its right edge to where the day
         columns (and so the red line) begin, so it stays flush against the
         line and grows leftwards as the label gets wider. -->
    <div
      style="top: {topPercent}%"
      class="absolute right-[calc(100%-2.25rem)] -translate-y-1/2 whitespace-nowrap rounded-full bg-red-500 px-1.5 py-0.5 text-center text-[0.625rem] font-semibold leading-none text-white 2xl:right-[calc(100%-2.75rem)] 2xl:text-xs"
    >
      {label}
    </div>
  </div>
{/if}
