<!-- 
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).

 -->
<script lang="ts">
  import { resolve } from '$app/paths';
  let resolvedChangelogLink = $derived(resolve('/changelog'));
</script>

<svelte:head>
  <title>About | Jupiterp</title>
</svelte:head>
<main>
  <article class="custom-scrollbar fixed bottom-0 top-12 overflow-y-auto px-4 py-2">
    <h1>About Jupiterp</h1>
    <p>
      Jupiterp is a website built to help students at the University of Maryland plan their schedules and make informed
      decisions about their course and section selections. Jupiterp provides a course planner that allows students to
      search for courses, see sections complete with grade distributions and instructor ratings, and visualize their
      course schedule. Unlike other course planners, Jupiterp is built specifically by and for students at UMD, because
      we know that students here know best what they need; that's why Jupiterp is also completely open-source, so that
      students can contribute to the project and make it better for both themselves and everyone else.
    </p>
    <p>
      Jupiterp is currently in beta phase - there may be issues. We are working to set up a system to report bugs; in
      the meantime, if you find something wrong on our site, please report it as an issue <a
        href="https://github.com/atcupps/Jupiterp/issues"
        target="_blank"
        rel="external noopener noreferrer"
        class="text-orange underline">here</a
      >.
    </p>
    <p>
      <a href={resolvedChangelogLink} aria-label="View changelog" rel="canonical" class="text-orange underline"
        >View changelog</a
      >
    </p>
    <h2>Grade Data</h2>
    <p>
      Grade distributions come from the University of Maryland's Office of the Registrar, obtained by public records
      request. They cover <b>Fall and Spring terms only</b>, from 2010 onward — Winter and Summer terms are not
      included, so a course taught only in the summer will show no grade data at all.
    </p>
    <p>
      Average GPAs are calculated over students who received a letter grade, which excludes withdrawals, matching how a
      transcript GPA is computed. Withdrawals are shown separately in the distribution bars, where a high withdrawal
      rate is informative in its own right rather than blended into an average. The percentages under each bar are over
      all students including withdrawals, so they add to 100%.
    </p>
    <p>
      The registrar's records leave the instructor blank for roughly a quarter of sections. Where a section clearly
      belongs to a named lecture, that instructor is carried across; where it does not, the section is left
      unattributed. A professor's totals may therefore not cover everything they taught.
    </p>
    <h2>Professor Ratings</h2>
    <p>
      Ratings shown next to a professor's name currently come from <a
        href="https://planetterp.com"
        target="_blank"
        rel="external noopener noreferrer"
        class="text-orange underline">PlanetTerp</a
      >, captured once as a historical baseline. PlanetTerp is no longer being actively updated, so these ratings are
      frozen and will gradually carry less weight as Jupiterp collects its own.
    </p>
    <p>
      Ratings are based on anonymous student reviews and vary in accuracy and reliability. They are subjective and may
      not represent a professor's ability to teach or the average student experience in their class.
    </p>
    <h2>Open-Source</h2>
    <p>
      Jupiterp is open-source and accepting contributions. Please visit our <a
        href="https://github.com/atcupps/Jupiterp"
        target="_blank"
        aria-label="Visit our GitHub"
        class="text-orange underline">GitHub</a
      > to make contributions.
    </p>
    <h2>Credits</h2>
    <p>
      Course and section information is taken directly from the Testudo Schedule of Classes, which is also where
      instructor records originate. Grade distributions are from the University of Maryland's Office of the Registrar
      via a public records request. Baseline professor ratings were imported once from the PlanetTerp API.
    </p>
    <h3>Core Team</h3>
    <p>
      Jupiterp is open-source, so anyone can contribute! It is primarily maintained by <a
        href="https://atcupps.github.io/"
        target="_blank"
        aria-label="Visit Andrew Cupps's website"
        rel="external noopener noreferrer"
        class="text-orange underline"
      >
        Andrew Cupps</a
      >. Jupiterp is run at personal cost, and doesn't make any money from ads, selling data, etc., so if you want to
      support continued work on Jupiterp, please consider
      <a
        href="https://buymeacoffee.com/jupiterp"
        target="_blank"
        rel="external noopener noreferrer"
        class="text-orange underline"
      >
        donating</a
      > a small amount!
    </p>
    <h2>Contact</h2>
    <p>
      To contact the Jupiterp team, email <code class="bg-bg-secondary rounded-md text-sm"> admin@jupiterp.com</code>.
    </p>
  </article>
</main>
