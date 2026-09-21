<!-- 
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).
Copyright (C) 2026 Andrew Cupps
-->
<script lang="ts">
  import { page } from '$app/state';
  import NavBarLink from './NavBarLink.svelte';
  import DarkModeToggle from './DarkModeToggle.svelte';
  import { AngleDownOutline, GithubSolid } from 'flowbite-svelte-icons';

  interface NavLink {
    link: string;
    text: string;
    children?: { link: string; text: string; isExternal?: boolean; icon?: import('svelte').Component }[];
    isExternal?: boolean;
  }

  const navLinks: NavLink[] = [
    { link: '/', text: 'Course Planner' },
    { link: '/generate', text: 'Schedule Generator' },
    {
      link: '/about',
      text: 'About',
      children: [
        { link: '/terms-of-use', text: 'Terms of Use' },
        { link: '/privacy-policy', text: 'Privacy Policy' },
        { link: '/changelog', text: 'Changelog' },
        { link: '/bugs', text: 'Report Bugs' },
        { link: 'https://github.com/atcupps/Jupiterp', text: 'GitHub', isExternal: true, icon: GithubSolid },
      ],
    },
  ];

  const currentPath: string = $derived(page.url.pathname);
</script>

<!-- [START] Nav Menu Toggle -->
<input type="checkbox" id="nav-menu-toggle" class="peer hidden" />

<label for="nav-menu-toggle" class="group relative -mr-4 flex cursor-pointer select-none items-center px-4 md:hidden">
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
  class="custom-scrollbar max-md:bg-bg-primary md:text-md max-md:min-w-62 flex gap-2 px-6 py-4 text-lg max-md:fixed max-md:bottom-0 max-md:right-0 max-md:top-12 max-md:translate-x-full max-md:flex-col max-md:overflow-y-auto max-md:border-l-2 max-md:transition-transform max-md:duration-300 max-md:peer-checked:translate-x-0 md:gap-6 md:px-0 md:py-2 lg:gap-8"
>
  {#each navLinks as item, i (i)}
    {#if item.children}
      <div class="nav-list-wrapper relative">
        <!-- [START] Nav List Toggle  -->
        <input type="checkbox" id="nav-list-{i}" class="peer hidden" />

        <div class="flex justify-between md:-mr-2">
          <NavBarLink link={item.link} current={currentPath === item.link} isExternal={item.isExternal}>
            {item.text}
          </NavBarLink>
          <label
            for="nav-list-{i}"
            class="nav-list-toggle hover:text-orange dark:hover:text-light-orange float-right origin-center transition-transform"
            ><AngleDownOutline height="1.75rem" width="1.75rem" class="p-0.75" />
          </label>
        </div>

        <label for="nav-list-{i}" class="fixed inset-0 hidden bg-black/50 md:peer-checked:block"></label>
        <!-- [END] Nav List Toggle  -->

        <div
          style="transition: height 0.3s;"
          class="nav-list-contents md:-left-4.25 md:bg-bg-primary md:peer-checked:border-border md:mt-2.75 -mt-px flex h-auto flex-col overflow-clip peer-checked:h-0 max-md:border-y md:absolute md:h-0 md:rounded-lg md:border md:peer-checked:h-auto"
        >
          {#each item.children as child, j (j)}
            <NavBarLink
              link={child.link}
              current={currentPath === child.link}
              isExternal={child.isExternal}
              class="md:hover:bg-hover flex items-center px-4 py-1"
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
      <NavBarLink link={item.link} current={currentPath === item.link} isExternal={item.isExternal}>
        {item.text}
      </NavBarLink>
    {/if}
  {/each}
  <div class="flex flex-col items-center justify-center text-sm max-md:mt-auto max-md:py-4">
    <DarkModeToggle />
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
    @media (min-width: 768px) and (hover: hover) {
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

    /* Fallback behavior for tablets/touch screens wider than 768px */
    @media (min-width: 768px) and (hover: none) {
      --toggle-deg: 0deg;

      &:has(input:checked) {
        --toggle-deg: 180deg;
      }
    }
  }
</style>
