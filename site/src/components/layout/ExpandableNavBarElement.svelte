<!-- 
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).

-->
<script lang="ts">
  import { AngleDownOutline } from 'flowbite-svelte-icons';

  interface Props {
    link: string;
    text: string;
    target?: string;
    isOnPage?: boolean;
    reduceXMargin?: boolean; // Added to prevent TypeScript errors from parent usage
    children?: import('svelte').Snippet;
  }

  let { link, text, target = '_self', isOnPage = false, reduceXMargin = false, children }: Props = $props();
</script>

<div class={`${reduceXMargin ? 'mx-1' : 'mx-4'} group relative flex px-1 font-normal`}>
  <!-- ERROR: Navigation without resolve as link can be external AND internal -->
  <!-- eslint-disable svelte/no-navigation-without-resolve -->
  <a
    href={link}
    {target}
    rel={target === '_blank' ? 'noopener noreferrer' : 'canonical'}
    class="inline-flex items-center hover:transition-colors"
  >
    <span
      class={`${isOnPage ? 'siteLinkUnderline text-orange' : 'text-text-primary hover:text-orange dark:hover:text-light-orange'}`}
    >
      {text}
    </span>
  </a>
  <!-- eslint-enable svelte/no-navigation-without-resolve -->
  <button
    title="Show more links"
    class="text-text-primary hover:text-orange group-focus-within:text-orange group-hover:text-orange dark:hover:text-light-orange group-focus-within:dark:text-light-orange group-hover:dark:text-light-orange -mr-2 px-1 transition-transform group-focus-within:rotate-180 group-hover:rotate-180"
  >
    <AngleDownOutline class="h-4 w-4" />
  </button>
  <div
    class="transition-visibility border-border bg-bg-primary invisible absolute top-full flex min-w-12 translate-x-[-12%] flex-col gap-2 rounded-lg border-2 p-2 group-focus-within:visible group-hover:visible"
  >
    {@render children?.()}
  </div>
</div>

<style>
  .siteLinkUnderline {
    display: inline-block;
    position: relative;
  }

  .siteLinkUnderline::after {
    content: '';
    position: absolute;
    width: 100%;
    height: 2px;
    bottom: 0;
    left: 0;
    transform: scaleX(95%);
    transform-origin: center;
    background-color: var(--color-orange);
  }
</style>
