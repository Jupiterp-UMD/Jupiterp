<!--
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).

-->
<!--
	Shared course-search box: the search input, filters, and professor/department
	suggestion dropdowns used by both the main planner (CourseSearch.svelte) and
	the schedule generator (GeneratorCourseSearch.svelte). The owning component
	supplies the results rendering via the default slot.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import {
    deptCodeToName,
    matchingStandardizedProfessorNames,
    pendingResults,
    setSearchResults,
  } from '../../../lib/course-planner/CourseSearch';
  import { applyProfessorSelection, getProfPartial } from '../../../lib/course-planner/CourseSuggestions';
  import { DeptSuggestionsStore, SearchResultsStore } from '../../../stores/CoursePlannerStores';
  import type { Course } from '@jupiterp/jupiterp';
  import CourseFilters from './CourseFilters.svelte';

  interface Props {
    /** Current search text. Two-way bound so the parent can read/clear it. */
    searchInput?: string;
    /** Whether the gen-ed filter menu is open; forwarded to CourseFilters. */
    genEdMenuOpen?: boolean;
    /** Optional id for the input element (the planner relies on this). */
    inputId?: string;
    /** Optional placeholder text for the input element. */
    placeholder?: string;
    /** Bound back to the parent so it can manage focus (mobile activation). */
    inputElement?: HTMLInputElement | null;
    /** Focus/blur handlers for the planner's mobile keyboard activation. */
    onFocus?: (event: FocusEvent) => void;
    onBlur?: (event: FocusEvent) => void;

    /** The default slot for the search results. */
    children?: Snippet<
      [
        {
          searchResults: Course[];
          isPending: boolean;
          profSuggestions: string[];
        },
      ]
    >;
    /** Replaces <slot name="beforeInput" /> */
    beforeInput?: Snippet;
  }

  // Destructure props with their original default values
  let {
    searchInput = $bindable(''), // $bindable allows two-way binding back to parent
    genEdMenuOpen = $bindable(false),
    inputId = undefined,
    placeholder = "Search courses (e.g. 'MATH140') or @professor",
    inputElement = $bindable(null),
    onFocus = () => {},
    onBlur = () => {},

    children = undefined,
    beforeInput = undefined,
  }: Props = $props();

  let searchResults: Course[] = $state([]);
  SearchResultsStore.subscribe((results) => {
    searchResults = results;
  });

  // Department suggestions shown for ambiguous partial department codes.
  let deptSuggestions: string[] = $state([]);
  DeptSuggestionsStore.subscribe((suggestions) => {
    deptSuggestions = suggestions;
  });

  // Professor suggestions shown when the user types @partial in the search.
  let profSuggestions = $derived.by(() => {
    const partial = getProfPartial(searchInput);
    return partial ? matchingStandardizedProfessorNames(partial) : [];
  });

  // Unified suggestion type (exclusive OR): either a prof or a dept
  type Suggestion = { kind: 'prof'; value: string } | { kind: 'dept'; value: string };

  // 1. Ordinary mutable state uses $state
  let highlightedIndex = $state(-1);
  let isPending = $state(false);

  // 2. Computed arrays use $derived
  const suggestionItems = $derived<Suggestion[]>(
    profSuggestions.length > 0
      ? profSuggestions.map((name) => ({ kind: 'prof', value: name }))
      : searchInput.length > 0 && deptSuggestions.length > 1
        ? deptSuggestions.map((code) => ({ kind: 'dept', value: code }))
        : []
  );

  // 3. Side effects and state synchronization use $effect
  $effect(() => {
    if (suggestionItems.length === 0) {
      highlightedIndex = -1;
    } else if (highlightedIndex >= suggestionItems.length) {
      highlightedIndex = suggestionItems.length - 1;
    }
  });

  $effect(() => {
    if (searchInput.length > 0 && searchResults.length === 0) {
      isPending = pendingResults();
    } else {
      isPending = false;
    }
  });

  /**
   * Replaces the @partial token with @"Full Name" (multi-word) or @Name
   * (single-word) and triggers a new search.
   * @param name The standardized professor name to insert
   */
  function selectProfessor(name: string) {
    if (getProfPartial(searchInput) === null) return;
    searchInput = applyProfessorSelection(searchInput, name);
    highlightedIndex = -1;
    setSearchResults(searchInput);
  }

  function selectDepartment(dept: string) {
    searchInput = dept;
    highlightedIndex = -1;
    setSearchResults(dept);
  }

  function selectSuggestionByIndex(index: number) {
    const s = suggestionItems[index];
    if (!s) return;
    if (s.kind === 'prof') selectProfessor(s.value);
    else selectDepartment(s.value);
  }

  function handleKeydown(event: KeyboardEvent) {
    if (suggestionItems.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      highlightedIndex = (highlightedIndex + 1) % suggestionItems.length;
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      highlightedIndex = highlightedIndex > 0 ? highlightedIndex - 1 : suggestionItems.length - 1;
    } else if (event.key === 'Enter' && highlightedIndex >= 0) {
      event.preventDefault();
      selectSuggestionByIndex(highlightedIndex);
    }
  }
</script>

<div class="relative flex w-full flex-col">
  {@render beforeInput?.()}
  <input
    type="text"
    bind:this={inputElement}
    id={inputId}
    bind:value={searchInput}
    onfocus={onFocus}
    onblur={onBlur}
    oninput={() => setSearchResults(searchInput)}
    onkeydown={handleKeydown}
    class="border-outline w-full rounded-lg border-2 border-solid bg-transparent px-2 py-0 text-xl placeholder:text-base lg:text-base lg:placeholder:text-sm"
    autocomplete="off"
    {placeholder}
  />

  <CourseFilters bind:showGenEdMenu={genEdMenuOpen} />

  <!-- Unified suggestions (professor OR department) -->
  {#if suggestionItems.length > 0}
    <div class="border-outline bg-bg-primary mb-0.5 overflow-clip rounded-lg border shadow-lg">
      <div class="custom-scrollbar max-h-72 overflow-y-auto">
        {#each suggestionItems as item, index (item.value)}
          <button
            type="button"
            class={[
              'hover:bg-border flex w-full px-3 py-1 text-left text-base transition-colors lg:text-sm',
              item.kind === 'dept' ? 'items-end' : 'items-center',
              highlightedIndex === index && 'bg-outline/20',
            ]}
            onmouseenter={() => (highlightedIndex = index)}
            onclick={() => selectSuggestionByIndex(index)}
          >
            {#if item.kind === 'prof'}
              <span class="grow truncate font-black"><span class="font-normal">@</span>{item.value}</span>
            {:else}
              <span class="min-w-[17%] shrink-0 font-black">{item.value}</span>
              <span class="grow self-center truncate text-xs italic">{deptCodeToName[item.value]}</span>
            {/if}
          </button>
        {/each}
      </div>
    </div>
  {/if}

  {@render children?.({ searchResults, isPending, profSuggestions })}
</div>
