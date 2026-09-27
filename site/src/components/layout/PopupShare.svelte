<!-- 
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).

-->
<script lang="ts">
  import { SvelteDate } from 'svelte/reactivity';
  import { CurrentScheduleStore } from '../../stores/CoursePlannerStores';
  import type { ScheduleSelection, UserEvent } from '../../types';
  import Tooltip from '../course-planner/schedule/Tooltip.svelte';
  import { TERM_END, TERM_START } from '$lib/term';

  let { onCloseExport } = $props<{ onCloseExport?: () => void }>();
  let selections: ScheduleSelection[] = [];
  let selectionsCustom: UserEvent[] = [];

  CurrentScheduleStore.subscribe((stored) => {
    selections = stored.selections.filter((s) => 'course' in s && 'section' in s) as ScheduleSelection[];
    selectionsCustom = stored.selections.filter((s): s is UserEvent => !('course' in s));
  });

  function closePopup() {
    onCloseExport?.();
  }

  function formatDecimalTime(decimalTime: number): string {
    const hours = Math.floor(decimalTime);

    const minutes = Math.round((decimalTime - hours) * 60);

    const hString = hours.toString().padStart(2, '0');
    const mString = minutes.toString().padStart(2, '0');

    return `${hString}${mString}00`;
  }

  function formatDay(days: string): string {
    const DayMaps: Record<string, string> = {
      Th: 'TH',
      Tu: 'TU',
      M: 'MO',
      W: 'WE',
      F: 'FR',
      Sa: 'SA',
      Su: 'SU',
    };

    const regex = new RegExp(Object.keys(DayMaps).join('|'), 'g');

    const matches = days.match(regex);

    return matches ? matches.map((m) => DayMaps[m]).join(',') : '';
  }

  function formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}${m}${d}`;
  }

  function getFirstOccurrence(startStr: string, daysStr: string): string {
    const year = parseInt(startStr.substring(0, 4));
    const month = parseInt(startStr.substring(4, 6)) - 1;
    const day = parseInt(startStr.substring(6, 8));
    let date = new SvelteDate(year, month, day);

    const dayMap: Record<string, number> = { MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6, SU: 0 };

    const firstClassDay = daysStr.split(',')[0];
    const targetDay = dayMap[firstClassDay];
    if (targetDay === undefined) return formatDate(date);

    for (let i = 0; i < 7; i++) {
      if (date.getDay() === targetDay) break;
      date.setDate(date.getDate() + 1);
    }

    return formatDate(date);
  }

  function exportCalender() {
    let icsData = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Jupiterp//EN\r\n';
    // dates hardcoded in term.ts
    const semesterStart = formatDate(TERM_START);
    const semesterEnd = formatDate(TERM_END);

    for (const currentClass of selectionsCustom) {
      const name = currentClass.name;
      const id = currentClass.id;
      const days = Array.isArray(currentClass.days) ? formatDay(currentClass.days.join()) : '';
      const startTime = typeof currentClass.startTime === 'number' ? formatDecimalTime(currentClass.startTime) : '';
      const endTime = typeof currentClass.endTime === 'number' ? formatDecimalTime(currentClass.endTime) : '';

      const description = currentClass.notes || '';
      const location = currentClass.location || 'TBA';

      if (!days || !startTime || !endTime) {
        continue;
      }

      const actualFirstDay = getFirstOccurrence(semesterStart, days);

      icsData += 'BEGIN:VEVENT\r\n';
      icsData += `SUMMARY:${name} - ${location}\r\n`;

      icsData += `DTSTART:${actualFirstDay}T${startTime}\r\n`;
      icsData += `DTEND:${actualFirstDay}T${endTime}\r\n`;
      icsData += `RRULE:FREQ=WEEKLY;BYDAY=${days};UNTIL=${semesterEnd}T235959Z\r\n`;
      icsData += `LOCATION:${location}\r\n`;
      icsData += `DESCRIPTION:${description}\r\n`;
      icsData += `UID:${id}@jupiterp\r\n`;
      icsData += 'END:VEVENT\r\n';
    }

    for (const currentClass of selections) {
      const courseCode = currentClass.course.courseCode;
      const sectionNumber = currentClass.section.sectionCode;
      const courseName = currentClass.course.name;
      const instructorNames =
        Array.isArray(currentClass.section.instructors) && currentClass.section.instructors.length
          ? currentClass.section.instructors.join(', ')
          : 'TBA';
      const meetingDetails = [];

      for (const meeting of currentClass.section.meetings) {
        if (typeof meeting !== 'object' || meeting === null || Array.isArray(meeting)) continue;

        let locationStr = 'Online/Async';
        let days = '';
        let startTime = '';
        let endTime = '';

        if (typeof meeting === 'object' && meeting !== null) {
          const loc = meeting.location || {};
          const building = loc.building || '';
          const room = loc.room || '';
          locationStr = building || room ? `${building} ${room}`.trim() : 'Online/Async';

          const buildingLower = (building || '').toLowerCase();
          if (buildingLower.includes('online')) {
            if (buildingLower.includes('sync')) {
              locationStr = 'Online (Synchronous)';
            } else if (buildingLower.includes('async')) {
              locationStr = 'Online (Asynchronous)';
            } else {
              locationStr = 'Online';
            }
          }

          const classtime = meeting.classtime || {};
          days = classtime.days ? formatDay(classtime.days) : '';
          startTime = typeof classtime.start === 'number' ? formatDecimalTime(classtime.start) : '';
          endTime = typeof classtime.end === 'number' ? formatDecimalTime(classtime.end) : '';
        }

        const meetingPacket = {
          location: locationStr,
          days: days,
          start: startTime,
          end: endTime,
        };

        meetingDetails.push(meetingPacket);
      }

      for (const packet of meetingDetails) {
        if (!packet.days || !packet.start || !packet.end) {
          const locLower = (packet.location || '').toLowerCase();
          if (locLower.includes('online') || locLower.includes('async')) {
            const actualFirstDay = semesterStart;

            icsData += 'BEGIN:VEVENT\r\n';
            icsData += `SUMMARY:${courseCode} (${sectionNumber}) - ${packet.location}\r\n`;

            icsData += `DTSTART:${actualFirstDay}T000000\r\n`;
            icsData += `DTEND:${actualFirstDay}T235959\r\n`;
            icsData += `LOCATION:${packet.location}\r\n`;
            const onlineNote = locLower.includes('sync')
              ? 'Online (Synchronous)'
              : locLower.includes('async')
                ? 'Online (Asynchronous)'
                : 'Online';
            icsData += `DESCRIPTION:Course: ${courseName}\\nInstructors: ${instructorNames} (${onlineNote})\\n\r\n`;
            icsData += `UID:${courseCode}-${sectionNumber}-online@jupiterp\r\n`;
            icsData += 'END:VEVENT\r\n';
          }
          continue;
        }

        const actualFirstDay = getFirstOccurrence(semesterStart, packet.days);

        icsData += 'BEGIN:VEVENT\r\n';
        icsData += `SUMMARY:${courseCode} (${sectionNumber}) - ${packet.location}\r\n`;

        icsData += `DTSTART:${actualFirstDay}T${packet.start}\r\n`;
        icsData += `DTEND:${actualFirstDay}T${packet.end}\r\n`;

        icsData += `RRULE:FREQ=WEEKLY;BYDAY=${packet.days};UNTIL=${semesterEnd}T235959Z\r\n`;

        icsData += `LOCATION:${packet.location}\r\n`;
        const packetLocLower = (packet.location || '').toLowerCase();
        const onlineTag = packetLocLower.includes('online')
          ? packetLocLower.includes('sync')
            ? ' (Online - Synchronous)'
            : packetLocLower.includes('async')
              ? ' (Online - Asynchronous)'
              : ' (Online)'
          : '';
        icsData += `DESCRIPTION:Course: ${courseName}${onlineTag}\\nInstructors: ${instructorNames}\\n\r\n`;
        icsData += `UID:${courseCode}-${sectionNumber}-${packet.start || ''}@jupiterp\r\n`;
        icsData += 'END:VEVENT\r\n';
      }
    }
    icsData += 'END:VCALENDAR';

    const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Jupiterp_Schedule.ics';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
  <div class="border-border bg-bg-primary flex w-96 flex-col gap-4 rounded-lg border p-6 shadow-lg">
    <div class="flex items-center justify-between">
      <h2 class="text-base font-bold">Export Schedule</h2>

      <Tooltip text="?" tooltipText="This will download a universal .ics file containing your schedule." />
    </div>

    <p class="mb-2 text-left text-sm">Download your schedule as a .ics file and import it into your favorite app.</p>
    <button class="bg-outline hover:bg-hover mt-2 w-full rounded-md px-4 py-3 font-medium" onclick={exportCalender}>
      Export
    </button>

    <button
      class="text-text-secondary hover:text-text-primary mt-1 rounded-md px-4 py-2 underline decoration-transparent hover:decoration-current"
      onclick={closePopup}
    >
      Cancel
    </button>
  </div>
</div>
