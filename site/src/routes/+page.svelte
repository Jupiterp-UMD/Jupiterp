<!-- 
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).

 -->
<script lang="ts">
  // format-check exempt 2
  import Schedule from '../components/course-planner/schedule/Schedule.svelte';
  import CourseSearch from '../components/course-planner/course-search/CourseSearch.svelte';
  import { onMount } from 'svelte';
  import { applySharedScheduleToStores, ensureUpToDateAndSetStores } from '../lib/course-planner/CourseLoad';
  import {
    readStoredCurrentSchedule,
    readStoredNonselectedSchedules,
    saveCurrentSchedule,
    saveNonselectedSchedules,
  } from '../lib/course-planner/SchedulePersistence';
  import { SHARE_PARAM } from '$lib/course-planner/ShareLink';
  import { loadInstructorLookup } from '$lib/course-planner/CourseSearch';
  import { handlePlannerShortcutKeydown } from '../lib/course-planner/PlannerShortcuts';
  import {
    CurrentScheduleStore,
    NonselectedScheduleStore,
    DepartmentsStore,
    CatalogTermStore,
  } from '../stores/CoursePlannerStores';
  import { client } from '$lib/client';
  import type { StoredSchedule } from '../types';
  import IsDesktop from '../components/course-planner/IsDesktop.svelte';
  import { PlannerState } from '../stores/CoursePlannerStores';

  let isDesktop: boolean = $state(false);
  let plannerContainer: HTMLElement | null = $state(null);

  // Replaced run() with $effect to handle updating the store on the client
  $effect(() => {
    PlannerState.update((state: { isDesktop: boolean; chainScrollParent: HTMLElement | null }) => ({
      ...state,
      isDesktop,
      chainScrollParent: plannerContainer,
    }));
  });

  // Function to get list of department codes as an array of strings
  // and set the DepartmentsStore.
  async function fetchDeptCodes() {
    const res = await client.deptList();
    if (res.ok() && res.data != null) {
      const depts = res.data;
      DepartmentsStore.set(depts);
    } else {
      console.error('Error fetching department codes:', res.errorBody);
    }
  }

  // Get the term the course data is from, which labels the planner and
  // points its Testudo links at the right term.
  async function fetchCatalogTerm() {
    const res = await client.term();
    if (res.ok() && res.data != null) {
      CatalogTermStore.set(res.data[0]?.term ?? null);
    } else {
      console.error('Error fetching catalog term:', res.errorBody);
    }
  }

  // Keep track of chosen sections
  let currentSchedule: StoredSchedule;
  let hasReadLocalStorage: boolean = false;
  CurrentScheduleStore.subscribe((stored) => {
    if (hasReadLocalStorage) {
      currentSchedule = stored;

      // Save to local storage
      if (currentSchedule) {
        if (typeof window !== 'undefined') {
          saveCurrentSchedule(currentSchedule);
        }
      }
    }
  });

  let nonselectedSchedules: StoredSchedule[];
  // Save non-selected schedules to local storage
  NonselectedScheduleStore.subscribe((stored) => {
    if (hasReadLocalStorage) {
      nonselectedSchedules = stored;

      // Save to local storage
      if (nonselectedSchedules) {
        if (typeof window !== 'undefined') {
          saveNonselectedSchedules(nonselectedSchedules);
        }
      }
    }
  });

  onMount(() => {
    // Fetch instructor data from API
    loadInstructorLookup();

    // Fetch department codes from API
    fetchDeptCodes();

    // Fetch the term the course data is from
    fetchCatalogTerm();

    // Retrieve data from client local storage
    try {
      if (typeof window !== 'undefined') {
        // Get the stored current and non-selected schedules
        const currentSchedule: StoredSchedule = readStoredCurrentSchedule();
        const storedNonselectedSchedules: StoredSchedule[] = readStoredNonselectedSchedules();

        // Allow store subscriptions to persist whatever we load below.
        hasReadLocalStorage = true;

        // If the page was opened from a shared link, load that schedule
        // as a new named schedule (preserving the user's own), then
        // strip the param so a refresh doesn't re-import it.
        const shareParam = new URLSearchParams(window.location.search).get(SHARE_PARAM);
        if (shareParam) {
          (async () => {
            const consumed = await applySharedScheduleToStores(shareParam, currentSchedule, storedNonselectedSchedules);
            if (consumed) {
              // Strip the param so a refresh doesn't re-import; on a
              // transient fetch failure (consumed === false) keep it so
              // a refresh can retry.
              const cleanUrl = window.location.pathname + window.location.hash;
              window.history.replaceState(window.history.state, '', cleanUrl);
            }
          })().catch((e) => console.error('Failed to apply shared schedule:', e));
        } else {
          // Find differences between stored selections and
          // most up-to-date course data, and update accordingly.
          ensureUpToDateAndSetStores(currentSchedule, storedNonselectedSchedules);
        }
      }
    } catch (e) {
      console.log('Unable to retrieve courses: ' + e);
      CurrentScheduleStore.set({
        scheduleName: 'Schedule 1',
        selections: [],
      });
      NonselectedScheduleStore.set([]);
    }
  });

  function handlePlannerKeydown(event: KeyboardEvent) {
    handlePlannerShortcutKeydown(event, isDesktop);
  }
</script>

<IsDesktop bind:isDesktop />

<svelte:window onkeydown={handlePlannerKeydown} />

<main
  bind:this={plannerContainer}
  id="planner-container"
  class="custom-scrollbar fixed bottom-0 top-12 w-full flex-col overflow-y-auto px-3 lg:grid lg:grid-cols-[22rem_1fr]"
>
  <Schedule />
  <CourseSearch />
</main>
