<!-- 
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).

 -->
<script lang="ts">
  import { resolve } from '$app/paths';
  const h1Classes = 'text-2xl border-b-2 border-border';
  const h2Classes = 'text-xl border-b-2 border-border';
  const pClasses = 'my-2 text-normal leading-5';
</script>

<svelte:head>
  <title>Terms of Use | Jupiterp</title>
</svelte:head>

<main class="custom-scrollbar fixed bottom-0 top-12 overflow-y-auto px-4 py-2">
  <article>
    <h1 class={h1Classes}>Terms of Use for Jupiterp</h1>
    Last Updated: August 14, 2026
    <h2 class={h2Classes}>Introduction</h2>
    <p class={pClasses}>
      Welcome to Jupiterp. These Terms of Use ("Terms") govern your use of the Jupiterp website, a course planner for
      students at the University of Maryland. Jupiterp is not affiliated with the University of Maryland. By accessing
      or using our website, you agree to be bound by these Terms.
    </p>

    <h2 class={h2Classes}>Use of Jupiterp</h2>

    <p class={pClasses}>
      Jupiterp provides a platform for planning university courses by aggregating data from the University of Maryland's
      website and professor ratings and reviews from PlanetTerp's public API. Jupiterp aims to assist in course planning
      but does not guarantee the accuracy or completeness of the information provided.
    </p>

    <h2 class={h2Classes}>Intellectual Property</h2>

    <p class={pClasses}>
      All content displayed on Jupiterp, including but not limited to text, graphics, logos, and the compilation
      thereof, is owned by Andrew Tae Cupps or used with permission. The course data and professor ratings are sourced
      from public APIs and are subject to the terms and conditions of those respective platforms.
    </p>

    <h2 class={h2Classes}>Disclaimer of Liability</h2>

    <p class={pClasses}>
      Jupiterp does not guarantee the accuracy, timeliness, or completeness of any information on this site. The
      information is provided "as is" without warranty of any kind. Jupiterp shall not be liable for any inaccuracies or
      discrepancies in course or professor information.
    </p>

    <h2 class={h2Classes}>Reviews You Submit</h2>
    <p class={pClasses}>
      Jupiterp lets students publish reviews of named instructors. If you submit one, this section applies to you. The
      rules about what may be published are in the
      <a href={resolve('/review-policy')} class="text-orange underline">review policy</a>, and what happens to your data
      is in the
      <a href={resolve('/privacy-policy')} class="text-orange underline">privacy policy</a>.
    </p>
    <p class={pClasses}>
      <b>You keep ownership of what you write.</b> By submitting a review you grant Jupiterp a non-exclusive, worldwide, royalty-free
      licence to store, publish, and display it on the site, and to remove it. That licence ends for display purposes when
      you withdraw the review.
    </p>
    <p class={pClasses}>
      <b>You are responsible for what you write.</b> Submit only first-hand accounts of courses you actually took, and only
      statements you believe to be true. Do not submit anything defamatory, harassing, or unlawful.
    </p>
    <p class={pClasses}>
      <b>Every review is moderated before it appears</b>, and we may refuse or remove any review at our discretion,
      including after publication. We aim to apply the review policy consistently and to explain refusals, but nothing
      here entitles you to have a particular review published.
    </p>
    <p class={pClasses}>
      Reviews are the opinions of individual students. They are not statements by Jupiterp, they are not verified for
      accuracy beyond the moderation described in the review policy, and they should not be read as fact about any
      person. Instructors who believe a review breaches the policy can report it through the site.
    </p>
    <p class={pClasses}>
      Do not attempt to manipulate ratings — submitting reviews for courses you did not take, using multiple addresses,
      or coordinating with others to raise or lower a professor's rating. We may remove reviews and block addresses for
      this.
    </p>

    <h2 class={h2Classes}>Grade Data</h2>
    <p class={pClasses}>
      Grade distributions shown on Jupiterp come from the University of Maryland's Office of the Registrar, obtained
      through a public records request. They cover Fall and Spring terms only, and about a quarter of sections carry no
      instructor attribution in the source records. Figures are provided as-is and should not be treated as an official
      university record.
    </p>

    <h2 class={h2Classes}>Changes to Terms of Use</h2>

    <p class={pClasses}>
      Jupiterp reserves the right to modify these Terms at any time without direct notification to users. By continuing
      to access or use our website after those revisions become effective, you agree to be bound by the revised terms.
    </p>

    <h2 class={h2Classes}>Governing Law</h2>

    <p class={pClasses}>
      These Terms shall be governed and construed in accordance with the laws of Maryland, United States, without regard
      to its conflict of law provisions.
    </p>

    <h2 class={h2Classes}>Contact Us</h2>

    <p class={pClasses}>
      For any questions or concerns regarding these Terms, please contact us at
      <code class="bg-bg-secondary rounded-md text-sm"> admin@jupiterp.com</code>.
    </p>

    <p class={pClasses}>
      By using Jupiterp, you acknowledge that you have read, understood, and agree to be bound by these Terms.
    </p>
  </article>
</main>
