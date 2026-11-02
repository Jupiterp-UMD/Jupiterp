<!--
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).
Copyright (C) 2026 Andrew Cupps

A review's manage key, shown the one time the API hands it out: on the verify
page, and in the review form when a reviewer session skipped the email.
-->
<script lang="ts">
  import { resolve } from '$app/paths';

  /**
   * One below the heading of whatever contains this: 2 on the verify page,
   * under its h1; 4 in the review form, under its h3.
   */
  let { manageKey, headingLevel = 2 }: { manageKey: string; headingLevel?: 2 | 3 | 4 } = $props();

  let copied = $state(false);

  async function copyKey() {
    await navigator.clipboard.writeText(manageKey);
    copied = true;
  }
</script>

<div class="border-outline my-4 rounded-lg border-2 p-4">
  <svelte:element this={`h${headingLevel}`} class="font-bold">Save this key</svelte:element>
  <!--
    "withdraw", not "edit or withdraw". Editing has no route and no UI —
    it was removed deliberately — so the old wording promised something
    the site has never been able to do.
  -->
  <p class="my-2 text-sm">
    It is the only way to
    <a href={resolve('/review/withdraw')} class="text-orange underline">withdraw your review</a>
    later. We cannot recover it for you. By design, nothing links it back to you. We've emailed a copy too.
  </p>
  <code class="bg-bg-secondary block break-all rounded-md p-2 text-sm">{manageKey}</code>
  <button class="border-orange text-orange mt-2 rounded-md border px-3 py-1 text-sm font-bold" onclick={copyKey}>
    {copied ? 'Copied' : 'Copy key'}
  </button>
</div>
