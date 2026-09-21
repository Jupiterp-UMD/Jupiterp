<!--
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).

-->
<script lang="ts">
  import { Dropdown, DropdownItem } from 'flowbite-svelte';
  import { AngleDownOutline } from 'flowbite-svelte-icons';

  interface Props {
    options?: { value: string; label: string }[];
    value: string;
    onChange: (value: string) => void;
    title?: string;
    // Extra classes for the trigger button (e.g. width control).
    buttonClass?: string;
  }

  let { options = [], value, onChange, title = '', buttonClass = '' }: Props = $props();

  let selected = $derived(options.find((o) => o.value === value));
  let dropdownOpen = $state(false);

  function choose(next: string) {
    dropdownOpen = false;
    onChange(next);
  }
</script>

<button
  type="button"
  class="border-outline bg-bg-primary hover:border-orange flex items-center justify-between gap-1 rounded-md border px-2 py-0.5 text-left {buttonClass}"
  {title}
>
  <span class="truncate">{selected ? selected.label : value}</span>
  <AngleDownOutline class="h-3 w-3 shrink-0 opacity-70" />
</button>

<!-- TEMP FIX: Added "-translate-y-2" to fix dropdown positioning -->
<Dropdown
  bind:isOpen={dropdownOpen}
  class="bg-border text-text-primary border-outline scrollbar-track-border scrollbar-thumb-bg-primary z-30 max-h-60 -translate-y-2 overflow-y-auto rounded-md border shadow-lg"
>
  {#each options as option (option.value)}
    <DropdownItem
      class="hover:bg-hover px-3 py-1 text-left text-sm {option.value === value ? 'text-orange font-semibold' : ''}"
      onclick={() => choose(option.value)}
    >
      {option.label}
    </DropdownItem>
  {/each}
</Dropdown>
