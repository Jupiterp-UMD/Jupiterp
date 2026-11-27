<!--
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).

-->
<script lang="ts">
  import { SvelteDate } from 'svelte/reactivity';
  import { onDestroy } from 'svelte';
  import { base } from '$app/paths';
  import {
    ClipboardCleanOutline,
    ClipboardCheckOutline,
    ArrowDownToBracketOutline,
    CloseOutline,
    ImageOutline,
  } from 'flowbite-svelte-icons';
  import { CurrentScheduleStore } from '../../../stores/CoursePlannerStores';
  import type { ScheduleSelection, UserEvent } from '../../../types';
  import { encodeSchedule, SHARE_PARAM } from '$lib/course-planner/ShareLink';
  import { canvasToPngBlob, drawScheduleImage, imageFileName } from '$lib/course-planner/ScheduleImage';
  import { TERM_NAME } from '$lib/term';
  import Tooltip from '../schedule/Tooltip.svelte';

  let { onCloseExport } = $props<{ onCloseExport?: () => void }>();

  let selections: ScheduleSelection[] = $state([]);
  let selectionsCustom: UserEvent[] = $state([]);
  let scheduleName = $state('');
  let linkCopied = $state(false);
  let imageCopyResult: 'copied' | 'failed' | null = $state(null);

  let isScheduleEmptyCustom = $derived(selections.length === 0 && selectionsCustom.length === 0);
  let isScheduleEmpty = $derived(selections.length === 0);

  // Firefox before 127 has no ClipboardItem, so only the download is offered there.
  const canCopyImage =
    typeof window !== 'undefined' && typeof ClipboardItem !== 'undefined' && !!navigator.clipboard?.write;

  const unsubscribe = CurrentScheduleStore.subscribe((stored) => {
    selections = stored.selections.filter((s) => 'course' in s && 'section' in s) as ScheduleSelection[];
    selectionsCustom = stored.selections.filter((s): s is UserEvent => !('course' in s));
    scheduleName = stored.scheduleName;
  });
  onDestroy(unsubscribe);

  const closePopup = () => onCloseExport?.();

  async function copyShareLink() {
    const token = encodeSchedule([...selections, ...selectionsCustom]);
    if (!token) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    try {
      await navigator.clipboard.writeText(`${origin}${base}/?${SHARE_PARAM}=${token}`);
      linkCopied = true;
      setTimeout(() => (linkCopied = false), 1200);
    } catch (e) {
      console.error('Failed to copy share link:', e);
    }
  }

  function renderSchedulePng(): Promise<Blob> {
    return drawScheduleImage([...selections, ...selectionsCustom], scheduleName, TERM_NAME).then(canvasToPngBlob);
  }

  async function copyScheduleImage() {
    try {
      // Safari only allows a clipboard write that starts within the click,
      // so the PNG is handed over as a promise rather than awaited first.
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': renderSchedulePng() })]);
      imageCopyResult = 'copied';
    } catch (e) {
      console.error('Failed to copy schedule image:', e);
      imageCopyResult = 'failed';
    }
    setTimeout(() => (imageCopyResult = null), 1500);
  }

  async function downloadScheduleImage() {
    try {
      const url = URL.createObjectURL(await renderSchedulePng());
      const link = document.createElement('a');
      link.href = url;
      link.download = imageFileName(scheduleName);
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      console.error('Failed to download schedule image:', e);
    }
  }

  const pad = (n: number) => n.toString().padStart(2, '0');
  const formatDate = (date: Date) => `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;

  function formatDecimalTime(decimalTime: number): string {
    const hours = Math.floor(decimalTime);
    return `${pad(hours)}${pad(Math.round((decimalTime - hours) * 60))}00`;
  }

  function formatDay(days: string): string {
    const DayMaps: Record<string, string> = { Th: 'TH', Tu: 'TU', M: 'MO', W: 'WE', F: 'FR', Sa: 'SA', Su: 'SU' };
    const matches = days.match(new RegExp(Object.keys(DayMaps).join('|'), 'g'));
    return matches ? matches.map((m) => DayMaps[m]).join(',') : '';
  }

  function getFirstOccurrence(startStr: string, daysStr: string): string {
    let date = new SvelteDate(
      parseInt(startStr.substring(0, 4)),
      parseInt(startStr.substring(4, 6)) - 1,
      parseInt(startStr.substring(6, 8))
    );
    const dayMap: Record<string, number> = { MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6, SU: 0 };
    const targetDay = dayMap[daysStr.split(',')[0]];
    if (targetDay === undefined) return formatDate(date);

    for (let i = 0; i < 7 && date.getDay() !== targetDay; i++) {
      date.setDate(date.getDate() + 1);
    }
    return formatDate(date);
  }

  function exportCalender() {
    let ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Jupiterp//EN\r\n';
    const semStart = formatDate(new Date(2026, 7, 31)),
      semEnd = formatDate(new Date(2026, 11, 11));

    for (const c of selectionsCustom) {
      const days = Array.isArray(c.days) ? formatDay(c.days.join()) : '';
      if (!days || typeof c.startTime !== 'number' || typeof c.endTime !== 'number') continue;
      const day = getFirstOccurrence(semStart, days);
      ics += `BEGIN:VEVENT\r\nSUMMARY:${c.name} - ${c.location || 'TBA'}\r\nDTSTART:${day}T${formatDecimalTime(c.startTime)}\r\nDTEND:${day}T${formatDecimalTime(c.endTime)}\r\nRRULE:FREQ=WEEKLY;BYDAY=${days};UNTIL=${semEnd}T235959Z\r\nLOCATION:${c.location || 'TBA'}\r\nDESCRIPTION:${c.notes || ''}\r\nUID:${c.id}@jupiterp\r\nEND:VEVENT\r\n`;
    }

    for (const c of selections) {
      const instructors =
        Array.isArray(c.section.instructors) && c.section.instructors.length ? c.section.instructors.join(', ') : 'TBA';
      for (const m of c.section.meetings) {
        if (!m || Array.isArray(m) || typeof m !== 'object') continue;
        let locStr =
          m.location?.building || m.location?.room
            ? `${m.location.building || ''} ${m.location.room || ''}`.trim()
            : 'Online/Async';
        const bLower = locStr.toLowerCase();
        if (bLower.includes('online'))
          locStr = bLower.includes('sync')
            ? 'Online (Synchronous)'
            : bLower.includes('async')
              ? 'Online (Asynchronous)'
              : 'Online';

        const days = m.classtime?.days ? formatDay(m.classtime.days) : '';
        if (!days || typeof m.classtime?.start !== 'number' || typeof m.classtime?.end !== 'number') {
          if (bLower.includes('online') || bLower.includes('async')) {
            ics += `BEGIN:VEVENT\r\nSUMMARY:${c.course.courseCode} (${c.section.sectionCode}) - ${locStr}\r\nDTSTART:${semStart}T000000\r\nDTEND:${semStart}T235959\r\nLOCATION:${locStr}\r\nDESCRIPTION:Course: ${c.course.name}\\nInstructors: ${instructors} (${bLower.includes('sync') ? 'Online (Synchronous)' : 'Online (Asynchronous)'})\\n\r\nUID:${c.course.courseCode}-${c.section.sectionCode}-online@jupiterp\r\nEND:VEVENT\r\n`;
          }
          continue;
        }
        const day = getFirstOccurrence(semStart, days);
        ics += `BEGIN:VEVENT\r\nSUMMARY:${c.course.courseCode} (${c.section.sectionCode}) - ${locStr}\r\nDTSTART:${day}T${formatDecimalTime(m.classtime.start)}\r\nDTEND:${day}T${formatDecimalTime(m.classtime.end)}\r\nRRULE:FREQ=WEEKLY;BYDAY=${days};UNTIL=${semEnd}T235959Z\r\nLOCATION:${locStr}\r\nDESCRIPTION:Course: ${c.course.name}\\nInstructors: ${instructors}\r\nUID:${c.course.courseCode}-${c.section.sectionCode}-${days}-${formatDecimalTime(m.classtime.start)}@jupiterp\r\nEND:VEVENT\r\n`;
      }
    }

    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([ics + 'END:VCALENDAR\r\n'], { type: 'text/calendar;charset=utf-8;' }));
    link.download = 'schedule.ics';
    link.click();
  }
</script>

<div
  class="fixed inset-0 top-12 z-50 flex items-center justify-center overflow-hidden bg-black/50 p-4"
  onclick={closePopup}
  role="presentation"
>
  <div
    class="border-border bg-bg-primary flex max-h-full w-80 shrink-0 flex-col gap-4 overflow-y-auto rounded-lg border p-6 shadow-lg"
    onclick={(e) => e.stopPropagation()}
    role="presentation"
  >
    <div class="flex items-center justify-between">
      <h2 class="text-base font-bold">Export Current Schedule</h2>
      <button class="text-md hover:text-orange -m-1 p-1" title="Close Export" onclick={closePopup}>
        <CloseOutline />
      </button>
    </div>

    <p class="mb-2 text-left text-sm">
      {#if isScheduleEmptyCustom && isScheduleEmpty}
        Please add courses or events to the schedule.
      {:else}
        Share your current schedule with others!
      {/if}
    </p>

    <button
      class="bg-outline hover:bg-hover disabled:text-text-secondary disabled:bg-outline/50 flex w-full items-center justify-center rounded-md px-4 py-3 font-medium disabled:cursor-not-allowed"
      disabled={isScheduleEmptyCustom}
      onclick={exportCalender}
    >
      <ArrowDownToBracketOutline class="mr-2 inline h-4 w-4" />
      <span class="mr-0.75">Download</span>
      <Tooltip text=".ics file" tooltipText="This will download a universal .ics file containing your schedule." />
    </button>

    <div class="flex w-full gap-2">
      {#if canCopyImage}
        <button
          class="bg-outline hover:bg-hover disabled:text-text-secondary disabled:bg-outline/50 flex flex-1 items-center justify-center rounded-md px-2 py-3 font-medium disabled:cursor-not-allowed"
          disabled={isScheduleEmptyCustom}
          title="Copy your schedule as an image to paste into a chat"
          onclick={copyScheduleImage}
        >
          {#if imageCopyResult === 'copied'}
            <ClipboardCheckOutline class="mr-2 inline h-4 w-4" /> Copied
          {:else if imageCopyResult === 'failed'}
            Couldn't copy
          {:else}
            <ImageOutline class="mr-2 inline h-4 w-4" /> Copy image
          {/if}
        </button>
      {/if}
      <button
        class="bg-outline hover:bg-hover disabled:text-text-secondary disabled:bg-outline/50 flex flex-1 items-center justify-center rounded-md px-2 py-3 font-medium disabled:cursor-not-allowed"
        disabled={isScheduleEmptyCustom}
        title="Download your schedule as a PNG image"
        onclick={downloadScheduleImage}
      >
        <ArrowDownToBracketOutline class="mr-2 inline h-4 w-4" /> Save .png
      </button>
    </div>

    <button
      class="bg-outline hover:bg-hover disabled:text-text-secondary disabled:bg-outline/50 flex w-full items-center justify-center rounded-md px-4 py-3 font-medium disabled:cursor-not-allowed"
      disabled={isScheduleEmpty}
      title={linkCopied ? 'Link copied!' : 'Copy shareable link'}
      onclick={copyShareLink}
    >
      {#if linkCopied}
        <ClipboardCheckOutline class="mr-2 inline h-4 w-4" /> Copied
      {:else}
        <ClipboardCleanOutline class="mr-2 inline h-4 w-4" /> Copy
      {/if}
      shareable link
    </button>
  </div>
</div>
