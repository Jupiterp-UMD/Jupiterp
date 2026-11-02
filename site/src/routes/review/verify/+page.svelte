<!--
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).
Copyright (C) 2026 Andrew Cupps

Where the emailed confirmation link lands.

Client-side rather than a server load: the token must not end up in a server
access log or a referrer header, and this way it stays in the URL fragment of
one browser session.
-->
<script lang="ts">
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import { activateReviewSessions, forgetReviewSessions, verifyReview } from '../../../lib/api/JupiterpApi';
  import ManageKey from '../../../components/professor/ManageKey.svelte';

  let status = $state<'working' | 'done' | 'failed'>('working');
  let message = $state('');
  let manageKey = $state('');
  /** When this browser can next submit without an email; null if it can't. */
  let sessionUntil = $state<Date | null>(null);

  $effect(() => {
    const token = page.url.searchParams.get('token');
    if (!token) {
      status = 'failed';
      message = 'That link is missing its token. Try opening it again from your email.';
      return;
    }
    void (async () => {
      const result = await verifyReview(token);
      status = result.ok ? 'done' : 'failed';
      message = result.message;
      manageKey = result.manageKey ?? '';
      // Also on a repeat visit: a mail scanner may have opened the link
      // first, and the reviewer's own click is the one that holds the
      // session token. The API starts a session only once either way.
      if (result.ok) {
        sessionUntil = (await activateReviewSessions(token)) ?? null;
      }
    })();
  });

  function forgetDevice() {
    forgetReviewSessions();
    sessionUntil = null;
  }
</script>

<svelte:head>
  <title>Confirm your review | Jupiterp</title>
  <!-- Never index a page reached by a single-use token. -->
  <meta name="robots" content="noindex" />
</svelte:head>

<!--
  `fixed top-12 bottom-0` with its own scroll container, matching every other
  document page. `body` is `height: 100svh; overflow-y: clip` for the planner,
  so a plain <main> starts underneath the fixed header and its rule -- which is
  what put this page's heading through the divider.

  The inner wrapper is `min-h-full` and centred, so a short confirmation sits in
  the middle of the space rather than jammed against the top, and a long one
  (the failure message plus the manage key) still scrolls normally.
-->
<main class="custom-scrollbar fixed inset-x-0 bottom-0 top-12 overflow-y-auto">
  <div class="mx-auto flex min-h-full w-full max-w-2xl flex-col justify-center px-4 py-10">
    {#if status === 'working'}
      <h1 class="text-2xl font-bold">Confirming…</h1>
    {:else if status === 'failed'}
      <h1 class="text-2xl font-bold">That didn't work</h1>
      <p class="my-3">{message}</p>
      <a href={resolve('/professors')} class="text-orange underline">Back to professors</a>
    {:else}
      <h1 class="text-2xl font-bold">Thanks, your review is in the queue</h1>
      <p class="my-3">{message}</p>

      {#if manageKey}
        <ManageKey {manageKey} />
      {/if}

      {#if sessionUntil}
        <p class="my-3 text-sm" role="status">
          This browser can post reviews without another email until
          {sessionUntil.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.
          <button class="text-orange font-bold underline" onclick={forgetDevice}>Forget this device</button>
        </p>
      {/if}

      <p class="text-text-secondary text-sm">
        A moderator reads every review before it appears. See the
        <a href={resolve('/review-policy')} class="text-orange underline">review policy</a>.
      </p>
    {/if}
  </div>
</main>
