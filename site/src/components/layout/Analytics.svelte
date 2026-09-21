<!-- 
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).

-->

<script lang="ts">
  import { page } from '$app/state';

  $effect(() => {
    const gtagMaybe = (window as Window & { gtag?: (...args: unknown[]) => void }).gtag;
    if (typeof gtagMaybe !== 'undefined') {
      gtagMaybe('config', 'MEASUREMENT_ID', {
        page_title: document.title,
        page_path: page.url.pathname,
      });
    }
  });
</script>

<svelte:head>
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-8QVE1DKK4L">
  </script>
  <script>
    window.dataLayer = window.dataLayer || [];

    function gtag() {
      dataLayer.push(arguments);
    }

    gtag('js', new Date());
    gtag('config', 'G-8QVE1DKK4L');
  </script>
</svelte:head>
