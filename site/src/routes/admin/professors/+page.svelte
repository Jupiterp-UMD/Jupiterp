<!--
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).
Copyright (C) 2026 Andrew Cupps

Instructor matching.

Every entry here is a name the resolver could not settle, which means a
professor whose grade history is split across two records or attached to none.
Until this page existed the only way to work the queue was hand-written SQL,
and 257 entries had accumulated.

Behind the same key as the moderation queue, and it shares the storage key so
one login covers both. Lower blast radius in one sense -- nothing here
publishes text -- and higher in another: linking two records merges two real
people's grade histories, and there is no undo from the merged state. That is
why every candidate is shown with how much data it carries, and why `link` is
never the default action.
-->
<script lang="ts">
  import { resolve } from '$app/paths';
  import { client } from '../../../lib/client';
  import { formatSemester } from '../../../lib/course-planner/Grades';

  interface Candidate {
    id: number;
    name: string;
    slug: string;
    is_active: boolean;
    grade_rows: number;
    sections: number;
    first_term: number | null;
    last_term: number | null;
  }

  interface QueueEntry {
    id: number;
    observed: string;
    observed_norm: string;
    source: string;
    context: Record<string, unknown> | null;
    created_at: string;
    candidates: Candidate[];
  }

  let adminKey = $state('');
  let remember = $state(false);
  let authed = $state(false);

  let entries = $state<QueueEntry[]>([]);
  let selected = $state(0);
  let status = $state<'idle' | 'loading' | 'ready' | 'error'>('idle');
  let errorMessage = $state('');
  let notice = $state('');
  let busy = $state(false);

  // Manual search, for when the resolver's candidates are all wrong. Its list
  // comes from a surname match, so it misses married names, transliterations,
  // and registrar spellings that share no token with the Testudo one -- exactly
  // the cases a person is better at than the algorithm.
  let searchTerm = $state('');
  let searchResults = $state<Candidate[]>([]);
  let searching = $state(false);

  // Same key as /admin/reviews on purpose: it is the same credential, and
  // making a moderator paste it twice teaches them to keep it somewhere
  // convenient, which is the opposite of what we want.
  const STORAGE_KEY = 'jupiterp-moderation-key';

  let current = $derived(entries[selected] ?? null);

  // Candidates ticked for a merge, and which of them survives it.
  //
  // Several candidates are routinely the same professor: PlanetTerp imported
  // one spelling, the registrar another, and 0022's slug rewrite surfaced five
  // such pairs at once. Linking to one of them resolves the queue entry and
  // leaves the split it was queued for still in place, so the queue looks
  // shorter without the data being any less broken.
  let picked = $state<number[]>([]);
  let keepId = $state<number | null>(null);

  // A merge the database judged to be probably-two-people. Held here rather
  // than fired at `window.confirm`, because the answer depends on two
  // PlanetTerp ratings the moderator has to actually read.
  let mergeWarning = $state<MergeWarning | null>(null);

  interface MergeWarning {
    detail: string;
    keep: { id: number; name: string; slug: string; pt_average_rating: number | null };
    conflicts: { id: number; name: string; slug: string; pt_average_rating: number | null }[];
  }

  let pickedCandidates = $derived(
    (current?.candidates ?? []).filter((candidate) => picked.includes(candidate.id))
  );

  // Moving to another entry has to clear the selection. Carrying ticks across
  // entries would arm a merge against a professor the moderator is no longer
  // looking at, and the ids are hidden behind names that may well match.
  $effect(() => {
    const id = current?.id;
    void id;
    picked = [];
    keepId = null;
    mergeWarning = null;
  });

  function togglePick(candidate: Candidate) {
    if (picked.includes(candidate.id)) {
      picked = picked.filter((id) => id !== candidate.id);
      if (keepId === candidate.id) {
        keepId = null;
      }
    } else {
      picked = [...picked, candidate.id];
    }
    mergeWarning = null;

    // Default the survivor to whichever ticked record carries the most grade
    // rows. That is the one whose slug the most existing links point at, and
    // making the safe choice the pre-selected one is worth more here than
    // making the moderator choose every time -- they can still override it,
    // and the panel spells out what survives before anything happens.
    if (keepId === null || !picked.includes(keepId)) {
      const best = (current?.candidates ?? [])
        .filter((row) => picked.includes(row.id))
        .sort((a, b) => b.grade_rows - a.grade_rows || b.sections - a.sections)[0];
      keepId = best?.id ?? null;
    }
  }

  $effect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved && !authed) {
      adminKey = saved;
      void load();
    }
  });

  async function call(path: string, init: RequestInit = {}): Promise<Response> {
    return fetch(`${client.dbUrl}${path}`, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        Authorization: `Bearer ${adminKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async function load() {
    status = 'loading';
    errorMessage = '';
    try {
      const response = await call('/v1/admin/instructors/queue?limit=50');
      if (response.status === 401) {
        authed = false;
        status = 'error';
        errorMessage = 'That key was not accepted.';
        sessionStorage.removeItem(STORAGE_KEY);
        return;
      }
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = await response.json();
      entries = payload.entries ?? [];
      selected = Math.min(selected, Math.max(0, entries.length - 1));
      authed = true;
      status = 'ready';
      if (remember) {
        sessionStorage.setItem(STORAGE_KEY, adminKey);
      }
    } catch (error) {
      console.error(error);
      status = 'error';
      errorMessage = 'Could not load the queue.';
    }
  }

  async function runSearch() {
    if (searchTerm.trim().length < 2) {
      searchResults = [];
      return;
    }
    searching = true;
    try {
      const response = await call(`/v1/admin/instructors/search?q=${encodeURIComponent(searchTerm.trim())}`);
      searchResults = response.ok ? ((await response.json()).instructors ?? []) : [];
    } catch (error) {
      console.error(error);
      searchResults = [];
    } finally {
      searching = false;
    }
  }

  /**
   * Confirm before creating a professor.
   *
   * Creating is the only action here that publishes something: it mints a page
   * at a permanent slug, which then goes into the sitemap. Linking and
   * dismissing both act on records that already exist. A `confirm` is a blunt
   * instrument, and it is the right weight for an irreversible action that was
   * previously one keypress away.
   */
  function confirmCreate() {
    const entry = current;
    if (!entry || busy) {
      return;
    }
    const ok = window.confirm(
      `Create a new professor for "${entry.observed}"?\n\n` +
        'This publishes a page at a permanent URL and cannot be undone from here. ' +
        'Check the candidates and the search results first.'
    );
    if (ok) {
      void decide('create');
    }
  }

  /**
   * Fold the ticked duplicates into the chosen survivor, then resolve the entry.
   *
   * One request, because the database does both halves in one transaction: a
   * merge that committed without the link would leave this entry open and
   * naming candidate ids that no longer exist.
   */
  function mergePicked(force = false) {
    if (picked.length < 2 || keepId === null) {
      return;
    }
    void decide(
      'merge',
      keepId,
      picked.filter((id) => id !== keepId),
      force
    );
  }

  async function decide(
    action: 'link' | 'merge' | 'create' | 'dismiss',
    instructorId?: number,
    mergeIds?: number[],
    force = false
  ) {
    const entry = current;
    if (!entry || busy) {
      return;
    }
    busy = true;
    errorMessage = '';
    notice = '';
    try {
      // No `actor`. The API records whoever the admin key resolves to, which is
      // the whole point of naming keys in REVIEW_MODERATOR_KEYS — sending a
      // literal "moderator" from here overrode it, so every merge in the audit
      // trail looked identical no matter who made it.
      const response = await call(`/v1/admin/instructors/queue/${entry.id}`, {
        method: 'POST',
        body: JSON.stringify({
          action,
          instructor_id: instructorId,
          ...(mergeIds ? { merge_ids: mergeIds, force } : {}),
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        errorMessage = body.error ?? `That did not work (HTTP ${response.status}).`;
        return;
      }
      const result = await response.json();

      // A refusal, not a failure: nothing was written and the entry is still
      // open. Show the two ratings and let the moderator decide, rather than
      // dropping the row as though the merge had happened.
      if (result.status === 'needs_confirmation') {
        mergeWarning = result as MergeWarning;
        return;
      }

      notice = describe(result);
      mergeWarning = null;

      // Drop it locally rather than reloading: the queue is worked top to
      // bottom, and a reload would move everything under the cursor.
      entries = entries.filter((row) => row.id !== entry.id);
      selected = Math.min(selected, Math.max(0, entries.length - 1));
      searchTerm = '';
      searchResults = [];
    } catch (error) {
      console.error(error);
      errorMessage = 'Could not save that decision.';
    } finally {
      busy = false;
    }
  }

  function describe(result: Record<string, unknown>): string {
    const moved = Number(result.moved_grade_rows ?? 0);
    const rows = `${moved.toLocaleString()} grade ${moved === 1 ? 'row' : 'rows'}`;
    if (result.status === 'created') {
      return `Created ${result.slug} and moved ${rows}.`;
    }
    if (result.status === 'linked') {
      return `Linked to ${result.slug} and moved ${rows}.`;
    }
    if (result.status === 'merged') {
      const merge = (result.merge ?? {}) as Record<string, unknown>;
      const count = Array.isArray(merge.merged) ? merge.merged.length : 0;
      const reviews = Number(merge.moved_reviews ?? 0);
      const parts = [
        `Merged ${count} duplicate ${count === 1 ? 'record' : 'records'} into ${result.slug}`,
        `moved ${Number(merge.moved_grade_rows ?? 0).toLocaleString()} grade rows`,
      ];
      // Called out separately because it is the part that cannot be rebuilt
      // from a scrape if it turns out to have been the wrong call.
      if (reviews > 0) {
        parts.push(`carried ${reviews} ${reviews === 1 ? 'review' : 'reviews'} over`);
      }
      return `${parts.join(', ')}.`;
    }
    if (result.status === 'already_resolved') {
      return 'Someone else already decided that one.';
    }
    return 'Dismissed.';
  }

  /**
   * True while the user is typing somewhere the shortcuts must not fire.
   *
   * `HTMLInputElement` alone missed textareas, selects, and anything
   * contenteditable — and one of these shortcuts creates a professor page at a
   * permanent, indexed URL.
   */
  function isTyping(target: EventTarget | null): boolean {
    return (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      (target instanceof HTMLElement && target.isContentEditable)
    );
  }

  function onKey(event: KeyboardEvent) {
    if (!authed || isTyping(event.target) || event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }
    if (event.key === 'j') {
      selected = Math.min(selected + 1, entries.length - 1);
    } else if (event.key === 'n') {
      // Deliberately asymmetric with the rest. `j`/`k`/`x` are all reversible
      // or harmless; this one mints a professor page at a URL that is meant to
      // be permanent and is submitted to search engines, off a single
      // keystroke with no undo.
      confirmCreate();
    } else if (event.key === 'k') {
      selected = Math.max(selected - 1, 0);
    } else if (event.key === 'x') {
      void decide('dismiss');
    } else if (event.key === 'm') {
      mergePicked();
    } else if (/^[1-9]$/.test(event.key)) {
      const candidate = current?.candidates[Number(event.key) - 1];
      if (!candidate) {
        return;
      }
      // Numbers keep linking outright while nothing is ticked, which is the
      // shortcut this screen was worked with. The moment a box is ticked the
      // moderator is assembling a merge, and having a number key resolve the
      // entry to one record mid-assembly would silently discard the rest of
      // the selection -- so from then on the same key toggles instead.
      if (picked.length > 0) {
        togglePick(candidate);
      } else {
        void decide('link', candidate.id);
      }
    }
  }

  function keepName(): string {
    return pickedCandidates.find((candidate) => candidate.id === keepId)?.name ?? 'the survivor';
  }

  function terms(c: Candidate): string {
    if (c.first_term === null || c.last_term === null) {
      return 'no terms recorded';
    }
    return c.first_term === c.last_term
      ? formatSemester(c.first_term)
      : `${formatSemester(c.first_term)} – ${formatSemester(c.last_term)}`;
  }
</script>

<svelte:window onkeydown={onKey} />

<svelte:head>
  <title>Instructor matching | Jupiterp</title>
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<main class="custom-scrollbar fixed inset-x-0 bottom-0 top-12 overflow-y-auto">
  <div class="mx-auto w-full max-w-5xl px-4 py-6">
    <h1 class="text-2xl font-bold">Instructor matching</h1>

    {#if !authed}
      <form
        class="border-outline my-4 flex max-w-md flex-col gap-3 rounded-lg border-2 p-4"
        onsubmit={(event) => {
          event.preventDefault();
          void load();
        }}
      >
        <label class="flex flex-col gap-1">
          <span class="text-sm font-bold">Moderator key</span>
          <input
            type="password"
            bind:value={adminKey}
            autocomplete="off"
            class="border-outline bg-bg-primary rounded-md border-2 px-2 py-1"
          />
        </label>
        <label class="flex flex-row items-center gap-2 text-sm">
          <input type="checkbox" bind:checked={remember} class="accent-orange" />
          Keep it for this tab
        </label>
        {#if errorMessage}
          <p class="text-danger text-sm" role="alert">{errorMessage}</p>
        {/if}
        <button class="bg-orange text-bg-primary rounded-lg px-4 py-2 font-bold" type="submit">
          {status === 'loading' ? 'Checking…' : 'Open queue'}
        </button>
      </form>
    {:else}
      <div class="text-text-secondary my-2 flex flex-row flex-wrap gap-3 text-sm">
        <span>{entries.length} awaiting a decision</span>
        <span>
          <kbd>j</kbd>/<kbd>k</kbd> move · <kbd>1</kbd>–<kbd>9</kbd> link, or tick once a box is
          ticked · <kbd>m</kbd> merge ticked · <kbd>n</kbd> new professor · <kbd>x</kbd> dismiss
        </span>
        <button class="text-orange underline" onclick={() => load()}>Reload</button>
        <a class="text-orange underline" href={resolve('/admin/reviews')}>Review queue</a>
      </div>

      {#if notice}
        <p class="text-text-secondary my-2 text-sm">{notice}</p>
      {/if}
      {#if errorMessage}
        <p class="text-danger my-2 text-sm" role="alert">{errorMessage}</p>
      {/if}

      {#if entries.length === 0}
        <p class="my-6">Nothing left in the queue.</p>
      {:else}
        <div class="my-4 grid gap-4 lg:grid-cols-[16rem_1fr]">
          <!-- The queue -->
          <ol class="border-outline custom-scrollbar max-h-[70vh] overflow-y-auto rounded-lg border">
            {#each entries as entry, index (entry.id)}
              <li>
                <button
                  class="w-full border-b px-3 py-2 text-left text-sm {index === selected ? 'bg-hover font-bold' : ''}"
                  onclick={() => (selected = index)}
                >
                  <span class="block truncate">{entry.observed}</span>
                  <span class="text-text-secondary text-xs">
                    {entry.source} · {entry.candidates.length}
                    {entry.candidates.length === 1 ? 'candidate' : 'candidates'}
                  </span>
                </button>
              </li>
            {/each}
          </ol>

          <!-- The decision -->
          {#if current}
            <div class="border-outline rounded-lg border p-4">
              <h2 class="text-lg font-bold">{current.observed}</h2>
              <p class="text-text-secondary text-sm">
                Seen as <b>{current.source}</b>
                {#if current.context?.course_code}
                  in {current.context.course_code}
                {/if}
                {#if current.context?.term}
                  · {formatSemester(Number(current.context.term))}
                {/if}
              </p>

              <h3 class="mt-4 text-sm font-bold">Is this one of these?</h3>
              {#if current.candidates.length === 0}
                <p class="text-text-secondary my-2 text-sm">
                  The resolver found nothing similar. Search below, or create a new professor.
                </p>
              {:else}
                <ul class="my-2 flex flex-col gap-2">
                  {#each current.candidates as candidate, index (candidate.id)}
                    <li
                      class="flex flex-row flex-wrap items-center gap-2 rounded-md border p-2 {picked.includes(
                        candidate.id
                      )
                        ? 'border-orange'
                        : 'border-outline'}"
                    >
                      <input
                        type="checkbox"
                        class="accent-orange"
                        checked={picked.includes(candidate.id)}
                        onchange={() => togglePick(candidate)}
                        aria-label="Select {candidate.name} to merge"
                      />
                      <kbd class="text-text-secondary text-xs">{index + 1}</kbd>
                      <a
                        href={resolve('/professor/[slug]', { slug: candidate.slug })}
                        target="_blank"
                        rel="noopener"
                        class="text-orange font-bold underline"
                      >
                        {candidate.name}
                      </a>
                      <!-- The counts are the decision. Two names alone are a
                           coin flip; "340 grade rows over eleven terms" against
                           "none" is not. -->
                      <span class="text-text-secondary text-xs">
                        {candidate.grade_rows.toLocaleString()} grade rows ·
                        {candidate.sections} sections now ·
                        {terms(candidate)}
                      </span>
                      {#if candidate.is_active}
                        <span class="border-orange text-orange rounded-xl border px-2 text-xs">teaching</span>
                      {/if}
                      <button
                        class="bg-orange text-bg-primary ml-auto rounded-md px-3 py-1 text-sm font-bold"
                        disabled={busy}
                        onclick={() => decide('link', candidate.id)}
                      >
                        Link
                      </button>
                    </li>
                  {/each}
                </ul>
              {/if}

              {#if picked.length >= 2}
                <!--
                  Shown only once a merge is actually possible. The panel spells
                  out the survivor and what disappears, because this is the one
                  action on the screen that destroys records rather than
                  pointing a name at one: the duplicates' reviews, grades,
                  aliases and section links are reassigned and the rows are then
                  deleted, and there is no undo from the merged state.
                -->
                <div class="border-orange mt-4 rounded-lg border-2 p-3">
                  <h3 class="text-sm font-bold">
                    Merge {picked.length} records into one
                  </h3>
                  <p class="text-text-secondary mt-1 text-xs">
                    Everything the others carry moves to the record you keep, and their rows are
                    deleted. Their spellings become aliases of the survivor, so the next scrape
                    will not recreate them.
                  </p>

                  <fieldset class="mt-3">
                    <legend class="text-xs font-bold">Keep which record?</legend>
                    <div class="mt-1 flex flex-col gap-1">
                      {#each pickedCandidates as candidate (candidate.id)}
                        <label class="flex flex-row items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name="merge-survivor"
                            class="accent-orange"
                            checked={keepId === candidate.id}
                            onchange={() => (keepId = candidate.id)}
                          />
                          <span class={keepId === candidate.id ? 'font-bold' : ''}>
                            {candidate.name}
                          </span>
                          <span class="text-text-secondary text-xs">
                            {candidate.grade_rows.toLocaleString()} grade rows · {candidate.sections}
                            sections
                          </span>
                        </label>
                      {/each}
                    </div>
                  </fieldset>

                  {#if mergeWarning}
                    <!--
                      0023's reasoning, surfaced: two different PlanetTerp
                      ratings mean students told the two records apart, which is
                      evidence of two people sharing a name rather than one
                      person recorded twice.
                    -->
                    <div class="border-danger text-danger mt-3 rounded-md border p-2" role="alert">
                      <p class="text-xs font-bold">Check this one first</p>
                      <p class="mt-1 text-xs">{mergeWarning.detail}</p>
                      <ul class="mt-1 text-xs">
                        <li>
                          Keeping <b>{mergeWarning.keep.name}</b> — PlanetTerp
                          {mergeWarning.keep.pt_average_rating}
                        </li>
                        {#each mergeWarning.conflicts as conflict (conflict.id)}
                          <li>
                            Merging away <b>{conflict.name}</b> — PlanetTerp
                            {conflict.pt_average_rating}
                          </li>
                        {/each}
                      </ul>
                    </div>
                  {/if}

                  <div class="mt-3 flex flex-row flex-wrap gap-2">
                    <button
                      class="bg-orange text-bg-primary rounded-md px-3 py-1 text-sm font-bold"
                      disabled={busy || keepId === null}
                      onclick={() => mergePicked(mergeWarning !== null)}
                    >
                      {mergeWarning ? 'Merge anyway' : `Merge & link to ${keepName()}`}
                    </button>
                    <button
                      class="border-outline rounded-md border px-3 py-1 text-sm"
                      disabled={busy}
                      onclick={() => {
                        picked = [];
                        keepId = null;
                        mergeWarning = null;
                      }}
                    >
                      Clear
                    </button>
                  </div>
                </div>
              {/if}

              <h3 class="mt-4 text-sm font-bold">Or find someone else</h3>
              <div class="my-2 flex flex-row gap-2">
                <input
                  bind:value={searchTerm}
                  placeholder="surname"
                  onkeydown={(event) => event.key === 'Enter' && runSearch()}
                  class="border-outline bg-bg-primary grow rounded-md border-2 px-2 py-1 text-sm"
                />
                <button class="border-outline rounded-md border px-3 py-1 text-sm" onclick={runSearch}>
                  {searching ? 'Searching…' : 'Search'}
                </button>
              </div>
              {#if searchResults.length > 0}
                <ul class="my-2 flex flex-col gap-1">
                  {#each searchResults as result (result.id)}
                    <li class="flex flex-row items-center gap-2 text-sm">
                      <a
                        href={resolve('/professor/[slug]', { slug: result.slug })}
                        target="_blank"
                        rel="noopener"
                        class="text-orange underline"
                      >
                        {result.name}
                      </a>
                      <button
                        class="border-outline ml-auto rounded-md border px-2 py-0.5 text-xs"
                        disabled={busy}
                        onclick={() => decide('link', result.id)}
                      >
                        Link
                      </button>
                    </li>
                  {/each}
                </ul>
              {/if}

              <div class="border-border mt-4 flex flex-row flex-wrap gap-2 border-t pt-4">
                <button
                  class="border-orange text-orange rounded-md border px-3 py-1 text-sm font-bold"
                  disabled={busy}
                  onclick={confirmCreate}
                >
                  New professor
                </button>
                <button
                  class="border-outline rounded-md border px-3 py-1 text-sm"
                  disabled={busy}
                  onclick={() => decide('dismiss')}
                >
                  Not a person
                </button>
              </div>
              <p class="text-text-secondary mt-2 text-xs">
                Linking moves every grade row under this spelling onto that professor and teaches the scraper the same
                answer. It cannot be undone from here.
              </p>
            </div>
          {/if}
        </div>
      {/if}
    {/if}
  </div>
</main>
