<!-- 
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).

-->
<script lang="ts">
  interface Props {
    number?: string;
    position?: number;
  }

  let { number = '', position = 0 }: Props = $props();
</script>

<div style="top: {position * 100}%" class="absolute h-7 w-full">
  <div
    style="left: 0; top: 50%; transform: translateY(-50%);"
    class="w-8.5 absolute text-right text-xs font-light 2xl:w-10 2xl:text-sm"
  >
    {number}
  </div>
  <div
    style="top: 50%;"
    class="bg-border absolute left-9 h-px w-[calc(100%-36px)] 2xl:left-11 2xl:w-[calc(100%-44px)]"
  ></div>
</div>
