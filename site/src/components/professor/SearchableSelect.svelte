<!--
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).
Copyright (C) 2026 Andrew Cupps

Generic searchable single-select dropdown.
-->
<script lang="ts">
  import { tick, untrack } from 'svelte';
  import { AngleDownOutline } from 'flowbite-svelte-icons';

  interface Props {
    options: { value: string | null; label: string }[];
    selected: string | null;
    id: string;
    placeholder?: string;
    label: string;
    widthClass?: string;
    compact?: boolean;
  }

  let {
    options: choices,
    selected = $bindable(),
    id,
    placeholder = 'Select',
    label,
    widthClass = 'w-40 sm:w-56',
    compact = false,
  }: Props = $props();

  const LIST_ID = $derived(`${id}-list`);

  let open = $state(false);
  let query = $state('');
  let active = $state(0);

  let root: HTMLDivElement | undefined = $state();
  let button: HTMLButtonElement | undefined = $state();
  let input: HTMLInputElement | undefined = $state();
  let listElement: HTMLUListElement | undefined = $state();

  const normalize = (text: string) => text.toLowerCase().trim();

  let options = $derived(choices.filter((option) => normalize(option.label).includes(normalize(query))));
  let selectedLabel = $derived(choices.find((option) => option.value === selected)?.label ?? placeholder);

  function openList() {
    // Reset search query when opening so the full list (sorted) displays
    query = '';
    const index = options.findIndex((option) => option.value === selected);
    active = index !== -1 ? index : 0;
    open = true;
  }

  async function choose(value: string | null) {
    selected = value;
    open = false;
    await tick();
    button?.focus();
  }

  async function onKeydown(event: KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (options.length === 0) return;
      active = (active + 1) % options.length;
      await tick();
      scrollActiveIntoView();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (options.length === 0) return;
      active = (active - 1 + options.length) % options.length;
      await tick();
      scrollActiveIntoView();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (options.length > 0 && active < options.length) {
        choose(options[active].value);
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      open = false;
      await tick();
      button?.focus();
    }
  }

  function scrollActiveIntoView() {
    listElement?.children[active]?.scrollIntoView({ block: 'nearest' });
  }

  $effect(() => {
    if (open && input && listElement) {
      input.focus();
      untrack(scrollActiveIntoView);
    }
  });
</script>

<svelte:window
  onpointerdown={(event) => {
    if (open && root && !root.contains(event.target as Node)) {
      open = false;
    }
  }}
/>

<div
  bind:this={root}
  class="relative flex flex-row items-center gap-3"
  onfocusout={(event) => {
    if (event.relatedTarget && root && !root.contains(event.relatedTarget as Node)) open = false;
  }}
>
  <div class="relative {widthClass}">
    <!-- The trigger element functions directly as the search input when open -->
    <div class="relative z-10 w-full">
      {#if !open}
        <button
          bind:this={button}
          {id}
          aria-label={`${label}: ${selectedLabel}`}
          class="border-outline hover:bg-hover flex h-8 w-full flex-row items-center justify-between gap-2 rounded-lg border-2 py-1 font-semibold transition-colors {compact
            ? 'px-2'
            : 'px-4'}"
          aria-haspopup="listbox"
          aria-expanded="false"
          aria-controls={undefined}
          onclick={openList}
          type="button"
        >
          <span class="min-w-0 flex-1 truncate text-left" class:text-orange={selected !== null}>
            {selectedLabel}
          </span>
          <AngleDownOutline class="h-4 w-4 shrink-0 transition-transform" />
        </button>
      {:else}
        <div
          class="border-outline flex h-8 w-full flex-row items-center justify-between gap-2 rounded-t-lg border-2 py-1 {compact
            ? 'px-2'
            : 'px-4'}"
        >
          <input
            bind:this={input}
            {id}
            aria-label={label}
            bind:value={query}
            oninput={() => (active = 0)}
            onkeydown={onKeydown}
            type="text"
            placeholder={selectedLabel}
            autocomplete="off"
            role="combobox"
            aria-expanded="true"
            aria-controls={LIST_ID}
            aria-haspopup="listbox"
            aria-activedescendant={options.length > 0 ? `${LIST_ID}-${active}` : undefined}
            class="placeholder:text-text-secondary w-full min-w-0 origin-left scale-[0.875] border-0 bg-transparent p-0 text-base font-semibold [outline:none] focus:ring-0"
          />
          <AngleDownOutline class="h-4 w-4 shrink-0 rotate-180 transition-transform" />
        </div>
      {/if}
    </div>

    {#if open}
      <div
        class="border-outline bg-bg-primary absolute left-0 top-full z-20 flex w-full flex-col overflow-hidden rounded-b-lg border-2 border-t-0 shadow-lg"
      >
        <ul
          bind:this={listElement}
          id={LIST_ID}
          role="listbox"
          tabindex="-1"
          class="max-h-[calc(100vh-10rem)] overflow-y-auto"
        >
          {#each options as option, i (option.value)}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <li
              id="{LIST_ID}-{i}"
              role="option"
              aria-selected={i === active}
              class="cursor-pointer select-none py-1 {compact ? 'px-2' : 'px-4'}"
              class:bg-hover={i === active}
              class:text-orange={option.value === selected}
              class:font-semibold={option.value === selected}
              class:underline={option.value === selected}
              onpointermove={() => {
                if (active !== i) active = i;
              }}
              onclick={() => choose(option.value)}
            >
              {option.label}
            </li>
          {:else}
            <li class="text-text-secondary px-4 py-2" role="presentation">No matching option</li>
          {/each}
        </ul>
      </div>
    {/if}
  </div>
</div>
