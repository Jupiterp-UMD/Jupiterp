<!--
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).
Copyright (C) 2026 Andrew Cupps

Withdrawing a review.

Deliberately unlisted. It is not in the nav or the footer, and robots.txt keeps
it out of search results: it is a page for one person holding one key, and the
things that would make it discoverable to everyone else would also make it look
like a feature aimed at reviews other than your own.

Findable when it is wanted, though — the manage-key email links straight here,
the confirmation screen names it, and the review policy points at it, which is
the page someone looking for "how do I take my review down" will actually land
on.

Client-side throughout. The manage key is a bearer credential and must not
reach a server log or a referrer header, so it is never put in the URL and the
lookup runs from the browser.
-->
<script lang="ts">
  import { resolve } from '$app/paths';
  import { manageReview, withdrawReview, type ManagedReview } from '../../../lib/api/JupiterpApi';

  let manageKey = $state('');
  let review = $state<ManagedReview | null>(null);
  let stage = $state<'entering' | 'looking' | 'found' | 'withdrawing' | 'done'>('entering');
  let errorMessage = $state('');

  const STATUS_LABELS: Record<string, string> = {
    unverified: 'not yet confirmed',
    pending: 'awaiting moderation',
    escalated: 'awaiting moderation',
    approved: 'published',
    rejected: 'not published',
    withdrawn: 'already withdrawn',
  };

  async function findReview(event: SubmitEvent) {
    event.preventDefault();
    const key = manageKey.trim();
    if (key === '' || stage === 'looking') {
      return;
    }
    stage = 'looking';
    errorMessage = '';
    try {
      const found = await manageReview(key);
      if (found === null) {
        stage = 'entering';
        // Deliberately does not distinguish "no such key" from anything else.
        // The server gives the same answer either way, and repeating that here
        // keeps the page from becoming a way to test keys.
        errorMessage = 'That key was not recognised. Check it against the email we sent you.';
        return;
      }
      review = found;
      stage = 'found';
    } catch {
      stage = 'entering';
      errorMessage = 'Could not reach Jupiterp. Try again in a moment.';
    }
  }

  async function confirmWithdraw() {
    if (review === null || stage === 'withdrawing') {
      return;
    }
    const ok = window.confirm(
      'Withdraw this review?\n\n' +
        'The text is deleted, not hidden, and this cannot be undone. ' +
        'You can write a new review afterwards if you want to.'
    );
    if (!ok) {
      return;
    }
    stage = 'withdrawing';
    errorMessage = '';
    const success = await withdrawReview(review.id, manageKey.trim());
    if (success) {
      stage = 'done';
      return;
    }
    stage = 'found';
    errorMessage = 'That did not work. Try again, or reply to the email if it keeps failing.';
  }

  function termLabel(term: number | null): string {
    if (term === null) {
      return '';
    }
    const year = Math.floor(term / 100);
    return `${term % 100 === 8 ? 'Fall' : 'Spring'} ${year}`;
  }
</script>

<svelte:head>
  <title>Withdraw your review | Jupiterp</title>
  <!-- Unlisted: reached with a key, useful to one person, nothing to index. -->
  <meta name="robots" content="noindex" />
</svelte:head>

<!--
  `fixed top-12 bottom-0` with its own scroll container, matching every other
  document page. `body` is `height: 100svh; overflow-y: clip` for the planner,
  so a plain <main> starts underneath the fixed header and its rule.
-->
<main class="custom-scrollbar fixed inset-x-0 bottom-0 top-12 overflow-y-auto">
  <div class="mx-auto flex min-h-full w-full max-w-2xl flex-col justify-center px-4 py-10">
    {#if stage === 'done'}
      <h1 class="text-2xl font-bold">Your review has been withdrawn</h1>
      <p class="my-3">
        The text is gone from our database, not just hidden, and it no longer appears anywhere on Jupiterp. Your key
        will not work again.
      </p>
      <p class="text-text-secondary my-3 text-sm">
        You are welcome to write a new review of the same professor whenever you like.
      </p>
      <a href={resolve('/professors')} class="text-orange underline">Back to professors</a>
    {:else if stage === 'found' || stage === 'withdrawing'}
      <h1 class="text-2xl font-bold">Is this the review?</h1>
      <p class="my-3 text-sm">Check this is the one you meant before withdrawing it.</p>

      {#if review}
        <div class="border-outline my-4 rounded-lg border-2 p-4">
          <div class="flex flex-row flex-wrap items-baseline gap-x-2">
            <h2 class="font-bold">{review.instructor || 'Unknown professor'}</h2>
            <span class="text-text-secondary text-sm">
              {review.rating}/5
              {#if review.course_code}· {review.course_code}{/if}
              {#if review.term}· {termLabel(review.term)}{/if}
            </span>
          </div>
          <p class="text-text-secondary mt-1 text-xs">
            Submitted {new Date(review.submitted_at).toLocaleDateString()} ·
            {STATUS_LABELS[review.status] ?? review.status}
          </p>
          {#if review.title}
            <p class="mt-3 font-bold">{review.title}</p>
          {/if}
          {#if review.body}
            <p class="mt-1 whitespace-pre-wrap text-sm">{review.body}</p>
          {/if}
        </div>

        {#if review.withdrawable}
          <p class="my-2 text-sm">Withdrawing deletes the text rather than hiding it, and cannot be undone.</p>
          <div class="flex flex-row flex-wrap gap-2">
            <button
              class="border-danger text-danger rounded-md border-2 px-3 py-1 font-bold"
              disabled={stage === 'withdrawing'}
              onclick={confirmWithdraw}
            >
              {stage === 'withdrawing' ? 'Withdrawing…' : 'Withdraw this review'}
            </button>
            <button
              class="border-outline rounded-md border px-3 py-1"
              disabled={stage === 'withdrawing'}
              onclick={() => {
                review = null;
                stage = 'entering';
              }}
            >
              Cancel
            </button>
          </div>
        {:else}
          <p class="my-2 text-sm">
            There is nothing to withdraw — this review is {STATUS_LABELS[review.status] ?? review.status}.
          </p>
        {/if}
      {/if}

      {#if errorMessage}
        <p class="text-danger mt-3 text-sm" role="alert">{errorMessage}</p>
      {/if}
    {:else}
      <h1 class="text-2xl font-bold">Withdraw your review</h1>
      <p class="my-3">
        Paste the management key from the email we sent when you confirmed your review. We will show you the review
        before anything is removed.
      </p>

      <form onsubmit={findReview} class="flex flex-col gap-2">
        <label class="flex flex-col gap-1">
          <span class="text-sm font-bold">Management key</span>
          <input
            type="text"
            bind:value={manageKey}
            autocomplete="off"
            spellcheck="false"
            placeholder="the key from your confirmation email"
            class="border-outline bg-bg-primary rounded-md border-2 px-2 py-1 font-mono text-sm"
          />
        </label>
        <div>
          <button
            type="submit"
            class="border-orange text-orange rounded-md border-2 px-3 py-1 font-bold"
            disabled={manageKey.trim() === '' || stage === 'looking'}
          >
            {stage === 'looking' ? 'Looking…' : 'Find my review'}
          </button>
        </div>
      </form>

      {#if errorMessage}
        <p class="text-danger mt-3 text-sm" role="alert">{errorMessage}</p>
      {/if}

      <p class="text-text-secondary mt-6 text-sm">
        Lost the key? We cannot recover it — by design, nothing in our database links a review back to you, which is the
        same property that keeps your review anonymous. If your review is already published and you need it taken down,
        use the report link on the review itself and a moderator will read it.
      </p>
    {/if}
  </div>
</main>
