<!--
This file is part of Jupiterp. For terms of use, please see LICENSE at
https://github.com/atcupps/Jupiterp/LICENSE.

Searchable professor selector with keyboard navigation.
-->
<script lang="ts">
  import { tick } from 'svelte';
  import { AngleDownOutline } from 'flowbite-svelte-icons';
  import type { ComparisonProfessor } from '../../lib/professor/Comparison';

  interface Props {
    professors: ComparisonProfessor[];
    selected: string;
    excluded: string;
    id: string;
    label: string;
  }
  let { professors, selected = $bindable(), excluded, id, label }: Props = $props();
  let open = $state(false);
  let query = $state('');
  let active = $state(0);
  let root: HTMLDivElement;
  let trigger: HTMLButtonElement | undefined = $state();
  let input: HTMLInputElement | undefined = $state();
  let list: HTMLDivElement | undefined = $state();
  let chosen = $derived(professors.find((professor) => professor.slug === selected));
  let options = $derived(
    professors
      .filter(
        (professor) => professor.slug !== excluded && professor.name.toLowerCase().includes(query.trim().toLowerCase())
      )
      .sort((a, b) => Number(b.slug === selected) - Number(a.slug === selected))
  );

  async function show() {
    query = '';
    active = 0;
    open = true;
    await tick();
    input?.focus();
  }

  async function close() {
    open = false;
    await tick();
    trigger?.focus();
  }

  function choose(slug: string) {
    selected = slug;
    void close();
  }

  async function keydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      void close();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (options[active]) choose(options[active].slug);
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!options.length) return;
      active = (active + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length;
      await tick();
      list?.children[active]?.scrollIntoView({ block: 'nearest' });
    } else if (event.key === 'Tab') {
      open = false;
    }
  }
</script>

<svelte:window
  onpointerdown={(event) => {
    if (open && root && !root.contains(event.target as Node)) open = false;
  }}
/>

<div bind:this={root} class="relative">
  {#if open}
    <div class="border-outline flex items-center rounded-t-lg border-2 px-4 py-2">
      <input
        bind:this={input}
        {id}
        class="placeholder:text-text-secondary min-w-0 flex-1 border-0 bg-transparent p-0 text-base font-semibold outline-none focus:ring-0"
        bind:value={query}
        oninput={() => (active = 0)}
        onkeydown={keydown}
        placeholder={chosen?.name ?? 'Search professor (Ex: naren)'}
        aria-label={label}
        role="combobox"
        aria-expanded="true"
        aria-controls={`${id}-options`}
        aria-autocomplete="list"
        aria-activedescendant={options[active] ? `${id}-option-${options[active].slug}` : undefined}
        autocomplete="off"
      />
      <button type="button" class="ml-2 shrink-0" aria-label="Close professor list" onclick={close}
        ><AngleDownOutline class="h-4 w-4 rotate-180" /></button
      >
    </div>
    <div
      bind:this={list}
      id={`${id}-options`}
      role="listbox"
      aria-label={label}
      class="custom-scrollbar border-outline bg-bg-primary absolute left-0 right-0 top-full z-20 max-h-72 overflow-y-auto rounded-b-lg border-2 border-t-0 shadow-lg"
    >
      {#each options as professor, index (professor.slug)}
        <button
          type="button"
          id={`${id}-option-${professor.slug}`}
          role="option"
          aria-selected={professor.slug === selected}
          tabindex="-1"
          class="hover:bg-hover block w-full px-4 py-2 text-left"
          class:bg-hover={index === active}
          class:text-orange={professor.slug === selected}
          class:font-semibold={professor.slug === selected}
          class:underline={professor.slug === selected}
          onpointermove={() => (active = index)}
          onclick={() => choose(professor.slug)}
        >
          <span class="block">{professor.name}</span>
          <span class="text-text-secondary block text-xs no-underline"
            >{professor.current ? 'Teaching now' : 'Previously taught'}</span
          >
        </button>
      {:else}
        <p class="text-text-secondary px-4 py-3 text-sm">No matching professors</p>
      {/each}
    </div>
  {:else}
    <button
      bind:this={trigger}
      {id}
      type="button"
      class="border-outline hover:bg-hover flex w-full items-center justify-between gap-3 rounded-lg border-2 px-4 py-2 text-left font-semibold"
      aria-label={`${label}: ${chosen?.name ?? 'Select a professor'}`}
      aria-haspopup="listbox"
      aria-expanded="false"
      onclick={show}
    >
      <span class:text-orange={!!chosen}>{chosen?.name ?? 'Select a professor'}</span>
      <AngleDownOutline class="h-4 w-4 shrink-0" />
    </button>
  {/if}
</div>
