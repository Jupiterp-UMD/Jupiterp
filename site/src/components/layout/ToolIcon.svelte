<!-- This file is part of Jupiterp. See LICENSE at the repository root. -->
<script lang="ts">
  export type ToolKind = 'planner' | 'generator' | 'grades' | 'reviews' | 'teacher' | 'compare' | 'export';
  let { kind, small = false }: { kind: ToolKind; small?: boolean } = $props();
</script>

<span class="tool-icon {kind}" class:small>
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    {#if kind === 'planner'}
      <rect x="4" y="5" width="16" height="16" rx="2" /><path d="M8 3v4m8-4v4M4 10h16M8 14h3m-3 3h6" />
    {:else if kind === 'generator'}
      <path d="m5 20 12-12 3 3L8 23M14 5l1-3m6 4 2-1m-3 11 3 1M4 9l2 1m5-4 1-2" transform="translate(0 -2)" />
    {:else if kind === 'grades'}
      <rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 16v-3m3 3V8m3 8v-5M8 18h8" />
    {:else if kind === 'reviews'}
      <path d="M5 4h14a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-9l-5 4V5a1 1 0 0 1 1-1ZM8 8h9m-9 3h7m-7 3h4" />
    {:else if kind === 'teacher'}
      <path d="M9 3h12v12h-9m4 0v6m-3 0h6" />
      <circle cx="4.5" cy="7" r="2" />
      <path d="M2 21v-6a3 3 0 0 1 3-3h2l5-4M5 15v6m8-15h5m-4 3h4" />
    {:else if kind === 'compare'}
      <path d="M12 3v17m-4 1h8M5 6h14M5 6l-3 7h6L5 6Zm14 0-3 7h6l-3-7Z" />
    {:else}
      <path d="m3 10 18-7-6 18-4-7-8-4Zm8 4L21 3" />
    {/if}
  </svg>
</span>

<style>
  .tool-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 38px;
    height: 38px;
    border-radius: 10px;
  }
  .small {
    width: 30px;
    height: 30px;
    border-radius: 8px;
  }
  .planner {
    background: #ffe3d6;
    color: #df632f;
  }
  .generator {
    background: #ffebc6;
    color: #a76b16;
  }
  .grades {
    background: #e1e7ff;
    color: #5c6cc5;
  }
  .reviews,
  .teacher {
    background: #d9f1e2;
    color: #409264;
  }
  .compare {
    background: #eae3ff;
    color: #8162c6;
  }
  .export {
    background: #fff3bd;
    color: #8e7b1f;
  }
  :global(.dark) .planner {
    color: #ffab83;
  }
  :global(.dark) .generator {
    color: #f3c76c;
  }
  :global(.dark) .grades {
    color: #a4b4ff;
  }
  :global(.dark) .reviews,
  :global(.dark) .teacher {
    color: #80d6a5;
  }
  :global(.dark) .compare {
    color: #bfa4ff;
  }
  :global(.dark) .export {
    color: #e9d574;
  }
  :global(.dark) .tool-icon {
    background: color-mix(in srgb, currentColor 20%, #17202c);
  }
</style>
