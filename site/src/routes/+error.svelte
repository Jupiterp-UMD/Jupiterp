<!-- 
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).

 -->
<script>
  import { page } from '$app/state';
</script>

<svelte:head>
  <title>Error {page.status} | Jupiterp</title>
</svelte:head>

<div class="fixed left-1/2 top-1/2 w-full -translate-x-1/2 -translate-y-1/2 pl-16">
  <h1 class="text-primary text-[3rem] font-bold">
    Error {page.status}: {page.error?.message}
  </h1>
</div>
