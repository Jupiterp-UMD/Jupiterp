<!--
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).
Copyright (C) 2026 Andrew Cupps

The moderation queue.

Guarded by a shared random key that moderators hold. The key is never sent to
this site's server: the page runs in the browser, holds the key in memory, and
calls the API with it directly. There is no session, no cookie, and nothing to
steal from this origin.

Kept spartan and keyboard-driven on purpose. Volume is low, the job is
repetitive, and the thing that makes it sustainable is being able to work
through a queue without reaching for the mouse.
-->
<script lang="ts">
  import { client } from '../../../lib/client';
  import { formatSemester } from '../../../lib/course-planner/Grades';

  interface Decision {
    decision: string;
    decided_by: string;
    actor: string;
    confidence: number | null;
    categories: string[] | null;
    reason: string | null;
    applied: boolean;
    created_at: string;
  }

  interface QueueRow {
    id: string;
    instructor: string;
    course_code: string | null;
    term: number | null;
    rating: number;
    expected_grade: string | null;
    title: string | null;
    body: string | null;
    status: string;
    submitted_at: string;
    email_domain: string;
    last_decision: Decision | null;
  }

  let adminKey = $state('');
  let remember = $state(false);
  let authed = $state(false);

  let rows = $state<QueueRow[]>([]);
  let selected = $state(0);
  let status = $state<'idle' | 'loading' | 'ready' | 'error'>('idle');
  let errorMessage = $state('');
  let rejectReason = $state('');

  const STORAGE_KEY = 'jupiterp-moderation-key';

  $effect(() => {
    // sessionStorage, not localStorage: the key is a bearer credential for the
    // whole moderation surface, and it should not outlive the tab.
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
      const response = await call('/v1/admin/reviews?status=pending,escalated&limit=50');
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
      rows = payload.reviews ?? [];
      selected = Math.min(selected, Math.max(0, rows.length - 1));
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

  async function decide(action: 'approve' | 'reject' | 'escalate') {
    const row = rows[selected];
    if (!row) {
      return;
    }
    if (action === 'reject' && rejectReason.trim() === '') {
      errorMessage = 'A rejection needs a reason — it is emailed to the reviewer.';
      return;
    }

    const response = await call(`/v1/admin/reviews/${row.id}`, {
      method: 'PUT',
      body: JSON.stringify({ action, reason: rejectReason.trim() }),
    });

    if (response.status === 409) {
      errorMessage = 'Someone else already decided this one. Reloading.';
      await load();
      return;
    }
    if (!response.ok) {
      errorMessage = `Could not apply that (HTTP ${response.status}).`;
      return;
    }

    // Drop it locally rather than refetching, so working through a queue does
    // not pause on a round trip between every decision.
    rows = rows.filter((r) => r.id !== row.id);
    selected = Math.min(selected, Math.max(0, rows.length - 1));
    rejectReason = '';
    errorMessage = '';
  }

  function handleKeydown(event: KeyboardEvent) {
    if (!authed || rows.length === 0) {
      return;
    }
    // Not while typing a rejection reason.
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }
    switch (event.key) {
      case 'j':
      case 'ArrowDown':
        selected = Math.min(selected + 1, rows.length - 1);
        event.preventDefault();
        break;
      case 'k':
      case 'ArrowUp':
        selected = Math.max(selected - 1, 0);
        event.preventDefault();
        break;
      case 'a':
        void decide('approve');
        break;
      case 'r':
        void decide('reject');
        break;
      case 'e':
        void decide('escalate');
        break;
    }
  }

  let current = $derived(rows[selected]);
</script>

<svelte:head>
  <title>Moderation | Jupiterp</title>
  <!-- Excluded from the sitemap and from indexing. -->
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<svelte:window onkeydown={handleKeydown} />

<!--
  `fixed top-12 bottom-0` with its own scroll container, matching the other
  document pages. `body` is `height: 100svh; overflow-y: clip` for the planner,
  so a plain <main> begins underneath the fixed header and its rule.

  Top-aligned rather than centred, unlike the verify page: the queue is a
  working list that can run long, and a moderator reads it from the top.
-->
<main class="custom-scrollbar fixed inset-x-0 bottom-0 top-12 overflow-y-auto">
  <div class="mx-auto w-full max-w-5xl px-4 py-6">
  <h1 class="text-2xl font-bold">Moderation queue</h1>

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
      <span>{rows.length} awaiting a decision</span>
      <span><kbd>j</kbd>/<kbd>k</kbd> move · <kbd>a</kbd> approve · <kbd>r</kbd> reject · <kbd>e</kbd> escalate</span>
      <button class="text-orange underline" onclick={() => load()}>Reload</button>
    </div>

    {#if errorMessage}
      <p class="text-danger my-2 text-sm" role="alert">{errorMessage}</p>
    {/if}

    {#if rows.length === 0}
      <p class="my-6">Nothing to moderate.</p>
    {:else}
      <div class="grid grid-cols-1 gap-4 md:grid-cols-[18rem_1fr]">
        <!-- Queue -->
        <ul class="border-outline max-h-[70vh] overflow-y-auto rounded-lg border">
          {#each rows as row, index (row.id)}
            <li>
              <button
                class="w-full border-b px-3 py-2 text-left {index === selected ? 'bg-hover' : ''} border-border"
                onclick={() => (selected = index)}
              >
                <div class="flex flex-row justify-between text-sm">
                  <span class="font-bold">{row.instructor}</span>
                  <span class="text-orange">{row.rating.toFixed(1)}</span>
                </div>
                <div class="text-text-secondary truncate text-xs">
                  {row.course_code ?? 'no course'} · {row.status}
                </div>
              </button>
            </li>
          {/each}
        </ul>

        <!-- Detail -->
        {#if current}
          <article class="border-outline rounded-lg border p-4">
            <header class="flex flex-row flex-wrap items-baseline gap-2">
              <h2 class="text-lg font-bold">{current.instructor}</h2>
              <span class="text-orange font-bold">{current.rating.toFixed(1)}</span>
              <span class="text-text-secondary text-xs">
                {current.course_code ?? 'no course'}
                {#if current.term}· {formatSemester(current.term)}{/if}
                {#if current.expected_grade}· grade {current.expected_grade}{/if}
                · {current.email_domain}
              </span>
            </header>

            {#if current.last_decision}
              <!-- The classifier's opinion, shown alongside rather than
                   instead of the content. During shadow mode this is how
                   disagreements become visible while they still cost nothing. -->
              <div class="border-outline my-3 rounded-md border border-dashed p-2 text-xs">
                <b>Automated:</b>
                {current.last_decision.decision}
                {#if current.last_decision.confidence}
                  · confidence {current.last_decision.confidence.toFixed(2)}
                {/if}
                · by {current.last_decision.decided_by}
                {#if !current.last_decision.applied}<span class="text-text-secondary"> (recorded only)</span>{/if}
                {#if current.last_decision.categories?.length}
                  <div>Flags: {current.last_decision.categories.join(', ')}</div>
                {/if}
                {#if current.last_decision.reason}
                  <div>{current.last_decision.reason}</div>
                {/if}
              </div>
            {/if}

            {#if current.title}
              <h3 class="mt-3 font-bold">{current.title}</h3>
            {/if}
            <p class="my-2 whitespace-pre-wrap text-sm leading-6">{current.body ?? '(no text)'}</p>

            <label class="my-3 flex flex-col gap-1">
              <span class="text-sm font-bold">Reason (emailed to the reviewer on rejection)</span>
              <input
                bind:value={rejectReason}
                class="border-outline bg-bg-primary rounded-md border-2 px-2 py-1 text-sm"
              />
            </label>

            <div class="flex flex-row flex-wrap gap-2">
              <button
                class="bg-success text-bg-primary rounded-md px-3 py-2 text-sm font-bold"
                onclick={() => decide('approve')}
              >
                Approve (a)
              </button>
              <button
                class="bg-danger text-bg-primary rounded-md px-3 py-2 text-sm font-bold"
                onclick={() => decide('reject')}
              >
                Reject (r)
              </button>
              <button
                class="border-outline rounded-md border px-3 py-2 text-sm font-bold"
                onclick={() => decide('escalate')}
              >
                Leave for later (e)
              </button>
            </div>
          </article>
        {/if}
      </div>
    {/if}
  {/if}
  </div>
</main>
