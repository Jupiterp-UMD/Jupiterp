<!--
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).

One-time popup announcing professor profiles and reviews. Shown on a visitor's
first page load and never again once dismissed; bump ANNOUNCEMENT_KEY to show
a future announcement to everyone.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { resolve } from '$app/paths';
  import { ChartMixedOutline, MessagesOutline, CloseOutline } from 'flowbite-svelte-icons';

  const ANNOUNCEMENT_KEY = 'seenAnnouncement:professors-reviews';

  let dialog: HTMLDialogElement | undefined = $state();

  function hasSeen(): boolean {
    try {
      return localStorage.getItem(ANNOUNCEMENT_KEY) !== null;
    } catch {
      return true;
    }
  }

  function markSeen() {
    try {
      localStorage.setItem(ANNOUNCEMENT_KEY, '1');
    } catch {
      //
    }
  }

  function close() {
    dialog?.close();
  }

  onMount(() => {
    if (hasSeen()) {
      return;
    }
    markSeen();

    dialog?.showModal();
  });
</script>

<dialog
  bind:this={dialog}
  aria-labelledby="feature-announcement-title"
  onclick={(event) => {
    if (event.target === dialog) close();
  }}
  class="announcement bg-bg-primary text-text-primary border-border m-auto w-[min(28rem,calc(100%-2rem))] overflow-hidden rounded-xl border-2 p-0 shadow-2xl"
>
  <div class="bg-orange relative px-6 pb-5 pt-6 text-white">
    <button
      onclick={close}
      aria-label="Close"
      class="absolute right-3 top-3 rounded-md p-1 hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white"
    >
      <CloseOutline class="h-6 w-6" />
    </button>
    <h2 id="feature-announcement-title" class="text-3xl font-bold">New on Jupiterp! 🥳</h2>
  </div>

  <ul class="flex flex-col gap-5 px-6 py-6">
    <li class="flex gap-4">
      <ChartMixedOutline class="text-orange h-7 w-7 shrink-0" />
      <div>
        <h3 class="text-lg font-bold">Professor Profiles</h3>
        <p>Grade distributions and GPA history for every course a professor has taught!</p>
      </div>
    </li>
    <li class="flex gap-4">
      <MessagesOutline class="text-orange h-7 w-7 shrink-0" />
      <div>
        <h3 class="text-lg font-bold">Reviews</h3>
        <p>Read what other students say, and leave a review of your own!</p>
      </div>
    </li>
  </ul>

  <div class="flex gap-3 px-6 pb-6">
    <a
      href={resolve('/professors')}
      onclick={close}
      class="bg-orange flex-1 rounded-md px-4 py-3 text-center font-bold text-white hover:brightness-110"
    >
      Browse Professors
    </a>
    <button onclick={close} class="border-outline hover:bg-hover rounded-md border-2 px-5 py-3 font-medium">
      Not now
    </button>
  </div>
</dialog>

<style>
  .announcement::backdrop {
    background: rgb(0 0 0 / 0.5);
  }

  .announcement[open] {
    animation: rise 250ms ease-out;
  }

  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(1rem);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .announcement[open] {
      animation: none;
    }
  }
</style>
