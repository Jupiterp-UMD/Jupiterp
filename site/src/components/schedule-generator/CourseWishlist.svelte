<!--
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).

-->
<script lang="ts">
  import GeneratorCourseSearch from './GeneratorCourseSearch.svelte';
  import WishlistItem from './WishlistItem.svelte';
  import { GeneratorRequirementsStore } from '../../stores/GeneratorStores';
  import type { GeneratorRequirement } from '../../stores/GeneratorStores';

  let requirements: GeneratorRequirement[] = $state([]);
  GeneratorRequirementsStore.subscribe((reqs) => {
    requirements = reqs;
  });
</script>

<div class="flex flex-col gap-1">
  <h2 class="text-lg font-bold">Courses</h2>
  <GeneratorCourseSearch />

  {#if requirements.length === 0}
    <p class="py-2 text-sm opacity-60">Search for courses above and add the ones you want to schedule.</p>
  {:else}
    <div class="border-border flex flex-col gap-2 border-t-2 py-1">
      {#each requirements as requirement, index (requirement.course.courseCode)}
        <WishlistItem {requirement} {index} />
      {/each}
    </div>
  {/if}
</div>
