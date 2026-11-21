<!-- This file is part of Jupiterp. See LICENSE at the repository root.
     Landing page based on the supplied Jupiterp landing-page design. -->
<script lang="ts">
  import { asset, resolve } from '$app/paths';
  import { afterNavigate } from '$app/navigation';
  import { tick } from 'svelte';
  import type { Snapshot } from '@sveltejs/kit';
  import type { Pathname } from '$app/types';
  import { tools } from '$lib/landing/Tools';
  import { TERM_NAME } from '$lib/term';
  import ToolIcon from '../components/layout/ToolIcon.svelte';
  import ToolPreview from '../components/landing/ToolPreview.svelte';
  import FitContent from '../components/landing/FitContent.svelte';
  let active = $state(0);
  let landing: HTMLElement | undefined = $state();
  afterNavigate(({ to, type }) => {
    // The page scrolls inside a fixed main, outside SvelteKit's window reset.
    if (type !== 'popstate' && !to?.url.hash) landing?.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  });
  export const snapshot: Snapshot<{ scrollTop: number; active: number }> = {
    capture: () => ({ scrollTop: landing?.scrollTop ?? 0, active }),
    restore: (saved) => {
      active = saved.active;
      // Restore after the selected preview has rendered at its original height.
      void tick().then(() => landing?.scrollTo({ top: saved.scrollTop, left: 0, behavior: 'instant' }));
    },
  };
  let current = $derived(tools[active]);
  function select(index: number) {
    active = index;
  }
  function exploreMore() {
    document.getElementById('more-tools')?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      block: 'start',
    });
  }
  const footerLinks = [
    ['/about', 'About'],
    ['/terms-of-use', 'Terms of Use'],
    ['/privacy-policy', 'Privacy Policy'],
    ['/changelog', 'Changelog'],
    ['/bugs', 'Report Bugs'],
  ];
</script>

<svelte:head>
  <title>Jupiterp — Build your UMD schedule</title>
  <meta
    name="description"
    content="Plan your UMD courses, generate schedules, explore grade data, compare professors, and take your schedule with you. Free and open source."
  />
</svelte:head>

<main bind:this={landing} class="landing custom-scrollbar">
  <section class="hero" aria-label="Welcome to Jupiterp">
    <div class="planet" aria-hidden="true">
      <svg viewBox="20 50 285 285" fill="none" aria-hidden="true">
        <image href={asset('/logo.svg')} width="1343" height="355" />
      </svg>
    </div>
    <div class="welcome-window">
      <div class="window-bar">
        <div class="traffic" aria-hidden="true"><i></i><i></i><i></i></div>
        <span>Welcome to Jupiterp — more than a course planner</span>
      </div>
      <div class="welcome-body">
        <nav class="tool-tabs" aria-label="Explore Jupiterp tools">
          {#each tools as tool, index (tool.id)}
            <button
              type="button"
              class:active={active === index}
              onclick={() => select(index)}
              aria-pressed={active === index}
              aria-controls="welcome-tool"><ToolIcon kind={tool.id} small /><span>{tool.label}</span></button
            >
          {/each}
        </nav>
        <div id="welcome-tool" class="welcome-content">
          <div class="welcome-copy">
            <FitContent>
              <h1>{current.headline}</h1>
              <p class="intro">{current.intro}</p>
              <ul>
                {#each current.bullets as bullet (bullet)}<li><span aria-hidden="true">✓</span>{bullet}</li>{/each}
              </ul>
              {#if current.id === 'reviews'}
                <aside class="review-promise" aria-label="Review moderation and turnaround">
                  <strong>Read, approved, then published.</strong>
                  <p>
                    Every published review is read and approved. About 99% of submitted reviews appear on the site
                    within a few minutes.
                  </p>
                </aside>
              {/if}
              <div class="hero-actions">
                <a class="primary" href={resolve(current.href)}>{current.cta} →</a>
              </div>
              <button class="next-tool" type="button" onclick={() => select((active + 1) % tools.length)}
                >Next: {tools[(active + 1) % tools.length].label} →</button
              >
            </FitContent>
          </div>
          <div class="welcome-preview"><FitContent><ToolPreview kind={current.id} compact /></FitContent></div>
        </div>
      </div>
    </div>
    <button
      type="button"
      class="explore-more"
      aria-label="Explore more Jupiterp features"
      title="Explore more"
      onclick={exploreMore}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"><path d="M12 4v15m-6-6 6 6 6-6" /></svg
      >
    </button>
  </section>

  <div id="more-tools" class="tool-tour content-width">
    {#each tools.filter((tool) => tool.id !== 'export') as tool, index (tool.id)}
      <section id={tool.id} class="tool-section" class:reverse={index % 2 === 1} aria-labelledby={`${tool.id}-heading`}>
        <div class="tool-copy">
          <div class="section-icon"><ToolIcon kind={tool.id} /></div>
          <h2 id={`${tool.id}-heading`}>{tool.name}</h2>
          <p class="description">{tool.description}</p>
          <div class="section-actions">
            <a class="primary" href={resolve(tool.href)}>{tool.cta} →</a>{#if tool.id === 'reviews'}<a
                class="policy-link"
                href={resolve('/review-policy')}>Read the review policy</a
              >{/if}
          </div>
        </div>
        <div class="tool-visual"><ToolPreview kind={tool.id} /></div>
      </section>
    {/each}
  </div>

  <section class="final-cta content-width">
    <img class="cta-logo" src={asset('/logo.svg')} alt="Jupiterp" width="180" height="48" loading="lazy" />
    <h2>{TERM_NAME} is open.<br />Start planning.</h2>
    <p>Free and open source, made by students who’ve been through registration too.</p>
    <div class="final-actions">
      <a class="primary" href={resolve('/planner')}>Open Course Planner →</a><a
        class="secondary"
        href={resolve('/generate')}>Generate a schedule</a
      >
    </div>
  </section>

  <footer>
    <div class="footer-inner content-width">
      <p>Jupiterp is not officially affiliated with the University of Maryland.</p>
      <nav aria-label="Footer">
        {#each footerLinks as [href, label] (href)}<a href={resolve(href as Pathname)}>{label}</a>{/each}<a
          href="https://github.com/Jupiterp-UMD/Jupiterp"
          target="_blank"
          rel="noopener noreferrer">GitHub</a
        >
      </nav>
    </div>
  </footer>
</main>

<style>
  .landing {
    --landing-bg: #f3ece5;
    --landing-card: #fff;
    --landing-ink: #181919;
    --landing-muted: #535e73;
    --landing-line: #eae3dd;
    --landing-track: #f0efed;
    --landing-soft: #fbf8f5;
    --landing-peach: #fff0e7;
    --landing-hint: #fff8e5;
    position: fixed;
    inset: 3rem 0 0;
    overflow-y: auto;
    overflow-x: hidden;
    scroll-behavior: auto;
    background: var(--landing-bg);
    color: var(--landing-ink);
  }
  :global(.dark) .landing {
    --landing-bg: #151922;
    --landing-card: #202733;
    --landing-ink: #edf0f4;
    --landing-muted: #b4bdcc;
    --landing-line: #384354;
    --landing-track: #2a3342;
    --landing-soft: #1b222d;
    --landing-peach: #3a2b25;
    --landing-hint: #343022;
  }
  :global(.dark) .welcome-window {
    box-shadow: 0 24px 64px #00000040;
    border: 1px solid var(--landing-line);
  }
  :global(.dark) .tool-tabs button.active {
    background: #ff8c5426;
  }
  :global(.dark) .tool-tabs button:hover {
    background: #ff8c5417;
  }
  :global(.dark) .planet {
    opacity: 0.35;
  }
  :global(.dark) .policy-link {
    color: #ffab83;
  }
  .content-width {
    width: min(1080px, calc(100% - 80px));
    margin-inline: auto;
  }
  .hero {
    position: relative;
    overflow: clip;
    min-height: calc(100svh - 3rem);
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 64px 40px;
    width: 100%;
  }
  .explore-more {
    position: absolute;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    color: var(--landing-muted);
    cursor: pointer;
    transition:
      color 150ms,
      background 150ms;
  }
  .explore-more:hover {
    color: var(--orange);
    background: var(--landing-card);
  }
  .planet {
    position: absolute;
    --planet-size: clamp(500px, 42vw, 850px);
    width: var(--planet-size);
    height: var(--planet-size);
    right: calc(var(--planet-size) * -0.35);
    top: -90px;
    pointer-events: none;
  }
  .planet svg {
    width: 100%;
    height: 100%;
  }
  .welcome-window {
    position: relative;
    margin: 0 auto;
    width: min(100%, clamp(1080px, 82vw, 1600px));
    height: min(820px, 76svh, calc(100svh - 176px));
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border-radius: 22px;
    background: var(--landing-card);
    box-shadow: 0 25px 60px #65462e26;
  }
  .window-bar {
    background: var(--landing-soft);
    height: 42px;
    flex-shrink: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
    font-size: clamp(12px, 0.8vw, 14px);
  }
  .traffic {
    display: flex;
    gap: 7px;
    position: absolute;
    left: 20px;
  }
  .traffic i {
    width: 11px;
    height: 11px;
    border-radius: 50%;
    background: #efb099;
  }
  .traffic i:nth-child(2) {
    background: #edc4ae;
  }
  .traffic i:nth-child(3) {
    background: #d4cbc3;
  }
  .welcome-body {
    display: grid;
    grid-template-columns: clamp(220px, 17vw, 300px) minmax(0, 1fr);
    flex: 1;
    min-height: 0;
  }
  .tool-tabs {
    background: var(--landing-soft);
    padding: 28px 15px;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .tool-tabs button {
    display: flex;
    align-items: center;
    gap: 7px;
    width: 100%;
    font-size: clamp(13px, 0.9vw, 16px);
    font-weight: 600;
    padding: 6px 7px;
    border-radius: 10px;
    text-align: left;
    margin: 3px 0;
    cursor: pointer;
  }
  .tool-tabs button.active {
    background: color-mix(in srgb, #ffb48f 34%, var(--landing-card));
  }
  .tool-tabs button:hover {
    background: color-mix(in srgb, #ffb48f 20%, var(--landing-card));
  }
  .welcome-content {
    display: grid;
    grid-template-columns: 1.1fr 0.9fr;
    grid-template-rows: minmax(0, 1fr);
    min-height: 0;
    min-width: 0;
    align-items: stretch;
    gap: clamp(20px, 2vw, 40px);
    padding: clamp(32px, 3vw, 56px);
  }
  h1 {
    font-size: clamp(38px, 3.1vw, 62px);
    line-height: 1.06;
    letter-spacing: -1.5px;
    font-weight: 700;
    margin-bottom: 18px;
    max-width: 100%;
  }
  .intro {
    font-size: clamp(16px, 1.1vw, 20px);
    line-height: 1.55;
    color: var(--landing-muted);
  }
  .welcome-copy ul {
    margin: 18px 0 25px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: clamp(12px, 0.85vw, 16px);
  }
  .welcome-copy li {
    display: flex;
    gap: 9px;
    align-items: center;
  }
  .welcome-copy li > span {
    color: #f5692e;
    font-size: 15px;
  }
  .review-promise {
    margin: 0 0 22px;
    padding: 14px 0 0;
    border-top: 1px solid var(--landing-line);
    font-size: 12px;
    line-height: 1.55;
  }
  .review-promise strong {
    display: block;
    margin-bottom: 4px;
  }
  .review-promise p {
    color: var(--landing-muted);
  }
  .hero-actions {
    display: flex;
    gap: 18px;
    align-items: center;
    flex-wrap: wrap;
  }
  .primary {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    white-space: nowrap;
    background: #ff682b;
    color: #171717;
    font-size: 13px;
    font-weight: 700;
    border-radius: 9px;
    padding: 13px 20px;
    transition:
      background 150ms,
      transform 150ms;
  }
  .primary:hover {
    background: #f15a20;
    transform: translateY(-1px);
  }
  .hero-actions .primary,
  .final-actions .primary {
    box-shadow: 0 7px 15px #f5692e25;
  }

  .next-tool {
    display: block;
    font-size: clamp(11px, 0.8vw, 14px);
    font-weight: 600;
    margin-top: 29px;
    text-align: left;
    cursor: pointer;
  }
  .next-tool:hover {
    color: #e15a23;
  }
  .welcome-preview,
  .welcome-copy {
    min-width: 0;
    min-height: 0;
    height: 100%;
  }
  .welcome-preview :global(.hero-week) {
    height: clamp(245px, 30svh, 360px);
  }
  .hero .primary {
    font-size: clamp(13px, 0.9vw, 16px);
    padding: clamp(12px, 1vw, 18px) clamp(18px, 1.4vw, 26px);
  }
  h2 {
    font-size: 36px;
    line-height: 1.13;
    letter-spacing: -1px;
    font-weight: 700;
  }
  .tool-section {
    display: grid;
    grid-template-columns: 0.9fr 1.1fr;
    gap: 68px;
    align-items: center;
    padding: 65px 0;
    scroll-margin-top: 30px;
  }
  .tool-section.reverse {
    grid-template-columns: 1.1fr 0.9fr;
  }
  .reverse .tool-copy {
    order: 2;
  }
  .reverse .tool-visual {
    order: 1;
  }
  .tool-visual {
    min-width: 0;
  }
  .section-icon {
    margin-bottom: 18px;
  }
  .tool-tour {
    scroll-margin-top: 20px;
  }
  .tool-copy h2 {
    margin-bottom: 18px;
  }
  .description {
    color: var(--landing-muted);
    font-size: 16px;
    line-height: 1.65;
  }
  .section-actions {
    margin-top: 24px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 18px;
  }
  .policy-link {
    color: #c54c15;
    font-size: 13px;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .final-cta {
    padding: 64px 28px;
    margin: 65px auto;
    border: 1px solid var(--landing-line);
    border-radius: 24px;
    background: var(--landing-soft);
    text-align: center;
  }
  .cta-logo {
    width: 180px;
    height: auto;
    margin: 0 auto 28px;
  }
  .final-cta h2 {
    font-size: 40px;
    line-height: 1.15;
  }
  .final-cta p {
    color: var(--landing-muted);
    max-width: 520px;
    margin: 20px auto 28px;
    font-size: 16px;
    line-height: 1.6;
  }
  .final-actions {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 14px;
  }
  .final-actions a {
    font-size: 14px;
    padding: 16px 25px;
  }
  .secondary {
    background: var(--landing-card);
    border: 1px solid var(--landing-line);
    border-radius: 9px;
    font-weight: 700;
  }
  .secondary:hover {
    border-color: #f5692e;
  }
  footer {
    border-top: 1px solid var(--landing-line);
    font-size: 12px;
    padding: 28px 0;
    line-height: 1.6;
    color: var(--landing-muted);
  }
  .footer-inner {
    display: flex;
    justify-content: space-between;
    gap: 25px;
    align-items: center;
  }
  footer nav {
    display: flex;
    flex-wrap: wrap;
    gap: 17px;
    color: var(--landing-ink);
  }
  footer a:hover {
    color: #f5692e;
  }
  button:focus-visible,
  a:focus-visible {
    outline: 2px solid #f5692e;
    outline-offset: 4px;
  }
  @media (max-width: 1100px) {
    .welcome-body {
      grid-template-columns: 195px 1fr;
    }
    .welcome-content {
      padding: 30px;
      gap: 18px;
    }
    h1 {
      font-size: 37px;
    }
    .hero-actions {
      gap: 12px;
    }
    .primary {
      padding: 12px 15px;
    }
    .tool-section {
      gap: 40px;
    }
  }
  @media (max-width: 800px) {
    .content-width {
      width: calc(100% - 40px);
    }
    .hero {
      padding: 48px 20px 64px;
    }
    .welcome-body {
      grid-template-columns: 1fr;
      grid-template-rows: auto minmax(0, 1fr);
    }
    .tool-tabs {
      display: flex;
      flex-direction: row;
      justify-content: flex-start;
      flex-wrap: wrap;
      gap: 5px;
      padding: 12px;
    }
    .tool-tabs button {
      width: auto;
      font-size: 11px;
      padding: 3px 5px;
    }
    .welcome-content {
      padding: 28px;
    }
    .welcome-preview {
      max-width: 250px;
    }
    h2 {
      font-size: 30px;
    }
    .tool-section,
    .tool-section.reverse {
      gap: 30px;
      padding: 45px 0;
    }
    .description {
      font-size: 14px;
    }
    .footer-inner {
      flex-direction: column;
      align-items: flex-start;
    }
  }
  @media (max-width: 600px) {
    .welcome-content {
      grid-template-columns: 1fr;
    }
    .welcome-preview {
      display: none;
    }
    .window-bar {
      font-size: 9px;
      padding-left: 40px;
    }
    .traffic {
      left: 12px;
      gap: 4px;
    }
    .traffic i {
      width: 7px;
      height: 7px;
    }
    h1 {
      max-width: 100%;
      font-size: 39px;
    }
    .welcome-body {
      min-height: 0;
    }
    .welcome-content {
      padding: 25px;
    }
    .welcome-copy ul {
      font-size: 12px;
    }
    .tool-section,
    .tool-section.reverse {
      grid-template-columns: 1fr;
      gap: 28px;
      padding: 35px 0;
    }
    .reverse .tool-copy,
    .reverse .tool-visual {
      order: unset;
    }
    .description {
      font-size: 16px;
    }
    .final-cta {
      padding: 40px 20px;
      margin-block: 40px;
    }
    .final-cta h2 {
      font-size: 35px;
    }
    .planet {
      width: 450px;
      height: 450px;
      right: -260px;
      top: 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .landing {
      scroll-behavior: auto;
    }
    .primary {
      transition: none;
    }
  }
</style>
