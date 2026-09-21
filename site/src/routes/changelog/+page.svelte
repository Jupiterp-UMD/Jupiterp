<!-- 
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).
Copyright (C) 2026 Andrew Cupps
 -->
<script lang="ts">
  import ChangelogItem from '../../components/changelog/ChangelogItem.svelte';
  import changelog from './changelog.json';
</script>

<svelte:head>
  <title>Changelog | Jupiterp</title>
</svelte:head>

<main class="prose">
  <article>
    <h1>Changelog</h1>
    <p class="subtitle">Last Updated: {changelog[0]?.date || 'Unknown'}</p>

    {#each changelog as item, i (i)}
      <ChangelogItem title={item.title} version={item.version} date={item.date} index={i}>
        {item.content}
      </ChangelogItem>
    {/each}
  </article>
</main>
