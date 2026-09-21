<!-- 
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).

 -->
<script lang="ts">
  interface Props {
    title: string;
    version: string;
    date: string;
    children?: import('svelte').Snippet;
  }

  let { title, version, date, children }: Props = $props();
</script>

<article class="border-border mx-2 border-l-2 py-2">
  <div class="flex flex-col px-4">
    <div class="static flex flex-row items-end">
      <div class="bg-bg-primary -translate-x-6.75 absolute h-5 w-5 -translate-y-1 p-1.5">
        <div class="bg-orange h-full w-full rounded-full"></div>
      </div>
      <span class="mr-2 text-xl font-bold dark:text-white">
        {title}
      </span>
      <span class="text-text-secondary font-light"> {version} </span>
    </div>
    <span class="align-top text-sm italic">
      {date}
    </span>

    <div>
      {@render children?.()}
    </div>
  </div>
</article>
