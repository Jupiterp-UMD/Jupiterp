<!-- This file is part of Jupiterp. See LICENSE at the repository root.
     Live professor directory: paged name search and course-specific cards. -->
<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import type { Snapshot } from '@sveltejs/kit';
  import type { CourseMinified } from '@jupiterp/jupiterp';
  import { TERM_NAME } from '$lib/term';
  import { client } from '$lib/client';
  import { loadDirectoryPage } from '$lib/professor/DirectoryData';
  import {
    commonCourseCodes,
    orderDirectoryRows,
    type DirectoryProfessor,
    type DirectorySort,
  } from '$lib/professor/DirectoryModel';
  import {
    loadComparisonProfessors,
    loadCourseSuggestions,
    loadRatings,
    MAX_COMPARED,
    type ProfessorRating,
  } from '$lib/professor/Comparison';
  import { displayRating } from '$lib/professor/Rating';
  import { gpaOf, formatSemester, formatPercent, type GradeDistribution } from '$lib/course-planner/Grades';
  import type { InstructorFull } from '$lib/api/types';
  import DirectoryGrades from '../../components/professor/DirectoryGrades.svelte';
  import SearchableSelect from '../../components/professor/SearchableSelect.svelte';

  interface DirectoryState {
    mode: 'name' | 'course';
    query: string;
    activeOnly: boolean;
    hasRatings: boolean;
    hasGrades: boolean;
    letter: string;
    sort: DirectorySort;
    rows: DirectoryProfessor[];
    total: number | null;
    cursor: number;
    more: boolean;
    course: string;
    courseName: string;
    overall: GradeDistribution | null;
    courseRows: DirectoryProfessor[];
    currentSlugs: string[];
    courseSort: string;
    visible: number;
    selected: DirectoryProfessor[];
    compareCourse: string;
    scrollTop: number;
  }
  let model = $state<DirectoryState>({
    mode: 'name',
    query: '',
    activeOnly: true,
    hasRatings: false,
    hasGrades: false,
    letter: '',
    sort: 'name.asc',
    rows: [],
    total: null,
    cursor: 0,
    more: false,
    course: '',
    courseName: '',
    overall: null,
    courseRows: [],
    currentSlugs: [],
    courseSort: 'graded.desc',
    visible: 6,
    selected: [],
    compareCourse: '',
    scrollTop: 0,
  });
  let status = $state<'idle' | 'loading' | 'loaded' | 'error'>('loading');
  let warning = $state('');
  let notice = $state('');
  let search: HTMLInputElement | undefined = $state();
  let scroller: HTMLElement | undefined = $state();
  let suggestions = $state<CourseMinified[]>([]);
  let suggestionsOpen = $state(false);
  let activeSuggestion = $state(-1);
  let requestId = 0;
  let suggestionId = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  let courseSorted = $derived.by(() => {
    const rows = model.activeOnly
      ? model.courseRows.filter((row) => model.currentSlugs.includes(row.instructor.slug))
      : model.courseRows;
    if (model.courseSort === 'current')
      return [...rows].sort(
        (a, b) =>
          Number(model.currentSlugs.includes(b.instructor.slug)) -
            Number(model.currentSlugs.includes(a.instructor.slug)) || a.instructor.name.localeCompare(b.instructor.name)
      );
    return orderDirectoryRows(rows, model.courseSort as DirectorySort);
  });
  let commonCourses = $derived(commonCourseCodes(model.selected));
  let selectedSlugs = $derived(model.selected.map((row) => row.instructor.slug));
  let compareCode = $derived(
    model.mode === 'course' && model.course ? model.course : model.compareCourse || commonCourses[0] || ''
  );
  let compareHref = $derived(
    `${resolve('/professors/compare')}?${new URLSearchParams({ course: compareCode, profs: selectedSlugs.join(','), view: 'pick' })}`
  );
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const nameSorts = [
    { value: 'name.asc', label: 'Name A–Z' },
    { value: 'name.desc', label: 'Name Z–A' },
    { value: 'average_rating.desc', label: 'Top rated' },
    { value: 'average_rating.asc', label: 'Lowest rated' },
    { value: 'gpa.desc', label: 'Highest GPA' },
    { value: 'gpa.asc', label: 'Lowest GPA' },
    { value: 'graded.desc', label: 'Most students' },
    { value: 'graded.asc', label: 'Fewest students' },
  ];
  const courseSorts = [
    ['graded.desc', 'Most students'],
    ['gpa.desc', 'Highest GPA'],
    ['average_rating.desc', 'Top rated'],
    ['current', `Teaching ${TERM_NAME}`],
  ];
  const columns: { label: string; key: DirectorySort }[] = [
    { label: 'Professor', key: 'name.asc' },
    { label: 'Rating', key: 'average_rating.desc' },
    { label: 'Avg GPA', key: 'gpa.desc' },
    { label: 'Students', key: 'graded.desc' },
  ];

  export const snapshot: Snapshot<DirectoryState> = {
    capture: () => ({ ...model, scrollTop: scroller?.scrollTop ?? 0 }),
    restore: (saved) => {
      ++requestId;
      ++suggestionId;
      clearTimeout(timer);
      model = saved;
      status = saved.mode === 'course' && !saved.course ? 'idle' : 'loaded';
      void tick().then(() => scroller?.scrollTo({ top: saved.scrollTop, behavior: 'instant' }));
    },
  };
  onMount(() => {
    void runNames(false);
  });
  onDestroy(() => {
    requestId++;
    suggestionId++;
    clearTimeout(timer);
  });

  async function runNames(append = false) {
    if (model.mode !== 'name') return;
    const id = ++requestId;
    status = 'loading';
    warning = '';
    if (!append) {
      model.rows = [];
      model.cursor = 0;
      model.total = null;
      model.more = false;
    }
    const config = {
      query: model.query.trim(),
      activeOnly: model.activeOnly,
      hasRatings: model.hasRatings,
      hasGrades: model.hasGrades,
      letter: model.letter,
      sort: model.sort,
    };
    try {
      const result = await loadDirectoryPage(config, append ? model.cursor : 0, () => id !== requestId);
      if (id !== requestId) return;
      const known = new Set(append ? model.rows.map((row) => row.instructor.slug) : []);
      model.rows = [...(append ? model.rows : []), ...result.rows.filter((row) => !known.has(row.instructor.slug))];
      model.cursor = result.cursor;
      model.more = result.more;
      model.total = result.total;
      warning = result.warning;
      status = 'loaded';
    } catch {
      if (id === requestId) {
        status = 'error';
        warning = 'Professors could not be loaded. Please try again.';
      }
    }
  }

  function changeMode(mode: 'name' | 'course') {
    if (mode === model.mode) return;
    ++requestId;
    ++suggestionId;
    clearTimeout(timer);
    model.mode = mode;
    model.query = '';
    model.letter = '';
    suggestions = [];
    suggestionsOpen = false;
    notice = '';
    warning = '';
    if (mode === 'name') void runNames(false);
    else status = model.course ? 'loaded' : 'idle';
  }
  function changeFilters() {
    clearTimeout(timer);
    model.visible = 6;
    if (!model.hasGrades && (model.sort.startsWith('gpa.') || model.sort.startsWith('graded.')))
      model.sort = 'name.asc';
    if (model.mode === 'name') void runNames(false);
  }
  function sortNames(sort: DirectorySort) {
    model.sort = sort;
    if (sort.startsWith('average_rating.')) model.hasRatings = true;
    if (sort.startsWith('gpa.') || sort.startsWith('graded.')) model.hasGrades = true;
    model.letter = '';
    void runNames(false);
  }
  function toggleSort(key: DirectorySort) {
    sortNames(
      model.sort === key && key.endsWith('desc')
        ? (key.replace('desc', 'asc') as DirectorySort)
        : model.sort === key && key === 'name.asc'
          ? 'name.desc'
          : key
    );
  }
  function handleInput() {
    clearTimeout(timer);
    suggestions = [];
    activeSuggestion = -1;
    if (model.mode === 'name') {
      ++requestId;
      model.letter = '';
      timer = setTimeout(() => void runNames(false), 250);
      return;
    }
    const prefix = model.query.replace(/\s+/g, '').toUpperCase();
    const id = ++suggestionId;
    suggestionsOpen = true;
    if (prefix.length < 2) return;
    timer = setTimeout(() => {
      void loadCourseSuggestions(prefix)
        .then((rows) => {
          if (id === suggestionId) suggestions = rows;
        })
        .catch(() => {
          if (id === suggestionId) suggestions = [];
        });
    }, 180);
  }
  function searchKey(event: KeyboardEvent) {
    if (model.mode !== 'course') return;
    if (event.key === 'ArrowDown' && suggestions.length) {
      event.preventDefault();
      activeSuggestion = (activeSuggestion + 1) % suggestions.length;
    } else if (event.key === 'ArrowUp' && suggestions.length) {
      event.preventDefault();
      activeSuggestion = (activeSuggestion - 1 + suggestions.length) % suggestions.length;
    } else if (event.key === 'Enter') {
      event.preventDefault();
      void loadCourse(
        suggestionsOpen && activeSuggestion >= 0 ? suggestions[activeSuggestion].courseCode : model.query
      );
    } else if (event.key === 'Escape') suggestionsOpen = false;
  }

  async function loadCourse(raw: string) {
    const code = raw.replace(/\s+/g, '').toUpperCase();
    clearTimeout(timer);
    ++suggestionId;
    suggestionsOpen = false;
    suggestions = [];
    if (!/^[A-Z]{4}\d{3}[A-Z]?$/.test(code)) {
      notice = 'Enter a course code, such as CMSC131.';
      return;
    }
    const id = ++requestId;
    status = 'loading';
    warning = '';
    notice = '';
    model.course = '';
    model.courseRows = [];
    model.overall = null;
    model.query = code;
    model.visible = 6;
    try {
      const result = await loadComparisonProfessors(code);
      const [ratings, title] = await Promise.allSettled([
        loadRatings(result.professors.map((professor) => professor.slug)),
        result.courseName
          ? Promise.resolve(result.courseName)
          : client.courses({ courseCodes: new Set([code]) }).then((response) => response.data?.[0]?.name ?? ''),
      ]);
      if (id !== requestId) return;
      const ratingMap = ratings.status === 'fulfilled' ? ratings.value : new Map<string, ProfessorRating | null>();
      model.courseRows = result.professors.map((professor) => {
        const rating = ratingMap.get(professor.slug);
        return {
          instructor: {
            slug: professor.slug,
            name: professor.name,
            is_active: professor.current,
            display_rating: rating?.display ?? null,
            combined_rating: rating?.ranking ?? null,
            average_rating: rating?.ranking ?? null,
            jupiterp_review_count: rating?.reviews ?? 0,
            pt_review_count: 0,
          } as InstructorFull,
          distribution: professor.distribution,
          courses: [code],
          gradesError: false,
        };
      });
      model.currentSlugs = result.professors
        .filter((professor) => professor.current)
        .map((professor) => professor.slug);
      model.course = code;
      model.courseName = title.status === 'fulfilled' ? title.value : '';
      model.overall = result.overall;
      warning = [result.warning, ratings.status === 'rejected' ? 'Ratings could not be loaded.' : '']
        .filter(Boolean)
        .join(' ');
      status = 'loaded';
    } catch {
      if (id === requestId) {
        status = 'error';
        warning = 'Course data could not be loaded. Try again.';
      }
    }
  }
  function toggle(row: DirectoryProfessor) {
    if (selectedSlugs.includes(row.instructor.slug))
      model.selected = model.selected.filter((entry) => entry.instructor.slug !== row.instructor.slug);
    else if (model.selected.length < MAX_COMPARED) model.selected = [...model.selected, row];
    model.compareCourse = '';
  }
  function letterJump(letter: string) {
    model.letter = model.letter === letter ? '' : letter;
    model.sort = 'name.asc';
    void runNames(false);
  }
  function reviewCount(row: DirectoryProfessor) {
    return (row.instructor.jupiterp_review_count ?? 0) + (row.instructor.pt_review_count ?? 0);
  }
  function percentA(distribution: GradeDistribution | null) {
    return distribution && distribution.barTotal > 0
      ? `${formatPercent(distribution.buckets.A, distribution.barTotal, 0)}%`
      : '—';
  }
  function delta(distribution: GradeDistribution | null) {
    const own = gpaOf(distribution);
    const mean = gpaOf(model.overall);
    return own === null || mean === null ? null : own - mean;
  }
  function compareSelected() {
    // The route in compareHref is resolved before adding the search parameters.
    // eslint-disable-next-line svelte/no-navigation-without-resolve
    void goto(compareHref);
  }
</script>

<svelte:head
  ><title>Professors at UMD | Jupiterp</title><meta
    name="description"
    content="Search UMD professors by name or course. Compare grades, ratings, teaching history, and student reviews."
  /></svelte:head
>
<svelte:window
  onkeydown={(event) => {
    if (event.key === '/' && event.target === document.body) {
      event.preventDefault();
      search?.focus();
    }
  }}
  onpointerdown={(event) => {
    if (!(event.target as Element).closest('.search-field')) suggestionsOpen = false;
  }}
/>

<main bind:this={scroller} class="directory custom-scrollbar">
  <div class="directory-content">
    <header class="directory-heading">
      <div>
        <h1>Professors</h1>
        <p>Search a professor, or a course to see everyone who teaches it.</p>
      </div>
    </header>
    <div class="search-toolbar">
      <div class="mode-switch" role="group" aria-label="Search mode">
        <button
          class:active={model.mode === 'name'}
          aria-pressed={model.mode === 'name'}
          onclick={() => changeMode('name')}>By name</button
        ><button
          class:active={model.mode === 'course'}
          aria-pressed={model.mode === 'course'}
          onclick={() => changeMode('course')}>By course</button
        >
      </div>
      <div class="search-field">
        <svg
          aria-hidden="true"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"><circle cx="10" cy="10" r="6" /><path d="m15 15 5 5" /></svg
        >
        <input
          bind:this={search}
          bind:value={model.query}
          oninput={handleInput}
          onkeydown={searchKey}
          onfocus={() => (suggestionsOpen = model.mode === 'course')}
          type="search"
          placeholder={model.mode === 'name'
            ? 'Search professors by name, e.g. Mohe'
            : 'Search by course, e.g. CMSC131'}
          aria-label={model.mode === 'name' ? 'Search professors by name' : 'Search by course'}
          role={model.mode === 'course' ? 'combobox' : undefined}
          aria-autocomplete={model.mode === 'course' ? 'list' : undefined}
          aria-expanded={model.mode === 'course' ? suggestionsOpen && suggestions.length > 0 : undefined}
          aria-controls={model.mode === 'course' ? 'directory-course-options' : undefined}
          aria-activedescendant={suggestionsOpen && activeSuggestion >= 0
            ? `directory-course-${activeSuggestion}`
            : undefined}
          autocomplete="off"
        />
        {#if model.mode === 'course' && suggestionsOpen && suggestions.length > 0}<div
            id="directory-course-options"
            class="suggestions"
            role="listbox"
            aria-label="Courses"
          >
            {#each suggestions as suggestion, index (suggestion.courseCode)}<button
                id={`directory-course-${index}`}
                role="option"
                aria-selected={index === activeSuggestion}
                class:active={index === activeSuggestion}
                onpointerdown={(event) => event.preventDefault()}
                onclick={() => void loadCourse(suggestion.courseCode)}
                ><b>{suggestion.courseCode}</b><span>{suggestion.name}</span></button
              >{/each}
          </div>{/if}
      </div>
      {#if model.mode === 'course'}<button class="search-course" onclick={() => void loadCourse(model.query)}
          >Search</button
        >{/if}
      <label class="teaching-toggle"
        ><span class="switch"
          ><input type="checkbox" role="switch" bind:checked={model.activeOnly} onchange={changeFilters} /><span
          ></span></span
        >Only teaching {TERM_NAME}</label
      >
    </div>
    {#if notice}<p class="notice" role="status">{notice}</p>{/if}

    {#if model.mode === 'name'}
      <div class="filters-toolbar">
        <div class="filter-controls">
          <div class="sort-control">
            <span>Sort</span>
            <SearchableSelect
              options={nameSorts}
              selected={model.sort}
              id="directory-sort"
              label="Sort professors"
              widthClass="w-44"
              compact
              onChange={(value) => {
                if (value) sortNames(value as DirectorySort);
              }}
            />
          </div>
          <button
            class:chosen={model.hasRatings}
            aria-pressed={model.hasRatings}
            onclick={() => {
              model.hasRatings = !model.hasRatings;
              changeFilters();
            }}>Has ratings</button
          ><button
            class:chosen={model.hasGrades}
            aria-pressed={model.hasGrades}
            onclick={() => {
              model.hasGrades = !model.hasGrades;
              changeFilters();
            }}>Has grade data</button
          >
        </div>
        <DirectoryGrades legend />
      </div>
      <p class="result-count" aria-live="polite">
        {#if status === 'loading'}Loading professors…{:else if model.rows.length}Showing 1–{model.rows
            .length}{model.total === null ? '' : ` of ${model.total.toLocaleString()}`} · Tick 2–{MAX_COMPARED} to compare{:else if status === 'loaded'}No
          professors match these filters.{/if}{#if model.letter}<button
            class="clear-letter"
            onclick={() => letterJump(model.letter)}>Starts with {model.letter} ×</button
          >{/if}
      </p>
      <div class="directory-table-layout">
        <div class="table-scroll custom-scrollbar">
          <table>
            <thead
              ><tr
                ><th class="select-column"><span class="sr-only">Select</span></th
                >{#each columns as column (column.label)}<th
                    aria-sort={model.sort.split('.')[0] === column.key.split('.')[0]
                      ? model.sort.endsWith('asc')
                        ? 'ascending'
                        : 'descending'
                      : 'none'}
                    ><button onclick={() => toggleSort(column.key)}
                      >{column.label}
                      <span aria-hidden="true"
                        >{model.sort.split('.')[0] === column.key.split('.')[0]
                          ? model.sort.endsWith('asc')
                            ? '↑'
                            : '↓'
                          : '↕'}</span
                      ></button
                    ></th
                  >{/each}<th>Grades</th></tr
              ></thead
            ><tbody>
              {#each model.rows as row (row.instructor.slug)}{@const rating = displayRating(
                  row.instructor
                )}{@const selected = selectedSlugs.includes(row.instructor.slug)}
                <tr class:selected
                  ><td
                    ><input
                      type="checkbox"
                      aria-label={`Select ${row.instructor.name}`}
                      checked={selected}
                      disabled={!selected && model.selected.length >= MAX_COMPARED}
                      onchange={() => toggle(row)}
                    /></td
                  ><td class="professor-cell"
                    ><a href={resolve('/professor/[slug]', { slug: row.instructor.slug })}>{row.instructor.name}</a>
                    <div class="course-chips">
                      {#each row.courses.slice(0, 3) as code (code)}<button
                          onclick={() => {
                            model.mode = 'course';
                            void loadCourse(code);
                          }}>{code}</button
                        >{:else}<span
                          >{row.gradesError ? 'Course history unavailable' : 'No past courses on record'}</span
                        >{/each}
                      {#if row.courses.length > 3}
                        <span class="more-courses" aria-label={`${row.courses.length - 3} more courses taught`}
                          >+{row.courses.length - 3}</span
                        >
                      {/if}
                    </div></td
                  ><td class="rating-cell"
                    >{#if rating !== null}<strong>{rating.toFixed(1)} <span class="star">★</span></strong><small
                        >{reviewCount(row)} {reviewCount(row) === 1 ? 'review' : 'reviews'}</small
                      >{:else}<span class="muted">No rating yet</span>{/if}</td
                  ><td class="numeric"><strong>{gpaOf(row.distribution)?.toFixed(2) ?? '—'}</strong></td><td
                    class="numeric">{row.distribution?.graded.toLocaleString() ?? '—'}</td
                  ><td class="bar-cell"
                    >{#if row.gradesError}<span class="muted">Grades unavailable</span>{:else}<DirectoryGrades
                        distribution={row.distribution}
                      />{/if}</td
                  ></tr
                >
              {/each}
            </tbody>
          </table>
        </div>
        <nav class="alphabet" aria-label="Jump to a letter">
          {#each alphabet as letter (letter)}<button
              aria-label={`Names starting with ${letter}`}
              class:active={model.letter === letter}
              aria-pressed={model.letter === letter}
              onclick={() => letterJump(letter)}>{letter}</button
            >{/each}
        </nav>
      </div>
      {#if model.more}<div class="show-more">
          <button disabled={status === 'loading'} onclick={() => void runNames(true)}>Show more</button>
        </div>{/if}
    {:else if model.course}
      <section class="course-summary" aria-label="Course summary">
        <div class="course-title">
          <small>COURSE</small>
          <h2>{model.course}</h2>
          <p>{model.courseName || 'Course teaching and grade history'}</p>
        </div>
        <div><small>Course avg GPA</small><strong>{gpaOf(model.overall)?.toFixed(2) ?? '—'}</strong></div>
        <div><small>Got an A</small><strong>{percentA(model.overall)}</strong></div>
        <div><small>Graded students</small><strong>{model.overall?.graded.toLocaleString() ?? '—'}</strong></div>
        <div class="summary-distribution">
          <DirectoryGrades distribution={model.overall} /><DirectoryGrades legend />
        </div>
      </section>
      <div class="course-results-heading">
        <h2>
          Who’s taught {model.course}
          <span>· {courseSorted.length} {model.activeOnly ? `teaching ${TERM_NAME}` : 'professors'}</span>
        </h2>
        <div class="sort-pills" role="group" aria-label="Sort course professors">
          {#each courseSorts as [value, label] (value)}<button
              class:active={model.courseSort === value}
              aria-pressed={model.courseSort === value}
              onclick={() => {
                model.courseSort = value;
                model.visible = 6;
              }}>{label}</button
            >{/each}
        </div>
      </div>
      <div class="professor-cards">
        {#each courseSorted.slice(0, model.visible) as row (row.instructor.slug)}{@const selected =
            selectedSlugs.includes(row.instructor.slug)}{@const rating = displayRating(
            row.instructor
          )}{@const difference = delta(row.distribution)}
          <article class="professor-card" class:selected>
            <div class="card-heading">
              <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
              <a href={`${resolve('/professor/[slug]', { slug: row.instructor.slug })}?course=${model.course}`}
                >{row.instructor.name}</a
              ><label
                ><input
                  type="checkbox"
                  checked={selected}
                  aria-label={`Select ${row.instructor.name}`}
                  disabled={!selected && model.selected.length >= MAX_COMPARED}
                  onchange={() => toggle(row)}
                />Compare</label
              >
            </div>
            <span class="teaching-badge" class:current={model.currentSlugs.includes(row.instructor.slug)}
              >{model.currentSlugs.includes(row.instructor.slug)
                ? `Teaching ${TERM_NAME}`
                : 'Not teaching this term'}</span
            >
            <div class="card-metrics">
              <div>
                <small>Avg GPA</small><strong>{gpaOf(row.distribution)?.toFixed(2) ?? '—'}</strong><span
                  >{difference === null
                    ? 'No grade history'
                    : `${difference >= 0 ? '+' : ''}${difference.toFixed(2)} vs course`}</span
                >
              </div>
              <div>
                <small>Rating</small><strong
                  >{rating?.toFixed(1) ?? '—'}{#if rating !== null}<span class="star"> ★</span>{/if}</strong
                ><span>{reviewCount(row)} reviews</span>
              </div>
              <div>
                <small>Got an A</small><strong>{percentA(row.distribution)}</strong><span
                  >{row.distribution
                    ? `${row.distribution.graded.toLocaleString()} students`
                    : 'No grade history'}</span
                >
              </div>
            </div>
            <DirectoryGrades distribution={row.distribution} />
            <p class="last-taught">
              {row.distribution?.lastTerm
                ? `Latest grade data for ${model.course}: ${formatSemester(row.distribution.lastTerm)}`
                : 'No linked grade history yet'}
            </p>
          </article>{/each}
      </div>
      {#if !courseSorted.length}<p class="empty">
          {model.activeOnly
            ? 'No current instructors found. Turn off “Only teaching” to include previous professors.'
            : 'No professors found for this course.'}
        </p>{/if}
      {#if model.visible < courseSorted.length}<div class="show-more">
          <button onclick={() => (model.visible += 6)}>Show more</button>
        </div>{/if}
      <p class="data-source">
        Grade data from the UMD Office of the Registrar, Fall and Spring terms since 2010. GPA excludes withdrawals.
      </p>
    {:else}<p class="empty">
        {status === 'loading'
          ? 'Loading course data…'
          : 'Search for a course to see its professors, grades, and ratings.'}
      </p>{/if}
    {#if warning}<p class="notice" role={status === 'error' ? 'alert' : 'status'}>
        {warning}{#if status === 'error'}
          <button onclick={() => (model.mode === 'name' ? void runNames(false) : void loadCourse(model.query))}
            >Retry</button
          >{/if}
      </p>{/if}
  </div>
  {#if model.selected.length}<aside class="compare-tray" aria-label="Selected professors">
      <div>
        <strong>{model.selected.length} selected</strong><span
          >{model.selected.map((row) => row.instructor.name).join(', ')}</span
        >
      </div>
      {#if model.mode === 'name'}{#if commonCourses.length}<label
            ><span class="sr-only">Course to compare</span><select
              aria-label="Course to compare"
              value={compareCode}
              onchange={(event) => (model.compareCourse = event.currentTarget.value)}
              >{#each commonCourses as code (code)}<option value={code}>{code}</option>{/each}</select
            ></label
          >{:else}<input
            aria-label="Course to compare"
            placeholder="Course, e.g. CMSC131"
            value={model.compareCourse}
            oninput={(event) => (model.compareCourse = event.currentTarget.value.replace(/\s+/g, '').toUpperCase())}
          />{/if}{/if}<button
        class="compare-action"
        disabled={model.selected.length < 2 || !/^[A-Z]{4}\d{3}[A-Z]?$/.test(compareCode)}
        onclick={compareSelected}>Compare →</button
      ><button
        class="clear-selection"
        onclick={() => {
          model.selected = [];
          model.compareCourse = '';
        }}>Clear</button
      >
    </aside>{/if}
</main>

<style>
  .directory {
    position: fixed;
    inset: 3rem 0 0;
    overflow-y: auto;
    scroll-behavior: auto;
  }
  .directory-content {
    max-width: 1120px;
    margin: 0 auto;
    padding: 36px 28px 125px;
  }
  .directory-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 20px;
  }
  h1 {
    font-size: 30px;
    font-weight: 700;
    letter-spacing: -0.6px;
  }
  .directory-heading p {
    font-size: 14px;
    color: var(--text-secondary);
    margin-top: 4px;
  }
  button,
  a,
  input,
  select {
    outline-offset: 3px;
  }
  button {
    cursor: pointer;
  }
  button:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }
  .search-toolbar {
    display: flex;
    gap: 10px;
    align-items: stretch;
  }
  .mode-switch {
    display: flex;
    align-items: center;
    border: 1px solid var(--outline);
    padding: 3px;
    border-radius: 11px;
    flex-shrink: 0;
  }
  .mode-switch button {
    font-size: 12px;
    padding: 10px 12px;
    font-weight: 600;
    border-radius: 8px;
    white-space: nowrap;
  }
  .mode-switch .active {
    background: var(--orange);
    color: #111;
  }
  .search-field {
    position: relative;
    flex: 1;
    min-width: 100px;
  }
  .search-field > svg {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-secondary);
  }
  .search-field input {
    border: 1px solid var(--outline);
    border-radius: 10px;
    padding: 12px 14px 12px 40px;
    width: 100%;
    background: var(--bg-primary);
    font-size: 14px;
    height: 100%;
  }
  .search-field input:focus {
    outline: 2px solid var(--orange);
    outline-offset: 0;
  }
  .search-course {
    border: 1px solid var(--outline);
    border-radius: 10px;
    padding: 8px 14px;
    font-size: 12px;
  }
  .teaching-toggle {
    display: flex;
    align-items: center;
    gap: 9px;
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 10px 13px;
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
    cursor: pointer;
  }
  .switch {
    width: 32px;
    height: 18px;
    border-radius: 20px;
    background: var(--outline);
    position: relative;
    flex-shrink: 0;
  }
  .switch:has(input:checked) {
    background: var(--orange);
  }
  .switch:has(input:focus-visible) {
    outline: 2px solid var(--orange);
    outline-offset: 3px;
  }
  .switch input {
    position: absolute;
    opacity: 0;
    width: 100%;
    height: 100%;
    cursor: pointer;
  }
  .switch > span {
    position: absolute;
    pointer-events: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #fff;
    left: 2px;
    top: 2px;
    transition: transform 150ms;
  }
  .switch:has(input:checked) > span {
    transform: translateX(14px);
  }
  .suggestions {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    z-index: 30;
    max-height: 280px;
    overflow-y: auto;
    border: 1px solid var(--outline);
    background: var(--bg-primary);
    border-radius: 10px;
    box-shadow: 0 10px 24px #0002;
  }
  .suggestions button {
    display: block;
    width: 100%;
    text-align: left;
    padding: 10px 14px;
    font-size: 13px;
  }
  .suggestions button > span {
    margin-left: 10px;
    color: var(--text-secondary);
  }
  .suggestions button:hover,
  .suggestions .active {
    background: var(--hover);
  }
  .filters-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 15px;
    padding: 18px 0 14px;
    border-bottom: 1px solid var(--border);
  }
  .filter-controls {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    font-size: 12px;
  }
  .sort-control {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--text-primary);
  }
  .sort-control :global(input::placeholder) {
    color: var(--text-primary);
    opacity: 1;
  }
  select {
    background: var(--bg-primary);
    color: var(--text-primary);
  }

  .filter-controls > button,
  .sort-pills button {
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 8px 12px;
    font-size: 11px;
    font-weight: 600;
  }
  .filter-controls .chosen {
    background: var(--bg-secondary);
    border-color: var(--orange);
  }
  .result-count {
    min-height: 20px;
    margin: 18px 0 9px;
    color: var(--text-secondary);
    font-size: 12px;
  }
  .directory-table-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 30px;
    gap: 16px;
    align-items: start;
  }
  .table-scroll {
    overflow-x: auto;
    border: 1px solid var(--outline);
    border-radius: 15px;
  }
  table {
    border-collapse: collapse;
    width: 100%;
    min-width: 700px;
    font-size: 14px;
  }
  thead {
    background: color-mix(in srgb, var(--bg-secondary) 35%, var(--bg-primary));
    color: var(--text-secondary);
    font-size: 12px;
  }
  th {
    padding: 12px;
    font-weight: 600;
    text-align: right;
    white-space: nowrap;
  }
  th:nth-child(2) {
    text-align: left;
  }
  th:last-child {
    text-align: left;
  }
  th button {
    white-space: nowrap;
  }
  td {
    padding: 13px 12px;
    border-top: 1px solid var(--border);
    vertical-align: middle;
  }
  .select-column {
    width: 38px;
  }
  td:first-child {
    width: 38px;
  }
  td input,
  .card-heading input {
    width: 14px;
    height: 14px;
    accent-color: var(--orange);
    cursor: pointer;
  }
  .professor-cell {
    min-width: 210px;
  }
  .professor-cell > a {
    font-weight: 700;
  }
  a:hover {
    color: var(--orange);
  }
  .course-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    margin-top: 5px;
    font-size: 10px;
  }
  .course-chips button {
    background: var(--bg-secondary);
    border-radius: 4px;
    padding: 1px 6px;
  }
  .course-chips > span {
    color: var(--text-secondary);
  }
  .course-chips > .more-courses {
    color: var(--text-primary);
    font-size: 11px;
    font-weight: 700;
    padding: 1px 4px;
  }
  .rating-cell {
    text-align: right;
    min-width: 110px;
  }
  .rating-cell strong {
    white-space: nowrap;
  }
  .rating-cell small {
    display: block;
    font-size: 10px;
    color: var(--text-secondary);
    margin-top: 3px;
  }
  .star {
    color: var(--orange);
  }
  .numeric {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .bar-cell {
    width: 170px;
    min-width: 140px;
  }
  .muted {
    color: var(--text-secondary);
    font-size: 12px;
  }
  tr.selected,
  .professor-card.selected {
    background: color-mix(in srgb, var(--orange) 7%, var(--bg-primary));
  }
  .alphabet {
    display: flex;
    flex-direction: column;
    padding: 4px;
    border: 1px solid var(--border);
    border-radius: 10px;
  }
  .alphabet button {
    font-size: 10px;
    height: 22px;
    border-radius: 4px;
  }
  .alphabet button:hover {
    background: var(--hover);
  }
  .alphabet .active {
    background: var(--orange);
    color: #111;
  }
  .clear-letter {
    margin-left: 10px;
    color: var(--orange);
  }
  .show-more {
    display: flex;
    justify-content: center;
    margin-top: 16px;
  }
  .show-more button {
    padding: 10px 17px;
    border: 1px solid var(--outline);
    border-radius: 10px;
    font-size: 12px;
    font-weight: 600;
  }
  .course-summary {
    display: flex;
    align-items: center;
    gap: 26px;
    background: color-mix(in srgb, var(--bg-secondary) 35%, var(--bg-primary));
    border: 1px solid var(--border);
    border-radius: 18px;
    padding: 20px;
    margin: 20px 0;
  }
  .course-title {
    flex: 1;
    min-width: 170px;
  }
  .course-title h2 {
    font-size: 24px;
    font-weight: 700;
  }
  .course-title p {
    font-size: 12px;
  }
  .course-summary small {
    display: block;
    color: var(--text-secondary);
    font-size: 11px;
    white-space: nowrap;
  }
  .course-summary strong {
    font-size: 25px;
  }
  .summary-distribution {
    min-width: 200px;
    flex: 1.5;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .course-results-heading {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 16px;
    margin: 23px 0 16px;
  }
  .course-results-heading h2 {
    font-size: 17px;
    font-weight: 700;
  }
  .course-results-heading h2 > span {
    color: var(--text-secondary);
    font-weight: 400;
    font-size: 14px;
  }
  .sort-pills {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }
  .sort-pills .active {
    background: var(--text-primary);
    color: var(--bg-primary);
    border-color: var(--text-primary);
  }
  .professor-cards {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 15px;
  }
  .professor-card {
    border: 1px solid var(--outline);
    border-radius: 16px;
    padding: 17px;
  }
  .card-heading {
    display: flex;
    justify-content: space-between;
    align-items: start;
    gap: 8px;
  }
  .card-heading > a {
    font-size: 15px;
    font-weight: 700;
    line-height: 1.4;
  }
  .card-heading label {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 10px;
    white-space: nowrap;
    margin-top: 3px;
    cursor: pointer;
  }
  .teaching-badge {
    display: inline-block;
    background: var(--bg-secondary);
    color: var(--text-secondary);
    font-size: 10px;
    border-radius: 20px;
    padding: 2px 9px;
    margin: 7px 0 13px;
  }
  .teaching-badge.current {
    border: 1px solid var(--orange);
    color: #d85119;
    background: transparent;
    padding: 1px 8px;
  }
  .card-metrics {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    margin-bottom: 14px;
  }
  .card-metrics small {
    color: var(--text-secondary);
    font-size: 10px;
    display: block;
  }
  .card-metrics strong {
    display: block;
    font-size: 23px;
    line-height: 1.2;
    margin-top: 3px;
  }
  .card-metrics > div > span {
    display: block;
    font-size: 9px;
    color: var(--text-secondary);
    margin-top: 3px;
  }
  .last-taught {
    font-size: 10px;
    color: var(--text-secondary);
    margin-top: 12px;
  }
  .data-source {
    font-size: 11px;
    color: var(--text-secondary);
    margin-top: 20px;
  }
  .empty {
    color: var(--text-secondary);
    font-size: 14px;
    padding: 35px 0;
  }
  .notice {
    font-size: 13px;
    color: var(--text-secondary);
    background: var(--bg-secondary);
    padding: 12px 15px;
    border-radius: 10px;
    margin: 14px 0;
  }
  .notice button {
    color: var(--orange);
    text-decoration: underline;
    font-weight: 600;
  }
  .compare-tray {
    position: fixed;
    left: 50%;
    transform: translateX(-50%);
    bottom: 20px;
    max-width: calc(100vw - 32px);
    display: flex;
    align-items: center;
    gap: 14px;
    background: #151922;
    color: #d9dfea;
    border: 1px solid #47526a;
    border-radius: 16px;
    padding: 10px 14px;
    box-shadow: 0 8px 25px #0003;
    z-index: 40;
  }
  .compare-tray > div {
    display: flex;
    align-items: center;
    gap: 7px;
    min-width: 0;
    font-size: 12px;
  }
  .compare-tray > div > strong {
    white-space: nowrap;
  }
  .compare-tray > div > span {
    max-width: 230px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .compare-tray input,
  .compare-tray select {
    background: var(--bg-primary);
    color: var(--text-primary);
    border-radius: 7px;
    font-size: 11px;
    padding: 7px 8px;
    border: 0;
    width: 145px;
  }
  .compare-action {
    background: var(--orange);
    color: #111;
    font-size: 12px;
    font-weight: 700;
    padding: 11px 15px;
    border-radius: 11px;
    white-space: nowrap;
  }
  .clear-selection {
    font-size: 12px;
  }
  @media (max-width: 1100px) {
    .course-summary {
      flex-wrap: wrap;
      gap: 18px;
    }
    .summary-distribution {
      min-width: 180px;
    }
    .search-toolbar {
      flex-wrap: wrap;
    }
    .search-field {
      min-width: 240px;
    }
    .teaching-toggle {
      font-size: 11px;
    }
    .professor-cards {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  @media (max-width: 650px) {
    .directory-content {
      padding: 22px 16px 155px;
    }
    h1 {
      font-size: 26px;
    }
    .directory-heading {
      align-items: start;
    }
    .directory-heading p {
      max-width: 230px;
      font-size: 12px;
    }
    .mode-switch {
      order: 0;
    }
    .search-field {
      order: 2;
      flex-basis: 75%;
      min-width: 200px;
    }
    .search-course {
      order: 3;
    }
    .teaching-toggle {
      order: 1;
      margin-left: auto;
      padding: 8px;
    }
    .filters-toolbar {
      align-items: start;
      flex-direction: column;
    }
    .directory-table-layout {
      grid-template-columns: minmax(0, 1fr);
    }
    .alphabet {
      flex-direction: row;
      flex-wrap: wrap;
      grid-row: 1;
      gap: 2px;
    }
    .alphabet button {
      width: 20px;
    }
    .professor-cards {
      grid-template-columns: 1fr;
    }
    .course-summary {
      padding: 16px;
      gap: 15px;
    }
    .course-title {
      flex-basis: 100%;
    }
    .course-summary > div > strong {
      font-size: 22px;
    }
    .summary-distribution {
      flex-basis: 100%;
    }
    .compare-tray {
      flex-wrap: wrap;
      justify-content: center;
      gap: 9px;
      padding: 10px;
      bottom: 10px;
    }
    .compare-tray > div {
      flex-basis: 100%;
      justify-content: center;
    }
    .compare-tray > div > span {
      max-width: 200px;
    }
    .card-heading > a {
      font-size: 16px;
    }
    .card-metrics strong {
      font-size: 25px;
    }
  }
</style>
