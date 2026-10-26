<!--
This file is part of Jupiterp. For terms of use, please see LICENSE at
https://github.com/atcupps/Jupiterp/LICENSE.
-->
<script lang="ts">
  import {
    ComparisonStore,
    addToComparison,
    removeFromComparison,
    type ComparisonSelection,
  } from '../../stores/ComparisonStore';

  let {
    professor,
    compact = false,
    showLabel = false,
    expanded = $bindable(false),
  }: { professor: ComparisonSelection; compact?: boolean; showLabel?: boolean; expanded?: boolean } = $props();
  let added = $derived($ComparisonStore.some((entry) => entry.slug === professor.slug));
  let full = $derived(!added && $ComparisonStore.length >= 2);
</script>

<svelte:element
  this={compact ? 'span' : 'button'}
  type={compact ? undefined : 'button'}
  role={compact ? 'button' : undefined}
  tabindex={compact ? (full ? -1 : 0) : undefined}
  aria-disabled={full}
  class="compare-control border-outline text-orange inline-flex h-4 shrink-0 cursor-pointer items-center overflow-hidden rounded border text-xs font-semibold leading-none"
  class:selected={added}
  class:with-label={showLabel}
  class:expanded={expanded && !full}
  onpointerenter={(event: PointerEvent) => {
    if (event.pointerType === 'mouse') expanded = true;
  }}
  onpointerleave={() => {
    if (!compact) expanded = false;
  }}
  onblur={() => (expanded = false)}
  class:ml-1={compact}
  aria-label={`${added ? 'Remove' : 'Add'} ${professor.name} ${added ? 'from' : 'to'} comparison`}
  aria-pressed={added}
  disabled={compact ? undefined : full}
  title={full ? 'Remove a professor from the comparison tray first' : `${added ? 'Remove from' : 'Add to'} comparison`}
  onclick={(event: MouseEvent) => {
    event.stopPropagation();
    if (full) return;
    if (added) removeFromComparison(professor.slug);
    else addToComparison(professor);
  }}
  onkeydown={(event: KeyboardEvent) => {
    if (compact && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      event.stopPropagation();
      if (full) return;
      if (added) removeFromComparison(professor.slug);
      else addToComparison(professor);
    }
  }}
>
  {#if showLabel}
    <span aria-hidden="true">{added ? 'Added to comparison' : 'Add to comparison'}</span>
  {:else}
    <span class="plus" aria-hidden="true">+</span>
    <span class="label" aria-hidden="true">Compare</span>
  {/if}
</svelte:element>

<style>
  .compare-control {
    width: 1rem;
    transition:
      background-color 160ms ease,
      border-color 160ms ease;
  }
  .plus {
    width: 14px;
    flex-shrink: 0;
    text-align: center;
  }
  .label {
    white-space: nowrap;
    opacity: 0;
    transition: opacity 160ms ease;
  }
  .compare-control.selected {
    background: var(--orange);
    border-color: var(--orange);
    color: #000;
  }
  .compare-control[aria-disabled='true'] {
    cursor: default;
    opacity: 0.5;
  }
  .compare-control.expanded,
  .compare-control:focus-visible:not([aria-disabled='true']) {
    width: 5rem;
  }
  .compare-control.expanded .label,
  .compare-control:focus-visible .label {
    opacity: 1;
  }
  .compare-control.with-label {
    width: auto;
    height: 2rem;
    padding: 0 0.5rem;
    font-size: 0.875rem;
    white-space: nowrap;
  }
  @media (prefers-reduced-motion: reduce) {
    .compare-control,
    .label {
      transition: none;
    }
  }
</style>
