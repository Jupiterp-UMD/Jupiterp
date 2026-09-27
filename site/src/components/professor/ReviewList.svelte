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
  import StarRating from './StarRating.svelte';

  interface Props {
    instructorSlug: string;
    courseCode: string | null;
  }

  let { instructorSlug, courseCode }: Props = $props();

  const PAGE_SIZE = 10;

  let reviews = $state<Review[]>([]);
  let total = $state<number | null>(null);
  let status = $state<'loading' | 'loaded' | 'error'>('loading');
  let reportingId = $state<string | null>(null);
  let reportReason = $state('');
  let reportedIds = $state<Set<string>>(new Set());

  let requestId = 0;

  async function load(append = false, slug = instructorSlug, code = courseCode) {
    const id = ++requestId;
    try {
      const page = await reviewsFor(
        slug,
        { courseCode: code ?? undefined, limit: PAGE_SIZE, offset: append ? reviews.length : 0 },
        fetch
      );
      if (id !== requestId) return;
      reviews = append ? [...reviews, ...page.data] : page.data;
      total = page.total;
      status = 'loaded';
    } catch (error) {
      if (id !== requestId) return;
      console.error('Loading reviews failed:', error);
      status = 'error';
    }
  }

  $effect(() => {
    // Reading both is what registers the dependencies: this re-runs when the
    // professor or the page's course picker changes.
    const slug = instructorSlug;
    const code = courseCode;
    status = 'loading';
    reviews = [];
    void load(false, slug, code);
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
    <h3 class="text-lg font-bold">Reviews{courseCode === null ? '' : ` for ${courseCode}`}</h3>
    {#if total !== null && total > 0}
      <span class="text-text-secondary text-sm">{total} total</span>
    {/if}
  </div>

  {#if status === 'loading'}
    <p class="text-text-secondary text-sm">Loading reviews…</p>
  {:else if status === 'error'}
    <p class="text-text-secondary text-sm">Reviews could not be loaded.</p>
  {:else if reviews.length === 0 && courseCode !== null}
    <p class="text-text-secondary text-sm">No reviews for {courseCode} yet.</p>
  {:else if reviews.length === 0}
    <p class="text-text-secondary text-sm">
      No reviews yet. Jupiterp reviews are new, so if you've taken a course with this professor, yours would be the
      first!
    </p>
  {:else}
    <ul class="flex flex-col gap-3">
      {#each reviews as review (review.id)}
        {@const details = [
          review.course_code,
          review.term ? formatSemester(review.term) : null,
          review.expected_grade
            ? `Got ${/^[AEFIOU]/.test(review.expected_grade) ? 'an' : 'a'} ${review.expected_grade.replace('-', '−')}`
            : null,
        ].filter((part) => part !== null)}
        <li class="border-outline flex flex-row gap-4 rounded-lg border p-4">
          <div
            class="bg-bg-secondary flex size-20 shrink-0 flex-col items-center justify-center gap-1.5 self-start rounded-lg sm:size-24"
          >
            <span class="text-orange text-2xl font-bold leading-none sm:text-3xl">{review.rating.toFixed(1)}</span>
            <span class="sr-only">out of 5</span>
            <StarRating value={review.rating} size="text-xs sm:text-sm" />
          </div>

          <div class="flex min-w-0 flex-1 flex-col gap-1">
            <div class="flex flex-row items-baseline justify-between gap-3">
              {#if review.title}
                <span class="text-lg font-bold">{review.title}</span>
              {:else}
                <span class="text-text-secondary">{details.join(' · ')}</span>
              {/if}
              <span class="text-text-secondary shrink-0 text-sm">{formatDate(review.submitted_at)}</span>
            </div>
            {#if review.title && details.length > 0}
              <span class="text-text-secondary">{details.join(' · ')}</span>
            {/if}

            {#if review.body}
              <p class="mt-3 whitespace-pre-wrap leading-7">{review.body}</p>
            {/if}

            <!-- Reporting is the entirety of a professor's recourse, so it is a
               visible control on every review rather than a buried link. -->
            {#if reportedIds.has(review.id)}
              <p class="text-text-secondary mt-2 self-end text-sm">Reported. A moderator will look at it.</p>
            {:else if reportingId === review.id}
              <div class="flex flex-col gap-2 pt-3">
                <label class="flex flex-col gap-1">
                  <span class="text-sm font-bold">Which part of the policy does this breach?</span>
                  <input
                    bind:value={reportReason}
                    class="border-outline bg-bg-primary rounded-md border px-2 py-1 text-sm"
                  />
                </label>
                <div class="flex flex-row gap-2">
                  <button
                    class="border-orange text-orange rounded-md border px-2 py-1 text-sm font-bold"
                    onclick={() => submitReport(review.id)}
                  >
                    Send report
                  </button>
                  <button
                    class="text-text-secondary px-2 py-1 text-sm"
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
                class="text-text-secondary hover:text-text-primary mt-2 self-end text-sm underline"
                onclick={() => (reportingId = review.id)}
              >
                Report this review
              </button>
            {/if}
          </div>
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
