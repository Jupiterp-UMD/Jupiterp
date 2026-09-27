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
  }

  let { codes, selected = $bindable(), id }: Props = $props();

  const LIST_ID = $derived(`${id}-list`);

  let open = $state(false);
  let query = $state('');
  let active = $state(0);

  let root: HTMLDivElement | undefined = $state();
  let button: HTMLButtonElement | undefined = $state();
  let input: HTMLInputElement | undefined = $state();
  let listElement: HTMLUListElement | undefined = $state();
  let nativeSelect: HTMLSelectElement | undefined = $state();

  const normalize = (text: string) => text.toLowerCase().trim();

  let options = $derived.by(() => {
    const q = normalize(query);
    let baseOptions = [null, ...codes];

    if (q) {
      baseOptions = baseOptions.filter((code: string | null) =>
        code === null ? 'all courses'.includes(q) : normalize(code).includes(q)
      );
    }

    return baseOptions.sort((a, b) => {
      if (a === selected) return -1;
      if (b === selected) return 1;
      return 0;
    });
  });

  function openList() {
    if (window.matchMedia('(pointer: coarse)').matches && nativeSelect) {
      nativeSelect.showPicker();
      return;
    }
    // Reset search query when opening so the full list (sorted) displays
    query = '';
    const index = options.indexOf(selected);
    active = index !== -1 ? index : 0;
    open = true;
  }

  function choose(code: string | null) {
    selected = code;
    open = false;
    button?.focus();
  }

  function handleNativeChange(event: Event) {
    const val = (event.target as HTMLSelectElement).value;
    selected = val === '' ? null : val;
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      active = (active + 1) % options.length;
      scrollActiveIntoView();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      active = (active - 1 + options.length) % options.length;
      scrollActiveIntoView();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (options.length > 0 && active < options.length) {
        choose(options[active]);
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      open = false;
      button?.focus();
    }
  }

  function scrollActiveIntoView() {
    if (!listElement) return;
    const activeEl = listElement.children[active] as HTMLElement;
    if (!activeEl) return;

    const { scrollTop, clientHeight } = listElement;
    const { offsetTop, offsetHeight } = activeEl;

    if (offsetTop < scrollTop) {
      listElement.scrollTop = offsetTop;
    } else if (offsetTop + offsetHeight > scrollTop + clientHeight) {
      listElement.scrollTop = offsetTop + offsetHeight - clientHeight;
    }
  }

  $effect(() => {
    if (open) {
      input?.focus();
      scrollActiveIntoView();
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

<div bind:this={root} class="relative flex flex-row items-center gap-3">
  <div class="relative w-40 sm:w-56">
    <select
      bind:this={nativeSelect}
      value={selected ?? ''}
      onchange={handleNativeChange}
      class="pointer-events-none absolute inset-0 z-0 h-full w-full opacity-0"
      tabindex="-1"
      aria-hidden="true"
    >
      <option value="">All courses</option>
      {#each codes as code (code)}
        <option value={code}>{code}</option>
      {/each}
    </select>

    <!-- The trigger element functions directly as the search input when open -->
    <div class="relative z-10 w-full">
      {#if !open}
        <button
          bind:this={button}
          class="border-outline hover:bg-hover flex h-8 w-full flex-row items-center justify-between gap-2 rounded-lg border-2 px-4 py-1 font-semibold transition-colors"
          aria-haspopup="listbox"
          aria-expanded="false"
          aria-controls={undefined}
          onclick={openList}
          type="button"
        >
          <span class={selected ? 'text-orange font-semibold' : ''}>
            {selected ?? 'All courses'}
          </span>
          <AngleDownOutline class="h-4 w-4 transition-transform" />
        </button>
      {:else}
        <div
          class="border-outline flex h-8 w-full flex-row items-center justify-between gap-2 rounded-t-lg border-2 px-4 py-1"
        >
          <input
            bind:this={input}
            bind:value={query}
            oninput={() => (active = 0)}
            onkeydown={onKeydown}
            type="text"
            placeholder={selected ?? 'All courses'}
            autocomplete="off"
            role="combobox"
            aria-expanded="true"
            aria-controls={LIST_ID}
            aria-haspopup="listbox"
            aria-activedescendant={options.length > 0 ? `${LIST_ID}-${active}` : undefined}
            class="placeholder:text-primary text-text w-full border-0 bg-transparent p-0 text-sm font-semibold [outline:none] focus:ring-0"
          />
          <AngleDownOutline class="h-4 w-4 rotate-180 transition-transform" />
        </div>
      {/if}
    </div>

    {#if open}
      <div
        class="border-outline bg-bg-primary absolute left-0 top-full z-20 flex w-40 flex-col overflow-hidden rounded-b-lg border-2 border-t-0 shadow-lg sm:w-56"
      >
        <ul bind:this={listElement} id={LIST_ID} role="listbox" class="max-h-[calc(100vh-10rem)] overflow-y-auto">
          {#each options as code, i (code ?? 'all')}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <li
              id="{LIST_ID}-{i}"
              role="option"
              aria-selected={i === active}
              class="cursor-pointer select-none px-4 py-1"
              class:bg-hover={i === active || (code === selected && active === options.indexOf(selected))}
              class:text-orange={code === selected}
              class:font-semibold={code === selected}
              class:underline={code === selected}
              onpointermove={() => {
                if (active !== i) active = i;
              }}
              onclick={() => choose(code)}
            >
              {code ?? 'All courses'}
            </li>
          {:else}
            <li class="text-text-secondary px-4 py-2" role="presentation">No matching course</li>
          {/each}
        </ul>
      </div>
    {/if}
  </div>
</div>
