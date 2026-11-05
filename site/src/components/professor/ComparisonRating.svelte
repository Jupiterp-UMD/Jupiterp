<!--
This file is part of Jupiterp. For terms of use, please see LICENSE at
https://github.com/atcupps/Jupiterp/LICENSE.
-->
<script lang="ts">
  import { loadRatings, type ProfessorRating } from '../../lib/professor/Comparison';
  import StarRating from './StarRating.svelte';

  let { slug }: { slug: string } = $props();
  let rating = $state<ProfessorRating | null>(null);
  let status = $state<'loading' | 'loaded' | 'error'>('loading');

  $effect(() => {
    const selectedSlug = slug;
    let cancelled = false;
    rating = null;
    status = 'loading';
    loadRatings([selectedSlug])
      .then((result) => {
        if (cancelled) return;
        rating = result.get(selectedSlug) ?? null;
        status = 'loaded';
      })
      .catch(() => {
        if (!cancelled) status = 'error';
      });
    return () => {
      cancelled = true;
    };
  });
</script>

<div class="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1" aria-live="polite">
  {#if status === 'loading'}
    <p class="text-text-secondary text-sm">Loading rating…</p>
  {:else if rating?.display != null}
    <div class="flex flex-wrap items-center gap-2" aria-label={`${rating.display.toFixed(1)} out of 5`}>
      <StarRating value={rating.display} size="text-xl" />
      <span class="text-orange text-xl font-bold">{rating.display.toFixed(1)}</span>
      <span class="text-text-secondary text-xs">out of 5</span>
    </div>
    <span class="text-text-secondary text-sm">{rating.reviews} {rating.reviews === 1 ? 'review' : 'reviews'}</span>
  {:else}
    <p class="text-text-secondary text-sm">{status === 'error' ? 'Rating unavailable' : 'Not enough reviews yet'}</p>
  {/if}
</div>
