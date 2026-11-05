<!--
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).
Copyright (C) 2026 Andrew Cupps

What a professor's rating is made of, behind a small info button beside it.

The headline number blends two sources that make different claims: Jupiterp's
own reviews, and a PlanetTerp average frozen when it was imported. This lays
them out side by side, with the counts, so a reader can see which one they are
mostly looking at.
-->
<script module lang="ts">
  // Each card's id is its own, so two on one page cannot answer for each
  // other's `aria-controls`. Only rendered while open, which is only ever in
  // the browser, so the server and client counts never need to agree.
  let instances = 0;

  function nextCardId(): string {
    instances += 1;
    return `rating-breakdown-${instances}`;
  }
</script>

<script lang="ts">
  import { clickoutside } from '@svelte-put/clickoutside';
  import type { RatingBreakdown } from '../../lib/professor/Rating';

  interface Props {
    rating: RatingBreakdown;
  }

  let { rating }: Props = $props();

  let open = $state(false);
  const cardId = nextCardId();

  /** "Sep 2026". UTC so the server and the browser render the same month. */
  let asOf = $derived(
    rating.planetterpAsOf === null
      ? null
      : new Date(rating.planetterpAsOf).toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric',
          timeZone: 'UTC',
        })
  );

  let sources = $derived([
    { name: 'Jupiterp', value: rating.jupiterp, count: rating.jupiterpCount, note: null },
    {
      name: 'PlanetTerp',
      value: rating.planetterp,
      count: rating.planetterpCount,
      note: asOf === null ? null : `imported ${asOf}`,
    },
  ]);

  // Only worth explaining when it would change what the reader sees. With
  // plenty of reviews the two round to the same number.
  let rankingDiffers = $derived(
    !rating.displayIsRanking &&
      rating.combined !== null &&
      rating.display !== null &&
      rating.combined.toFixed(1) !== rating.display.toFixed(1)
  );

  function plural(count: number): string {
    return `${count.toLocaleString()} ${count === 1 ? 'review' : 'reviews'}`;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (open && event.key === 'Escape') {
      open = false;
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<span class="relative inline-flex" use:clickoutside onclickoutside={() => (open = false)}>
  <button
    type="button"
    class="hover:border-orange hover:text-orange inline-flex h-4 w-4 items-center justify-center rounded-full border text-[0.625rem] font-bold leading-none transition-colors {open
      ? 'border-orange text-orange'
      : 'border-text-secondary text-text-secondary'}"
    aria-label="How this rating is calculated"
    aria-expanded={open}
    aria-controls={open ? cardId : undefined}
    onclick={() => (open = !open)}
  >
    i
  </button>

  {#if open}
    <div
      id={cardId}
      role="dialog"
      aria-label="Rating breakdown"
      class="border-outline bg-bg-primary text-text-primary absolute right-0 top-full z-[60] mt-2 w-72 max-w-[calc(100vw-2rem)] cursor-default rounded-lg border-2 p-3 text-left text-sm font-normal shadow-lg"
    >
      <div class="pb-2 text-xs font-bold">How this rating is calculated</div>

      <table class="w-full border-collapse">
        <tbody>
          {#each sources as source (source.name)}
            <tr class="align-baseline">
              <th scope="row" class="py-1 pr-2 text-left font-semibold">{source.name}</th>
              {#if source.value !== null && source.count > 0}
                <td class="text-orange whitespace-nowrap py-1 pr-2 text-right font-bold">
                  ★ {source.value.toFixed(1)}
                </td>
                <td class="text-text-secondary py-1 text-right text-xs">
                  {plural(source.count)}
                  {#if source.note !== null}
                    <span class="block">{source.note}</span>
                  {/if}
                </td>
              {:else}
                <td colspan="2" class="text-text-secondary py-1 text-right text-xs">No reviews yet</td>
              {/if}
            </tr>
          {/each}
          <!-- No Overall row while the ranking score stands in for the
               average: it would label the shrunk number "the average of
               both", a 3.9 under a single 5-star review. -->
          {#if rating.display !== null && !rating.displayIsRanking}
            <tr class="border-outline border-t align-baseline">
              <th scope="row" class="pb-1 pr-2 pt-2 text-left font-semibold">Overall</th>
              <td class="text-orange whitespace-nowrap pb-1 pr-2 pt-2 text-right font-bold">
                ★ {rating.display.toFixed(1)}
              </td>
              <td class="text-text-secondary pb-1 pt-2 text-right text-xs">
                {plural(rating.count)}
              </td>
            </tr>
          {/if}
        </tbody>
      </table>

      <p class="text-text-secondary mt-2 text-xs leading-snug">
        {#if rating.displayIsRanking}
          The rating shown blends both, with recent reviews counting more, and leans toward the site-wide average until
          a professor has more reviews.
        {:else}
          Overall is the average of both, with recent reviews counting more.
        {/if}
      </p>
      {#if rankingDiffers && rating.combined !== null}
        <p class="text-text-secondary mt-2 text-xs leading-snug">
          When ranking professors, Jupiterp uses {rating.combined.toFixed(1)}, which leans toward the site-wide average
          until a professor has more reviews.
        </p>
      {/if}
    </div>
  {/if}
</span>
