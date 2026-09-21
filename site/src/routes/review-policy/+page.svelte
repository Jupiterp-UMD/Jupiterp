<!--
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).
Copyright (C) 2026 Andrew Cupps

The content policy for reviews.

This page has two audiences. It tells reviewers what will and will not be
published, and it is the ruleset the automated triage classifies against --
`PolicyVersion` in the API is a date stamp on this text. Changing what this
page says changes what gets published, so bump that constant alongside it or
old decisions become unreproducible.
-->
<script lang="ts">
  import { resolve } from '$app/paths';
  const h1Classes = 'text-2xl border-b-2 border-border';
  const h2Classes = 'text-xl border-b-2 border-border border-t-0 mt-6';
  const pClasses = 'my-2 text-normal leading-5';
  const listClasses = 'my-2 list-disc pl-6 leading-6';

  /** Keep in step with PolicyVersion in the API. */
  const POLICY_VERSION = '2026-08-14';
</script>

<svelte:head>
  <title>Review Policy | Jupiterp</title>
  <meta
    name="description"
    content="What Jupiterp will and will not publish in student reviews of professors, and how reviews are moderated."
  />
</svelte:head>

<main class="fixed bottom-0 top-12 overflow-y-scroll px-8 py-2 lg:top-14 xl:top-16">
  <article class="max-w-3xl">
    <h1 class={h1Classes}>Review Policy</h1>

    <p class="text-text-secondary my-2 text-sm">Version {POLICY_VERSION}</p>

    <p class={pClasses}>
      Jupiterp publishes student reviews of named people. That is worth doing carefully. Everything below applies to
      every review, and every review is read before it appears.
    </p>

    <h2 class={h2Classes}>Who can write a review</h2>
    <p class={pClasses}>
      Anyone with a working <b>@terpmail.umd.edu</b> or <b>@umd.edu</b> address. That includes faculty and staff, and it includes
      alumni for as long as their address still works — we do not have a separate mechanism for that, and there is no point
      pretending otherwise.
    </p>
    <p class={pClasses}>
      Write about a course you actually took, with that instructor. A review is a first-hand account, not something you
      heard.
    </p>

    <h2 class={h2Classes}>What we will not publish</h2>
    <ul class={listClasses}>
      <li>
        <b>Personal attacks.</b> Criticise the teaching, the workload, the grading, the organisation of the course. Do not
        attack the person.
      </li>
      <li>
        <b>Allegations of criminal or professional misconduct.</b> Not because such things never happen, but because a course
        review site cannot investigate them and publishing an unverified accusation can do real harm to someone who has no
        way to respond. If something serious happened, the university's Office of Civil Rights and Sexual Misconduct and the
        Office of Student Conduct exist for it, and they can act where we cannot.
      </li>
      <li>
        <b>Comments about protected characteristics</b> — race, religion, sex, gender identity, sexual orientation, disability,
        national origin, age — including remarks about someone's accent or how they speak.
      </li>
      <li>
        <b>Contact details.</b> No email addresses, phone numbers, office numbers, home addresses, or social media handles,
        whether they are yours or someone else's. Reviews containing these are rejected automatically.
      </li>
      <li><b>Links.</b> For the same reason, and because they are what spam looks like.</li>
      <li><b>Impersonation.</b> Do not write as though you are someone else.</li>
      <li>
        <b>Other students, TAs, or classmates by name.</b> They did not sign up to be reviewed.
      </li>
      <li><b>Content that is not a review</b> — advertising, jokes about unrelated people, test submissions.</li>
    </ul>

    <h2 class={h2Classes}>What we are happy to publish</h2>
    <p class={pClasses}>
      Blunt, negative, specific reviews. "The lectures were disorganised and the exams didn't match the homework" is
      exactly the kind of thing this site exists for. A low rating is not a policy violation, and we do not remove
      reviews because a professor dislikes them.
    </p>

    <h2 class={h2Classes}>How reviews are moderated</h2>
    <p class={pClasses}>Every review is checked before it appears. Nothing is published automatically on submission.</p>
    <p class={pClasses}>
      Some checks are mechanical: reviews containing links or contact details are rejected without a person seeing them.
      Beyond that, reviews may be classified by an automated system to sort out the ones needing closer attention — see
      the <a href={resolve('/privacy-policy')} class="text-orange underline">privacy policy</a> for what that involves. Anything
      that looks like an allegation about a specific person is always read by a human, whatever the automated system concludes.
    </p>

    <h2 class={h2Classes}>If your review is rejected</h2>
    <p class={pClasses}>
      You will be told why, and you can reply to that email to have a person look again. You can also write a new
      review, which goes through moderation like any other.
    </p>

    <!--
      Renamed from "Editing and removing your own review". There is no editing:
      no route, no UI, removed deliberately. Naming it here, and in the emails,
      described a feature nobody could find because it does not exist.
    -->
    <h2 class={h2Classes}>Withdrawing your own review</h2>
    <p class={pClasses}>
      When you confirm your review we give you a management key, once. Keep it: it is the only way to withdraw the
      review later, and we cannot recover it for you — by design, there is nothing linking it back to you. Withdrawing
      deletes the text rather than hiding it, and cannot be undone; you are free to write a new review afterwards.
    </p>
    <p class={pClasses}>
      To withdraw a review, paste your key at
      <a href={resolve('/review/withdraw')} class="text-orange underline">jupiterp.com/review/withdraw</a>. You will be
      shown the review before anything is removed.
    </p>

    <h2 class={h2Classes}>If you are the professor</h2>
    <p class={pClasses}>
      You can report any review through the link on it. Tell us which part breaches the policy above and we will look at
      it. We aim to respond within <b>five working days during term</b>.
    </p>
    <p class={pClasses}>
      We will not remove a review for being unflattering, and we do not currently offer a right of reply — verifying
      that someone is who they say they are is a harder problem than it sounds, and replies would themselves need
      moderating. Reporting is the whole of the process for now, which is why the response time above matters.
    </p>

    <h2 class={h2Classes}>Your email address</h2>
    <p class={pClasses}>
      We ask for it to check you are at UMD and to stop the same person reviewing the same course repeatedly. It is
      stored only as an irreversible hash — we cannot read it back, we never display it, and the professor never sees
      it. Reviews are not anonymous to us in the sense that we could not tell two of them apart; they are anonymous in
      that we cannot tell you who wrote one.
    </p>
  </article>
</main>
