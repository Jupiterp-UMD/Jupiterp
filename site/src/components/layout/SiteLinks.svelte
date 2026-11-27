<!-- 
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).

-->
<script lang="ts">
  import { base } from '$app/paths';
  import { afterNavigate } from '$app/navigation';
  import { page } from '$app/state';
  import NavBarLink from './NavBarLink.svelte';
  import ToolIcon from './ToolIcon.svelte';
  import DarkModeToggle from './DarkModeToggle.svelte';
  import { AngleDownOutline, GithubSolid } from 'flowbite-svelte-icons';

  interface NavLink {
    link: string;
    text: string;
    tool?: 'planner' | 'generator' | 'reviews' | 'teacher' | 'compare';
    children?: { link: string; text: string; isExternal?: boolean; icon?: import('svelte').Component }[];
    isExternal?: boolean;
  }

  afterNavigate(() => {
    for (const input of document.querySelectorAll<HTMLInputElement>('header input[type="checkbox"]')) {
      input.checked = false;
    }
  });

  const navLinks: NavLink[] = [
    { link: '/planner', text: 'Course Planner', tool: 'planner' },
    { link: '/generate', text: 'Schedule Generator', tool: 'generator' },
    { link: '/professors', text: 'Professors', tool: 'teacher' },
    { link: '/professors/compare', text: 'Compare Professors', tool: 'compare' },
    {
      link: '/about',
      text: 'About',
      children: [
        { link: '/review-policy', text: 'Review Policy' },
        { link: '/review/withdraw', text: 'Withdraw Review' },
        { link: '/terms-of-use', text: 'Terms of Use' },
        { link: '/privacy-policy', text: 'Privacy Policy' },
        { link: '/changelog', text: 'Changelog' },
        { link: '/bugs', text: 'Report Bugs' },
        { link: 'https://github.com/atcupps/Jupiterp', text: 'GitHub', isExternal: true, icon: GithubSolid },
      ],
    },
  ];

  // Strip the base path (set on GitHub Pages) so it compares against `link`.
  const currentPath: string = $derived(page.url.pathname.slice(base.length) || '/');
</script>

<!-- [START] Nav Menu Toggle -->
<input type="checkbox" id="nav-menu-toggle" class="peer hidden" />

<label for="nav-menu-toggle" class="group relative -mr-4 flex cursor-pointer select-none items-center px-4 xl:hidden">
  <svg xmlns="http://w3.org" width="1em" height="1em" viewBox="0 0 24 24" class="h-6 w-6">
    <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2">
      <!-- Top Line: Rotates and slides left by 2px on the X-axis -->
      <path
        d="M4 6h17"
        class="group-peer-checked:rotate-45 group-peer-checked:translate-x-0.5 origin-[4px_6px] transition-transform duration-300"
      />
      <!-- Middle Line: Fades out smoothly -->
      <path d="M4 12h15" class="group-peer-checked:opacity-0 transition-opacity duration-150 ease-in-out" />
      <!-- Bottom Line: Rotates and slides left by 2px on the X-axis -->
      <path
        d="M4 18h17"
        class="group-peer-checked:-rotate-45 group-peer-checked:translate-x-0.5 origin-[4px_18px] transition-transform duration-300"
      />
    </g>
  </svg>
  <div class="group-peer-checked:block fixed inset-0 top-12 hidden bg-black/50"></div>
</label>
<!-- [END] Nav Menu Toggle -->

<aside
  class="custom-scrollbar max-xl:bg-bg-primary xl:text-md max-xl:min-w-62 flex gap-2 px-6 py-4 text-lg max-xl:fixed max-xl:bottom-0 max-xl:right-0 max-xl:top-12 max-xl:translate-x-full max-xl:flex-col max-xl:overflow-y-auto max-xl:border-l-2 max-xl:transition-transform max-xl:duration-300 max-xl:peer-checked:translate-x-0 lg:gap-8 xl:gap-6 xl:px-0 xl:py-1.5"
>
  {#each navLinks as item, i (i)}
    {#if item.children}
      <div class="nav-list-wrapper relative">
        <!-- [START] Nav List Toggle  -->
        <input type="checkbox" id="nav-list-{i}" class="peer hidden" />

        <div class="flex justify-between xl:-mr-2">
          <NavBarLink
            link={item.link}
            current={currentPath === item.link ||
              (item.link === '/professors' && currentPath.startsWith('/professor/'))}
            isExternal={item.isExternal}
            class="flex items-center gap-2"
          >
            {#if item.tool}<ToolIcon kind={item.tool} small />{/if}
            {item.text}
          </NavBarLink>
          <label
            for="nav-list-{i}"
            class="nav-list-toggle hover:text-orange dark:hover:text-light-orange float-right origin-center transition-transform"
            ><AngleDownOutline height="1.75rem" width="1.75rem" class="p-0.75" />
          </label>
        </div>

        <label for="nav-list-{i}" class="fixed inset-0 hidden bg-black/50 xl:peer-checked:block"></label>
        <!-- [END] Nav List Toggle  -->

        <div
          style="transition: height 0.3s;"
          class="nav-list-contents xl:bg-bg-primary max-xl:border-border/50 -mt-px flex h-auto flex-col overflow-clip peer-checked:h-0 max-xl:border-y xl:absolute xl:right-0 xl:mt-2.5 xl:h-0 xl:min-w-48 xl:rounded-lg xl:border xl:peer-checked:h-auto"
        >
          {#each item.children as child, j (j)}
            <NavBarLink
              link={child.link}
              current={currentPath === child.link}
              isExternal={child.isExternal}
              class="xl:hover:bg-hover flex items-center px-4 py-1"
            >
              {child.text}
              {#if child.icon}
                {@const Icon = child.icon}
                <Icon class="ml-2 h-5 w-5" />
              {/if}
            </NavBarLink>
          {/each}
        </div>
      </div>
    {:else}
      <NavBarLink
        link={item.link}
        current={currentPath === item.link || (item.link === '/professors' && currentPath.startsWith('/professor/'))}
        isExternal={item.isExternal}
        class="flex items-center gap-2"
      >
        {#if item.tool}<ToolIcon kind={item.tool} small />{/if}
        {item.text}
      </NavBarLink>
    {/if}
  {/each}
  <div class="flex flex-col items-center justify-center text-sm max-xl:mt-auto max-xl:py-4">
    <DarkModeToggle iconOnly />
  </div>
</aside>

<style>
  div.nav-list-wrapper {
    interpolate-size: allow-keywords;
    --toggle-deg: 180deg;

    &:has(div.nav-list-contents :global(a[aria-current='true'])) > div > label.nav-list-toggle {
      color: var(--color-orange);
    }

    > div > label.nav-list-toggle {
      transform: rotate(var(--toggle-deg));
      transition: transform 0.2s ease;
    }

    &:has(input:checked) {
      --toggle-deg: 0deg;
    }

    /* Target desktop devices that support a real mouse hover */
    @media (min-width: 1280px) and (hover: hover) {
      padding-bottom: 0.75rem;
      margin-bottom: -0.75rem;
      --toggle-deg: 0deg;

      &:has(input:checked) {
        --toggle-deg: 180deg;
      }

      &:hover {
        --toggle-deg: 180deg;

        > div.nav-list-contents {
          height: auto;
          box-shadow:
            0 10px 15px -3px rgb(0 0 0 / 0.1),
            0 4px 6px -4px rgb(0 0 0 / 0.1);
        }
      }
    }

    /* Fallback behavior for tablets/touch screens wider than 1280px */
    @media (min-width: 1280px) and (hover: none) {
      --toggle-deg: 0deg;

      &:has(input:checked) {
        --toggle-deg: 180deg;
      }
    }
  }
</style>
