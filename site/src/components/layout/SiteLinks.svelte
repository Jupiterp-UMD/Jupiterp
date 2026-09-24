<!-- 
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).

-->
<script lang="ts">
  import { fade } from 'svelte/transition';
  import { page } from '$app/state';
  import { resolve } from '$app/paths';
  import NavBarElement from './NavBarElement.svelte';
  import DarkModeToggle from './DarkModeToggle.svelte';
  import ExpandableNavBarElement from './ExpandableNavBarElement.svelte';

  let siteLinksSelected: boolean = $state(false);

  let currentPage = $derived(page.url.pathname);
</script>

<!-- For larger screens -->
<div class="hidden grow justify-end self-center lg:flex">
  <NavBarElement link={resolve('/')} text="Course Planner" isOnPage={currentPage == '/'} />
  <NavBarElement link={resolve('/professors')} text="Professors List" isOnPage={currentPage == '/professors'} />
  <NavBarElement link={resolve('/generate')} text="Schedule Generator" isOnPage={currentPage == '/generate'} />
  <NavBarElement link={resolve('/bugs')} text="Report an Issue" isOnPage={currentPage == '/bugs'} />
  <ExpandableNavBarElement link={resolve('/about')} text="About" isOnPage={currentPage == '/about'}>
    <NavBarElement
      link={resolve('/terms-of-use')}
      text="Terms of Use"
      reduceXMargin={true}
      isOnPage={currentPage == '/terms-of-use'}
    />
    <NavBarElement
      link={resolve('/privacy-policy')}
      text="Privacy Policy"
      reduceXMargin={true}
      isOnPage={currentPage == '/privacy-policy'}
    />
    <NavBarElement
      link={resolve('/changelog')}
      text="Changelog"
      reduceXMargin={true}
      isOnPage={currentPage == '/changelog'}
    />
  </ExpandableNavBarElement>
  <NavBarElement link="https://github.com/atcupps/Jupiterp" text="GitHub" target="_blank" />
  <DarkModeToggle />
</div>

<!-- Button to toggle site links on mobile -->
<button
  title="Toggle site links"
  class="z-52 visible absolute right-5 top-3 h-6 w-6 lg:hidden"
  onclick={() => {
    siteLinksSelected = !siteLinksSelected;
  }}
>
  <!-- format-check exempt 10 -->
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 448 512"
    class="fill-text-primary visible h-full w-full transition"
    class:hidden={siteLinksSelected}
  >
    <!--!Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path
      d="M0 96C0 78.3 14.3 64 32 64H416c17.7 0 32 14.3 32 32s-14.3 32-32 32H32C14.3 128 0 113.7 0 96zM0 256c0-17.7 14.3-32 32-32H416c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32zM448 416c0 17.7-14.3 32-32 32H32c-17.7 0-32-14.3-32-32s14.3-32 32-32H416c17.7 0 32 14.3 32 32z"
    /></svg
  >
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 384 512"
    class="fill-text-primary visible h-full w-full"
    class:hidden={!siteLinksSelected}
  >
    <!--!Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path
      d="M376.6 84.5c11.3-13.6 9.5-33.8-4.1-45.1s-33.8-9.5-45.1 4.1L192 206 56.6 43.5C45.3 29.9 25.1 28.1 11.5 39.4S-3.9 70.9 7.4 84.5L150.3 256 7.4 427.5c-11.3 13.6-9.5 33.8 4.1 45.1s33.8 9.5 45.1-4.1L192 306 327.4 468.5c11.3 13.6 31.5 15.4 45.1 4.1s15.4-31.5 4.1-45.1L233.7 256 376.6 84.5z"
    /></svg
  >
</button>

<!-- Using this method to avoid having to listen to a variable on Schedule -->
{#if siteLinksSelected}
  <button
    aria-label="Close Site Links"
    style="height: calc(100% - 3rem);"
    class="z-55 visible fixed top-12 -mx-4 w-full bg-black/20 lg:hidden"
    in:fade={{ duration: 150 }}
    out:fade={{ duration: 150 }}
    onclick={() => (siteLinksSelected = false)}
  ></button>
{/if}

<!-- Mobile site links -->
<div
  class="site-links z-61 border-border bg-bg-primary w-75 visible fixed right-0 top-12 flex flex-col border-l-2 border-solid p-2 transition-transform duration-300 lg:hidden"
  class:site-links-transition={!siteLinksSelected}
  class:shadow-lg={siteLinksSelected}
>
  <div class="my-2 w-full text-lg">
    <NavBarElement link={resolve('/')} text="Course Planner" />
  </div>
  <div class="my-2 w-full text-lg">
    <NavBarElement link={resolve('/generate')} text="Schedule Generator" />
  </div>
  <div class="my-2 w-full text-lg">
    <NavBarElement link={resolve('/bugs')} text="Report an Issue" />
  </div>
  <div class="my-2 w-full text-lg">
    <NavBarElement link={resolve('/about')} text="About" />
  </div>
  <div class="my-2 w-full text-lg">
    <NavBarElement link={resolve('/terms-of-use')} text="Terms of Use" />
  </div>
  <div class="my-2 w-full text-lg">
    <NavBarElement link={resolve('/privacy-policy')} text="Privacy Policy" />
  </div>
  <div class="my-2 w-full text-lg">
    <NavBarElement link="https://github.com/atcupps/Jupiterp" text="GitHub" target="_blank" />
  </div>
</div>

<style>
  @media screen and (max-width: 1023px) {
    .site-links {
      height: calc(100svh - 3rem);
    }

    .site-links-transition {
      transition-property: transform;
      transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
      transition-duration: 150ms;
      transform: translateX(100%);
    }
  }
</style>
