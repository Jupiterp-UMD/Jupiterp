<!--
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).

-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { loadInstructorLookup } from '$lib/course-planner/CourseSearch';
  import { client } from '$lib/client';
  import { DepartmentsStore } from '../../stores/CoursePlannerStores';
  import CourseWishlist from '../../components/schedule-generator/CourseWishlist.svelte';
  import ConstraintsPanel from '../../components/schedule-generator/ConstraintsPanel.svelte';
  import ResultsGallery from '../../components/schedule-generator/ResultsGallery.svelte';

  // Departments are needed so the course search can resolve department codes.
  async function fetchDeptCodes() {
    const res = await client.deptList();
    if (res.ok() && res.data != null) {
      DepartmentsStore.set(res.data);
    } else {
      console.error('Error fetching department codes:', res.errorBody);
    }
  }

  onMount(() => {
    loadInstructorLookup();
    fetchDeptCodes();
  });
</script>

<svelte:head>
  <title>Schedule Generator | Jupiterp</title>
</svelte:head>

<main
  class="custom-scrollbar fixed bottom-0 top-12 w-full flex-col overflow-y-auto px-3 lg:grid lg:grid-cols-[22rem_1fr]"
>
  <!-- Inputs: wishlist + constraints -->
  <div class="custom-scrollbar scrollbar-gutter-stable flex w-full flex-col px-1 py-2 lg:overflow-y-auto lg:pr-2">
    <CourseWishlist />
    <div class="border-border border-t-2">
      <h2 class="mb-1 text-lg font-bold">Constraints</h2>
      <ConstraintsPanel />
    </div>
  </div>

  <!-- Results -->
  <div class="custom-scrollbar px-1 py-2 lg:overflow-y-auto">
    <ResultsGallery />
  </div>
</main>
