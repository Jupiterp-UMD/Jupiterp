<!-- 
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).

-->
<script lang="ts">
  import { SunOutline } from 'flowbite-svelte-icons';
  import { MoonOutline } from 'flowbite-svelte-icons';

  function toggleDarkMode() {
    const isDark: boolean = localStorage.theme === 'dark';
    if (isDark) {
      localStorage.setItem('theme', 'light');
    } else {
      localStorage.setItem('theme', 'dark');
    }

    document.documentElement.classList.toggle('dark');
  }
</script>

<button
  class="border-outline hover:border-text-primary static mx-4 h-5 w-9 translate-y-[0%] rounded-[10px] border border-solid bg-transparent hover:transition-colors xl:translate-y-[10%]"
  title="Toggle Dark Mode"
  onclick={toggleDarkMode}
>
  <div
    class="bg-bg-secondary dark:bg-hover absolute left-0 top-[50%] h-4 w-4 translate-y-[-50%] transform rounded-lg transition-transform duration-300 ease-in-out dark:translate-x-[1.12rem]"
  >
    <SunOutline
      class="visible relative left-[50%] top-[50%] h-3 w-3 translate-x-[-55%] translate-y-[-50%] dark:hidden"
    />
    <MoonOutline
      class="relative left-[50%] top-[50%] hidden h-3 w-3 translate-x-[-50%] translate-y-[-50%] dark:block"
    />
  </div>
</button>
