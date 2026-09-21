<!-- 
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).

-->
<script lang="ts">
  interface Props {
    condition: string;
  }

  let { condition }: Props = $props();

  function extractPrefix(input: string): string | null {
    // eslint-disable-next-line
    const match = input.match(/^([A-Za-z0-9 ,/&\-\(\)\[\]]+?:)/);
    return match ? match[1] : null;
  }

  function extractRemainder(input: string): string {
    const prefix = extractPrefix(input);
    return prefix ? input.slice(prefix.length).trimStart() : input;
  }
</script>

<div class="flex flex-col pb-1">
  <span class="font-black underline">
    {extractPrefix(condition)}
  </span>
  {extractRemainder(condition)}<br />
</div>
