<!-- 
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).

-->
<script lang="ts">
  interface Props {
    isDesktop?: boolean;
  }

  let { isDesktop = $bindable(false) }: Props = $props();

  let innerWidth: number = $state(0);

  // Replaced run() with $effect to handle the side effect on the client
  $effect(() => {
    isDesktop = innerWidth >= 1024;
  });

  export { isDesktop };
</script>

<svelte:window bind:innerWidth />
