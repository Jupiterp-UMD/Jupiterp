<!--
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).
Copyright (C) 2026 Andrew Cupps

Searchable course dropdown that scopes the professor page. A chip per course
stopped scaling once a professor had taught more than a handful.
-->
<script lang="ts">
  import { AngleDownOutline } from 'flowbite-svelte-icons';

  interface Props {
    codes: string[];
    selected: string | null;
    id: string;
    onAccent?: boolean;
  }

  let { codes, selected = $bindable(), id, onAccent = false }: Props = $props();

  let LIST_ID = $derived(`${id}-list`);

  let open = $state(false);
  let query = $state('');
  let active = $state(0);
  let root: HTMLDivElement | undefined = $state();
  let button: HTMLButtonElement | undefined = $state();
  let input: HTMLInputElement | undefined = $state();

  const normalize = (text: string) => text.toLowerCase().replace(/\s+/g, '');

  let options = $derived.by(() => {
    const q = normalize(query);
    const matches: (string | null)[] = codes.filter((code) => normalize(code).includes(q));
    return q === '' ? [null, ...matches] : matches;
  });

  function openList() {
    query = '';
    active = Math.max(0, options.indexOf(selected));
    open = true;
  }

  function choose(code: string | null) {
    selected = code;
    open = false;
    button?.focus();
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      active = Math.min(options.length - 1, active + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      active = Math.max(0, active - 1);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (active < options.length) choose(options[active]);
    } else if (event.key === 'Escape') {
      open = false;
      button?.focus();
    }
  }

  $effect(() => {
    if (open) input?.focus();
  });

  $effect(() => {
    if (open) document.getElementById(`${LIST_ID}-${active}`)?.scrollIntoView({ block: 'nearest' });
  });
</script>

<svelte:window
  onpointerdown={(event) => {
    if (open && root && !root.contains(event.target as Node)) open = false;
  }}
/>

<div bind:this={root} class="relative flex flex-row items-center gap-3">
  <span class="font-medium" class:text-bg-primary={onAccent}>Course</span>
  <button
    bind:this={button}
    class="flex w-56 flex-row items-center justify-between gap-2 rounded-lg border-2 px-4 py-2 font-semibold transition-colors {onAccent
      ? 'border-bg-primary text-bg-primary hover:bg-bg-primary/15 focus-visible:outline-bg-primary'
      : 'border-outline hover:bg-hover'}"
    aria-haspopup="listbox"
    aria-expanded={open}
    onclick={() => (open ? (open = false) : openList())}
  >
    {selected ?? 'All courses'}
    <AngleDownOutline class="h-4 w-4 transition-transform {open ? 'rotate-180' : ''}" />
  </button>

  {#if open}
    <div
      class="border-outline bg-bg-primary absolute left-0 top-full z-20 mt-2 flex w-72 flex-col overflow-hidden rounded-lg border-2 shadow-lg"
    >
      <input
        bind:this={input}
        bind:value={query}
        oninput={() => (active = 0)}
        onkeydown={onKeydown}
        type="text"
        placeholder="Search courses"
        autocomplete="off"
        role="combobox"
        aria-expanded="true"
        aria-controls={LIST_ID}
        aria-activedescendant={options.length > 0 ? `${LIST_ID}-${active}` : undefined}
        class="border-outline bg-bg-primary text-text-primary border-0 border-b-2 px-4 py-3 focus:ring-0"
      />
      <ul id={LIST_ID} role="listbox" class="max-h-72 overflow-y-auto py-1">
        {#each options as code, i (code ?? 'all')}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <li
            id="{LIST_ID}-{i}"
            role="option"
            aria-selected={code === selected}
            class="cursor-pointer px-4 py-2"
            class:bg-hover={i === active}
            class:text-orange={code === selected}
            class:font-semibold={code === selected}
            onpointerenter={() => (active = i)}
            onclick={() => choose(code)}
          >
            {code ?? 'All courses'}
          </li>
        {:else}
          <li class="text-text-secondary px-4 py-2">No matching course</li>
        {/each}
      </ul>
    </div>
  {/if}
</div>
