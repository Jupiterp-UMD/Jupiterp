<!-- 
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).

-->
<script lang="ts">
  import { SunOutline, MoonOutline } from 'flowbite-svelte-icons';

  let currentTheme = $state(typeof localStorage !== 'undefined' ? localStorage.theme : 'light');

  function toggleDarkMode() {
    const isDark = currentTheme === 'dark';
    const nextTheme = isDark ? 'light' : 'dark';
    localStorage.setItem('theme', nextTheme);
    currentTheme = nextTheme;
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
  }

  let isDark = $derived(currentTheme === 'dark');
</script>

<div class="flex w-full items-center gap-2">
  <input type="checkbox" id="theme-toggle" class="sr-only" checked={isDark} onchange={toggleDarkMode} />

  <label
    for="theme-toggle"
    class="flex cursor-pointer select-none items-center max-md:mr-4"
    title="Switch to {isDark ? 'Light' : 'Dark'} Mode"
  >
    <div
      class="border-outline has-checked:border-orange has-checked:bg-orange has-focus-visible:ring-orange has-focus-visible:ring-2 has-focus-visible:ring-offset-2 relative inline-flex h-5 w-9 items-center rounded-full border-2 transition-colors"
    >
      <div
        class="bg-bg-secondary dark:bg-hover absolute left-0.5 top-[50%] h-3 w-3 translate-y-[-50%] transform rounded-lg transition-transform duration-300 ease-in-out dark:translate-x-[1.05rem]"
      >
        <SunOutline
          class="h-2.75 w-2.75 visible relative left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] dark:hidden"
        />
        <MoonOutline
          class="h-2.75 w-2.75 relative left-[50%] top-[50%] hidden translate-x-[-50%] translate-y-[-50%] dark:block"
        />
      </div>
    </div>

    <span class="ml-2 md:hidden">
      Switch to {isDark ? 'Light' : 'Dark'} Mode
    </span>
  </label>
</div>
