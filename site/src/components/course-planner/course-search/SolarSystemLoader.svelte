<!--
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).
Copyright (C) 2026 Andrew Cupps
-->
<script lang="ts">
  interface Props {
    /**
     * SolarSystemLoader.svelte
     * A simple solar system themed loading animation
     * based on Marvin Rudolph's Orbit Loader
     */
    size?: number; // Default size in pixels
  }

  let { size = 120 }: Props = $props();
</script>

<div
  style="
    --wrapper-size: {size}px;
    --stroke-color: var(--color-text-secondary);
  "
  class="solar-system-wrapper"
  role="status"
  aria-label="Loading courses"
>
  <div class="solar-system">
    <!-- The Central Moon -->
    <div class="moon">
      <div class="crater c1"></div>
      <div class="crater c2"></div>
      <div class="crater c3"></div>
    </div>
    <!-- Middle Ring -->
    <div class="orbit-ring ring-2">
      <div class="planet planet-inner"></div>
    </div>
    <!-- Outer Ring -->
    <div class="orbit-ring ring-3">
      <div class="planet planet-outer"></div>
    </div>
  </div>
</div>

<style>
  /* Local Scoped Variables */
  .solar-system-wrapper {
    --orbit-width: 2px;
    --moon-border-width: 4px;
    --gap-size: 2px;

    /* Sizing based on the input of size */
    --moon-size: calc(var(--wrapper-size) * 0.3);
    --ring-2-size: calc(var(--wrapper-size) * 0.5);
    --ring-3-size: calc(var(--wrapper-size) * 0.69);
    --p-inner-size: 12px;
    --p-outer-size: 12px;

    display: inline-flex;
    justify-content: center;
    align-items: center;
  }

  /* The Main Container */
  .solar-system {
    position: relative;
    width: var(--wrapper-size);
    height: var(--wrapper-size);
    display: flex;
    justify-content: center;
    align-items: center;
  }

  /* --- The Moon --- */
  .moon {
    width: var(--moon-size);
    height: var(--moon-size);
    border: var(--moon-border-width) solid var(--stroke-color);
    border-radius: 50%;
    position: absolute;
    z-index: 10;
    background: transparent;
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden;
    box-sizing: border-box;
  }

  /* Moon Craters */
  .crater {
    position: absolute;
    background-color: var(--stroke-color);
    border-radius: 50%;
  }

  /* Craters stay responsive with site */
  .crater.c1 {
    width: 25%;
    height: 25%;
    top: 17%;
    left: 20%;
  }
  .crater.c2 {
    width: 15%;
    height: 15%;
    bottom: 20%;
    right: 22%;
  }
  .crater.c3 {
    width: 11%;
    height: 11%;
    top: 37%;
    right: 17%;
  }

  /* --- RINGS --- */
  .orbit-ring {
    position: absolute;
    border: var(--orbit-width) solid var(--stroke-color);
    border-radius: 50%;
    transform: translate(0, 0);
    box-sizing: border-box;
    background: transparent;
    outline: none;
    box-shadow: none;
    -webkit-tap-highlight-color: transparent;
  }

  .ring-2 {
    width: var(--ring-2-size);
    height: var(--ring-2-size);
    z-index: 2;
    animation: orbit-rotate 8s linear infinite;
    background: transparent;
    outline: none;
  }

  .ring-3 {
    width: var(--ring-3-size);
    height: var(--ring-3-size);
    z-index: 1;
    animation: orbit-rotate 14s linear infinite;
    background: transparent;
    outline: none;
  }

  /* --- PLANETS --- */
  .planet {
    background-color: var(--stroke-color);
    border-radius: 50%;
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    border: none;
    box-sizing: border-box;
  }

  .planet-inner {
    width: var(--p-inner-size);
    height: var(--p-inner-size);
    right: calc(-1 * (var(--p-inner-size) / 2) - var(--gap-size));
    margin-right: var(--gap-size);
  }

  .planet-outer {
    width: var(--p-outer-size);
    height: var(--p-outer-size);
    right: calc(-1 * (var(--p-outer-size) / 2) - var(--gap-size));
    margin-right: var(--gap-size);
  }

  /* --- ANIMATION --- */
  @keyframes orbit-rotate {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
</style>
