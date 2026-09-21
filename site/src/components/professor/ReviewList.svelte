<!--
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).
Copyright (C) 2026 Andrew Cupps
-->
<script lang="ts">
  import { reportReview, reviewsFor } from '../../lib/api/JupiterpApi';
  import type { Review } from '../../lib/api/types';
  import { formatSemester } from '../../lib/course-planner/Grades';

  interface Props {
    instructorSlug: string;
  }

  let { instructorSlug }: Props = $props();

  const PAGE_SIZE = 10;

  let reviews = $state<Review[]>([]);
  let total = $state<number | null>(null);
  let status = $state<'loading' | 'loaded' | 'error'>('loading');
  let reportingId = $state<string | null>(null);
  let reportReason = $state('');
  let reportedIds = $state<Set<string>>(new Set());

  async function load(append = false, slug = instructorSlug) {
    try {
      const page = await reviewsFor(slug, { limit: PAGE_SIZE, offset: append ? reviews.length : 0 }, fetch);
      reviews = append ? [...reviews, ...page.data] : page.data;
      total = page.total;
      status = 'loaded';
    } catch (error) {
      console.error('Loading reviews failed:', error);
      status = 'error';
    }
  }

  $effect(() => {
    // Reading the prop is what registers the dependency: this re-runs when the
    // slug changes, which is what the modal needs when a different professor
    // is opened without a navigation.
    const slug = instructorSlug;
    status = 'loading';
    reviews = [];
    void load(false, slug);
  });

  async function submitReport(id: string) {
    if (reportReason.trim() === '') {
      return;
    }
    await reportReview(id, reportReason.trim(), '');
    reportedIds = new Set([...reportedIds, id]);
    reportingId = null;
    reportReason = '';
  }

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  }

  let hasMore = $derived(total !== null && reviews.length < total);
</script>

<section aria-label="Student reviews" class="flex flex-col gap-3">
  <div class="flex flex-row items-baseline justify-between">
    <h3 class="text-lg font-bold">Reviews</h3>
    {#if total !== null && total > 0}
      <span class="text-text-secondary text-sm">{total} total</span>
    {/if}
  </div>

  {#if status === 'loading'}
    <p class="text-text-secondary text-sm">Loading reviews…</p>
  {:else if status === 'error'}
    <p class="text-text-secondary text-sm">Reviews could not be loaded.</p>
  {:else if reviews.length === 0}
    <p class="text-text-secondary text-sm">
      No reviews yet. Jupiterp reviews are new — if you've taken a course with this professor, yours would be the first.
    </p>
  {:else}
    <ul class="flex flex-col gap-3">
      {#each reviews as review (review.id)}
        <li class="border-outline rounded-lg border p-3">
          <div class="flex flex-row flex-wrap items-baseline gap-2">
            <span class="text-orange font-bold">{review.rating.toFixed(1)}</span>
            <span class="sr-only">out of 5</span>
            {#if review.title}
              <span class="font-bold">{review.title}</span>
            {/if}
          </div>

          <div class="text-text-secondary flex flex-row flex-wrap gap-2 text-xs">
            {#if review.course_code}<span>{review.course_code}</span>{/if}
            {#if review.term}<span>{formatSemester(review.term)}</span>{/if}
            {#if review.expected_grade}<span>Grade: {review.expected_grade}</span>{/if}
            <span>{formatDate(review.submitted_at)}</span>
          </div>

          {#if review.body}
            <p class="my-2 whitespace-pre-wrap text-sm leading-6">{review.body}</p>
          {/if}

          <!-- Reporting is the entirety of a professor's recourse, so it is a
               visible control on every review rather than a buried link. -->
          {#if reportedIds.has(review.id)}
            <p class="text-text-secondary text-xs">Reported. A moderator will look at it.</p>
          {:else if reportingId === review.id}
            <div class="flex flex-col gap-2 pt-2">
              <label class="flex flex-col gap-1">
                <span class="text-xs font-bold">Which part of the policy does this breach?</span>
                <input
                  bind:value={reportReason}
                  class="border-outline bg-bg-primary rounded-md border px-2 py-1 text-sm"
                />
              </label>
              <div class="flex flex-row gap-2">
                <button
                  class="border-orange text-orange rounded-md border px-2 py-1 text-xs font-bold"
                  onclick={() => submitReport(review.id)}
                >
                  Send report
                </button>
                <button
                  class="text-text-secondary px-2 py-1 text-xs"
                  onclick={() => {
                    reportingId = null;
                    reportReason = '';
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          {:else}
            <button
              class="text-text-secondary hover:text-text-primary text-xs underline"
              onclick={() => (reportingId = review.id)}
            >
              Report this review
            </button>
          {/if}
        </li>
      {/each}
    </ul>

    {#if hasMore}
      <button
        class="border-orange text-orange rounded-lg border px-3 py-2 text-sm font-bold"
        onclick={() => load(true)}
      >
        Show more reviews
      </button>
    {/if}
  {/if}
</section>
