<!-- This file is part of Jupiterp. See LICENSE at the repository root.
     Fit an illustrative panel within the welcome window without clipping it. -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  let { children }: { children: Snippet } = $props();
  let frame: HTMLDivElement | undefined = $state();
  let content: HTMLDivElement | undefined = $state();
  let scale = $state(1);

  $effect(() => {
    if (!frame || !content) return;
    const viewport = frame;
    const inner = content;
    function measure() {
      if (!viewport.clientWidth || !viewport.clientHeight || !inner.offsetHeight) return;
      scale = Math.min(
        1,
        viewport.clientHeight / inner.offsetHeight,
        viewport.clientWidth / Math.max(1, inner.scrollWidth)
      );
    }
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    observer.observe(inner);
    measure();
    return () => observer.disconnect();
  });
</script>

<div bind:this={frame} class="fit-frame">
  <div bind:this={content} class="fit-content" style:transform={`translate(-50%, -50%) scale(${scale})`}>
    {@render children()}
  </div>
</div>

<style>
  .fit-frame {
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 0;
    min-width: 0;
  }
  .fit-content {
    display: flow-root;
    position: absolute;
    top: 50%;
    left: 50%;
    width: 100%;
    transform-origin: center;
  }
</style>
