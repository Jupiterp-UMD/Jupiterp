<!--
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).
Copyright (C) 2026 Andrew Cupps
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { resolve } from '$app/paths';
  import { env } from '$env/dynamic/public';
  import { submitReview } from '../../lib/api/JupiterpApi';
  import StarRatingInput from './StarRatingInput.svelte';

  interface Props {
    instructorSlug: string;
    instructorName: string;
    /** Courses this professor has taught, for the course picker. */
    courseCodes?: string[];
  }

  let { instructorSlug, instructorName, courseCodes = [] }: Props = $props();

  const GRADES = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F', 'W', 'Other'];

  /**
   * Fall and Spring only, newest first.
   *
   * The grade dataset covers those two terms permanently, and the API rejects
   * anything else, so offering Summer here would only produce a confusing
   * server-side error after the user has written five hundred words.
   */
  const TERMS: { value: number; label: string }[] = (() => {
    const out: { value: number; label: string }[] = [];
    const now = new Date();
    const year = now.getFullYear();
    for (let y = year; y >= year - 8; y--) {
      out.push({ value: y * 100 + 8, label: `Fall ${y}` });
      out.push({ value: y * 100 + 1, label: `Spring ${y}` });
    }
    return out.filter((t) => t.value <= year * 100 + (now.getMonth() >= 7 ? 8 : 1));
  })();

  /**
   * The term in progress, which is the one nearly every review is about.
   *
   * TERMS is newest-first and already truncated to terms that have started, so
   * its first entry is the current one. Prefilled rather than left blank
   * because the alternative is a form where the most common answer is the one
   * requiring the most work, and an unset term makes a review much less useful
   * to the next student reading it.
   */
  const CURRENT_TERM = TERMS.length > 0 ? String(TERMS[0].value) : '';

  let rating = $state(4);
  let courseCode = $state('');
  let term = $state(CURRENT_TERM);
  let expectedGrade = $state('');
  let title = $state('');
  let body = $state('');
  let email = $state('');
  let agreed = $state(false);

  let status = $state<'idle' | 'sending' | 'sent' | 'error'>('idle');
  let errorMessage = $state('');

  /* ============================== captcha ============================== */

  /**
   * Cloudflare Turnstile.
   *
   * Read through `$env/dynamic/public`, not `import.meta.env`. Vite only
   * exposes variables matching its `envPrefix`, which defaults to `VITE_` and
   * is not overridden here, so `import.meta.env.PUBLIC_TURNSTILE_SITE_KEY` was
   * `undefined` no matter what was configured.
   *
   * That was the smaller of two problems. The widget was a bare
   * `<div class="cf-turnstile">` and nothing ever loaded Cloudflare's script,
   * so no widget was rendered, the hidden input the old code read was never
   * created, and `captcha_token` was `undefined` on every submission. The API
   * treats an empty `TURNSTILE_SECRET_KEY` as "captcha satisfied", which is
   * why this passed a browser walkthrough - and why setting that secret in
   * production, which the rollout runbook instructs, would have made every
   * submission fail with "captcha verification failed".
   *
   * Rendered explicitly rather than by Cloudflare's implicit scan: the form is
   * mounted by client-side navigation long after any inline script has run.
   */
  const siteKey = env.PUBLIC_TURNSTILE_SITE_KEY ?? '';
  const TURNSTILE_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

  let captchaToken = $state('');
  let captchaEl = $state<HTMLDivElement | null>(null);
  let captchaFailed = $state(false);
  let widgetId: string | undefined;

  function loadTurnstile(): Promise<void> {
    if (window.turnstile !== undefined) {
      return Promise.resolve();
    }
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${TURNSTILE_SRC}"]`);
    const script = existing ?? document.createElement('script');
    const ready = new Promise<void>((resolve, reject) => {
      script.addEventListener('load', () => resolve());
      script.addEventListener('error', () => reject(new Error('Turnstile script failed to load')));
    });
    if (existing === null) {
      script.src = TURNSTILE_SRC;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    return ready;
  }

  onMount(() => {
    // No key configured: development, or a deployment that has deliberately
    // left captcha off. The API is the thing that decides whether a token is
    // required, so this only has to not get in the way.
    if (siteKey === '') {
      return;
    }
    let cancelled = false;
    loadTurnstile()
      .then(() => {
        if (cancelled || window.turnstile === undefined || captchaEl === null) {
          return;
        }
        widgetId = window.turnstile.render(captchaEl, {
          sitekey: siteKey,
          callback: (token: string) => {
            captchaToken = token;
            captchaFailed = false;
          },
          // Turnstile tokens expire after a few minutes. Someone writing a
          // considered review will routinely take longer than that, so this
          // has to clear the token rather than let a stale one be submitted.
          'expired-callback': () => {
            captchaToken = '';
          },
          'error-callback': () => {
            captchaToken = '';
            captchaFailed = true;
          },
        });
      })
      .catch((error) => {
        // Do not silently allow the submission: the API will refuse it anyway,
        // and a form that says nothing while failing is worse than one that
        // explains itself.
        console.error('Turnstile did not load:', error);
        captchaFailed = true;
      });

    return () => {
      cancelled = true;
      if (widgetId !== undefined) {
        window.turnstile?.remove(widgetId);
      }
    };
  });

  /** A token is only required when a site key is actually configured. */
  let captchaReady = $derived(siteKey === '' || captchaToken !== '');

  let bodyLength = $derived([...body].length);
  let titleLength = $derived([...title].length);
  let canSubmit = $derived(status !== 'sending' && email.trim() !== '' && agreed && captchaReady);

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }
    status = 'sending';
    errorMessage = '';

    const result = await submitReview({
      instructor_slug: instructorSlug,
      course_code: courseCode || undefined,
      term: term ? Number(term) : undefined,
      rating,
      expected_grade: expectedGrade || undefined,
      title: title.trim() || undefined,
      body: body.trim() || undefined,
      email: email.trim(),
      // Held in state by the widget's callback rather than scraped out of the
      // DOM. Undefined only when no site key is configured, which is the case
      // the API treats as captcha satisfied.
      captcha_token: captchaToken === '' ? undefined : captchaToken,
    });

    if (result.ok) {
      status = 'sent';
      return;
    }
    status = 'error';
    errorMessage = result.error ?? 'Something went wrong.';

    // A Turnstile token is single-use. Without this the retry after any
    // failure - a rate limit, a typo in the address - resubmits a token the
    // server has already consumed, and the second attempt fails on the captcha
    // instead of on whatever the user just fixed.
    if (widgetId !== undefined) {
      captchaToken = '';
      window.turnstile?.reset(widgetId);
    }
  }
</script>

{#if status === 'sent'}
  <!-- Deliberately says nothing about whether this address had already
       reviewed this professor. The API answers identically either way, and
       leaking the difference here would undo that. -->
  <div class="border-outline rounded-lg border-2 p-4">
    <h3 class="text-lg font-bold">Check your email</h3>
    <p class="my-2 text-sm">
      If <b>{email}</b> is a valid UMD address, a confirmation link is on its way. Your review is not submitted until you
      click it.
    </p>
    <p class="text-text-secondary my-2 text-sm">
      The link expires in 48 hours. Check your spam folder — university mail filters are aggressive.
    </p>
  </div>
{:else}
  <form class="border-outline flex flex-col gap-4 rounded-lg border-2 p-4" onsubmit={handleSubmit}>
    <h3 class="text-lg font-bold">Review {instructorName}</h3>

    <div class="flex flex-col gap-1">
      <span class="text-sm font-bold">Rating</span>
      <StarRatingInput bind:value={rating} />
    </div>

    <div class="flex flex-row flex-wrap gap-3">
      <label class="flex flex-col gap-1">
        <span class="text-sm font-bold">Course <span class="text-text-secondary">(optional)</span></span>
        <!--
          A select, matching Term and Grade beside it. This was an input with a
          datalist, which renders as a text box with a browser-drawn suggestion
          popup: a different height, a different control, and a dropdown that
          floats away from the field rather than under it.

          Nothing is lost by closing the list. The options are every course this
          professor is teaching now plus every one they have grade history for,
          so a student reviewing a course they took has it; and the field is
          optional, so a course that is somehow missing is left blank rather
          than blocking the review.
        -->
        <select bind:value={courseCode} class="border-outline bg-bg-primary rounded-md border-2 px-2 py-1">
          <option value="">—</option>
          {#each courseCodes as code (code)}
            <option value={code}>{code}</option>
          {/each}
        </select>
      </label>

      <label class="flex flex-col gap-1">
        <span class="text-sm font-bold">Term <span class="text-text-secondary">(optional)</span></span>
        <select bind:value={term} class="border-outline bg-bg-primary rounded-md border-2 px-2 py-1">
          <option value="">—</option>
          {#each TERMS as option (option.value)}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
      </label>

      <label class="flex flex-col gap-1">
        <span class="text-sm font-bold">Your grade <span class="text-text-secondary">(optional)</span></span>
        <select bind:value={expectedGrade} class="border-outline bg-bg-primary rounded-md border-2 px-2 py-1">
          <option value="">—</option>
          {#each GRADES as grade (grade)}
            <option value={grade}>{grade}</option>
          {/each}
        </select>
      </label>
    </div>

    <label class="flex flex-col gap-1">
      <span class="text-sm font-bold">
        Title <span class="text-text-secondary">(optional, {titleLength}/120)</span>
      </span>
      <input bind:value={title} maxlength="120" class="border-outline bg-bg-primary rounded-md border-2 px-2 py-1" />
    </label>

    <label class="flex flex-col gap-1">
      <span class="text-sm font-bold">
        Review <span class="text-text-secondary">(optional, {bodyLength}/5000)</span>
      </span>
      <textarea
        bind:value={body}
        maxlength="5000"
        rows="6"
        placeholder="What was the course actually like? Workload, grading, whether the lectures helped."
        class="border-outline bg-bg-primary rounded-md border-2 px-2 py-1"></textarea>
    </label>

    <label class="flex flex-col gap-1">
      <span class="text-sm font-bold">UMD email</span>
      <input
        type="email"
        bind:value={email}
        required
        placeholder="you@terpmail.umd.edu"
        autocomplete="email"
        class="border-outline bg-bg-primary rounded-md border-2 px-2 py-1"
      />
      <!-- Explaining this inline rather than in a policy nobody opens is the
           difference between a form people complete and one they abandon. -->
      <span class="text-text-secondary text-xs">
        Used once to check you're at UMD and to stop duplicate reviews. Stored only as an irreversible hash — never
        shown to anyone, including the professor.
      </span>
    </label>

    <!-- Cloudflare Turnstile is rendered into this element on mount, when a
         site key is configured. Nothing is shown at all when it is not. -->
    {#if siteKey !== ''}
      <div bind:this={captchaEl}></div>
      {#if captchaFailed}
        <p class="text-danger text-sm" role="alert">
          The human check could not load. Reload the page and try again — reviews cannot be submitted without it.
        </p>
      {/if}
    {/if}

    <label class="flex flex-row items-start gap-2 text-sm">
      <input type="checkbox" bind:checked={agreed} class="accent-orange mt-1" required />
      <span>
        This is my own first-hand experience of a course I took, and it follows the
        <a href={resolve('/review-policy')} class="text-orange underline" target="_blank" rel="noopener"
          >review policy</a
        >.
      </span>
    </label>

    {#if status === 'error'}
      <p class="text-danger text-sm" role="alert">{errorMessage}</p>
    {/if}

    <button
      type="submit"
      disabled={!canSubmit}
      class="bg-orange text-bg-primary rounded-lg px-4 py-2 font-bold disabled:opacity-50"
    >
      {status === 'sending' ? 'Sending…' : 'Submit review'}
    </button>

    <p class="text-text-secondary text-xs">
      Every review is read by a moderator before it appears. You'll get a link to edit or withdraw it.
    </p>
  </form>
{/if}
