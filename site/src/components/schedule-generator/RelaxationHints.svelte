<!--
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).

-->
<script lang="ts">
  import { GeneratorConstraintsStore } from '../../stores/GeneratorStores';
  import type { RelaxationHint } from '../../stores/GeneratorStores';
  import { relaxationLabel } from '../../lib/schedule-generator/GeneratorFormat';
  import { runGeneration } from '../../lib/schedule-generator/Generate';

  interface Props {
    hints: RelaxationHint[];
    coursesWithNoValidSections: string[];
  }

  let { hints, coursesWithNoValidSections }: Props = $props();

  function applyHint(hint: RelaxationHint) {
    GeneratorConstraintsStore.set(hint.relaxation.constraints);
    runGeneration();
  }
</script>

<div class="flex flex-col gap-3">
  {#if coursesWithNoValidSections.length > 0}
    <div class="border-orange bg-light-orange/30 rounded-lg border px-3 py-2 text-sm">
      No sections fit for:
      <span class="font-semibold"> {coursesWithNoValidSections.join(', ')} </span>. Try relaxing a constraint or
      unpinning a section.
    </div>
  {/if}
  {#if hints.length > 0}
    <p class="text-sm opacity-80">No schedules fit all your constraints. Loosening one would help:</p>
    <div class="flex flex-col gap-2">
      <!-- `kind` alone is not unique: one "dayOff" relaxation is produced per
           day off, so the day has to be part of the key. -->
      {#each hints as hint (hint.relaxation.kind + ':' + hint.relaxation.day)}
        <button
          class="border-border hover:border-orange flex flex-row
						items-center justify-between gap-2 rounded-lg border
						px-3 py-2 text-left
						text-sm"
          onclick={() => applyHint(hint)}
        >
          <span>{relaxationLabel(hint.relaxation)}</span>
          <span class="text-orange shrink-0 text-xs">
            {hint.truncated ? '50+' : hint.scheduleCount} schedule{hint.scheduleCount === 1 && !hint.truncated
              ? ''
              : 's'}
          </span>
        </button>
      {/each}
    </div>
  {:else if coursesWithNoValidSections.length === 0}
    <p class="text-sm opacity-80">
      No schedules fit, and no single change unlocks one. Try removing a course, unpinning a section, or relaxing
      several constraints.
    </p>
  {/if}
</div>
