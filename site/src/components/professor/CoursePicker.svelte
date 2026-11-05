<!--
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).
Copyright (C) 2026 Andrew Cupps
-->
<script lang="ts">
  import SearchableSelect from './SearchableSelect.svelte';

  interface Props {
    codes: string[];
    selected: string | null;
    id: string;
    allowAll?: boolean;
    placeholder?: string;
    label?: string;
    widthClass?: string;
    compact?: boolean;
  }

  let {
    codes,
    selected = $bindable(),
    id,
    allowAll = true,
    placeholder = 'All courses',
    label = 'Course',
    widthClass,
    compact,
  }: Props = $props();

  let options = $derived([
    ...(allowAll ? [{ value: null, label: 'All courses' }] : []),
    ...[...codes]
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .map((code) => ({ value: code, label: code })),
  ]);
</script>

<SearchableSelect {options} bind:selected {id} {placeholder} {label} {widthClass} {compact} />
