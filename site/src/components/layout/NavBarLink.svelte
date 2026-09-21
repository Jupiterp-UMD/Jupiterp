<!-- 
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).
Copyright (C) 2026 Andrew Cupps
-->
<script lang="ts">
  import { resolve } from '$app/paths';
  import type { Pathname } from '$app/types';

  interface Props {
    link: string;
    current?: boolean;
    class?: string;
    title?: string;
    children?: import('svelte').Snippet;
    isExternal?: boolean;
  }

  let { link, current = false, class: className = '', title = '', children, isExternal = false }: Props = $props();

  // Reactive derived values
  const { resolvedLink, target, rel } = $derived(
    isExternal
      ? { resolvedLink: link, target: '_blank', rel: 'noopener noreferrer' }
      : { resolvedLink: resolve(link as Pathname), target: '_self', rel: 'canonical' }
  );
</script>

<a
  // eslint-disable-next-line svelte/no-navigation-without-resolve
  href={resolvedLink}
  {target}
  {rel}
  class="hover:text-orange dark:hover:text-light-orange aria-current:text-orange aria-current:underline text-nowrap underline-offset-4 hover:transition-colors {className}"
  aria-current={current}
  {title}
>
  {@render children?.()}
</a>
