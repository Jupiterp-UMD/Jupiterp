<!-- 
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).

-->
<script lang="ts">
  interface Props {
    text?: string; // Text to display
    tooltipText?: string; // Tooltip message
  }

  let { text = '', tooltipText = '' }: Props = $props();
  let tooltipVisible = $state(false);
</script>

<!-- Ignoring a11y features in Tooltips for now because they are not
    used in any meaningfully important functional way. This might be
    improved in the future with TODO(#29): Ensure accessibility features -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<span
  class="tooltip-trigger relative inline-block cursor-help underline decoration-dotted"
  onmouseenter={() => (tooltipVisible = true)}
  onmouseleave={() => (tooltipVisible = false)}
>
  {text}
  {#if tooltipVisible}
    <div
      class="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-40 -translate-x-1/2 text-wrap rounded-md bg-black px-2 py-1.5 text-center text-xs text-white shadow-lg"
    >
      {tooltipText}
    </div>
  {/if}
</span>
