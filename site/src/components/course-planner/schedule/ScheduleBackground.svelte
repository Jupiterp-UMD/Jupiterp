<!-- 
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).

-->
<script lang="ts">
  import TimeLine from './TimeLine.svelte';

  function formatDecTime(decTime: number): string {
    let decTimeInDay = decTime % 24;
    if (decTimeInDay < 12) {
      return (decTimeInDay !== 0 ? decTimeInDay : '12') + ' AM';
    }
    if (decTimeInDay === 12) {
      return decTimeInDay + ' PM';
    }
    if (decTimeInDay > 12) {
      return decTimeInDay - 12 + ' PM';
    }
    // format-check exempt 1
    throw Error('Impossible `decTime` was not less than, equal to, or greater than 12');
  }

  let elt: HTMLDivElement | null = $state(null);
  let innerHeight: number = $state(0);
  let innerWidth: number = $state(0);

  interface Props {
    earliest?: number;
    latest?: number;
    h?: number;
  }

  // eslint-disable-next-line
  let { earliest = $bindable(0), latest = $bindable(0), h = $bindable(0) }: Props = $props();

  let displayTimes: number[] = $derived.by(() => {
    if (earliest || latest) {
      let times: number[] = [];
      for (let i = earliest; i <= latest; i++) {
        times.push(i);
      }
      return times;
    }
    return [];
  });

  let numBars: number = $derived(earliest || latest ? Math.min(21, (latest - earliest) * 2 + 1) : 17);

  $effect(() => {
    if (elt && innerHeight && innerWidth) {
      h = (elt.offsetHeight * (latest - earliest) * 2) / numBars;
    }
  });
</script>

<svelte:window bind:innerHeight bind:innerWidth />

<div bind:this={elt} class="h-full">
  <TimeLine number={formatDecTime(earliest)} position={0} />
  {#each displayTimes.slice(1, displayTimes.length) as time (time)}
    <TimeLine position={((time - earliest) * 2 - 1) / numBars} />
    <TimeLine number={formatDecTime(time)} position={((time - earliest) * 2) / numBars} />
  {/each}
</div>
