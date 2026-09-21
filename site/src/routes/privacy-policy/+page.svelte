<!-- 
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).
Copyright (C) 2024 Andrew Cupps
 -->
<script>
  import { resolve } from '$app/paths';
  let resolvedReviewPolicyLink = $derived(resolve('/review-policy'));
</script>

<svelte:head>
  <title>Privacy Policy | Jupiterp</title>
</svelte:head>

<main class="prose">
  <article>
    <h1>Privacy Policy for Jupiterp</h1>
    <p class="subtitle">Last Updated: August 14th, 2026</p>
    <h2>Introduction</h2>
    <p>
      Welcome to Jupiterp. We are committed to protecting your personal information and your right to privacy. This
      Privacy Policy governs your use of the Jupiterp website and explains how your data is collected, used, and
      protected when you use our authentication services, including Google Sign-In.
    </p>

    <h2>What Data We Collect</h2>
    <p>
      When you sign in using Google OAuth, we request access to the minimum requisite information necessary to implement
      our services. Specifically, we collect your email address, your basic profile information (such as your name), and
      any course schedules that you create while using our application.
    </p>

    <h2>Why We Request Your Data</h2>
    <p>
      We use your email address as a unique identifier to securely manage and maintain your account. The primary purpose
      of collecting this information is so we can save your created course schedules to your specific account, allowing
      you to reliably access and utilize your personalized schedules across multiple sessions or devices.
    </p>

    <h2>How Your Data is Used and Shared</h2>
    <p>
      Your data is strictly used for the core functionalities of Jupiterp—to authenticate your identity and store your
      schedules securely. We do not sell, rent, or distribute your email, profile information, or any user data to any
      third-party data brokers, advertising platforms, or information resellers. Furthermore, your data will not be
      accessed, aggregated, or analyzed for external sale or distribution to any party conducting surveillance.
    </p>
    <p>
      Jupiterp's use and transfer to any other app of information received from Google APIs will adhere to the <a
        href="https://developers.google.com/terms/api-services-user-data-policy"
        rel="external noopener noreferrer"
        target="_blank"
        class="text-orange font-semibold hover:underline">Google API Services User Data Policy</a
      >, including the Limited Use requirements.
    </p>
    <h2>Professor Reviews</h2>
    <p>
      This section covers what happens when you submit a review of a professor. It applies only if you choose to write
      one; browsing Jupiterp requires none of it.
    </p>

    <h3>What we collect</h3>
    <ul>
      <li>
        <b>Your email address</b>, which we never store. On submission it is converted to an irreversible hash using a
        secret value held outside the database. We keep the hash and the domain (<code>terpmail.umd.edu</code> or
        <code>umd.edu</code>) and discard the address itself. We cannot recover it, we never display it, and the
        professor never sees it. The hash exists to check you are at UMD and to stop the same person reviewing the same
        course repeatedly.
      </li>
      <li>
        <b>The review itself</b> — your rating, and whatever you write. This is published if it is approved.
      </li>
      <li>
        <b>Your IP address and browser user-agent</b>, also stored only as hashes, and only to investigate abuse. These
        are deleted after 90 days, and immediately if you withdraw the review.
      </li>
    </ul>
    <p>
      Your email address is held in plain text in one place and for one purpose: the queue that sends your confirmation
      message. It is erased from that queue as soon as the message is sent.
    </p>

    <h3>Automated classification</h3>
    <p>
      Reviews may be sent to <b>Google's Gemini API</b> to be classified against our
      <a href={resolvedReviewPolicyLink} class="text-orange underline">review policy</a>, so that the ones needing a
      closer look are identified. What is sent is the review text, the rating, and the course and instructor it
      concerns.
      <b>No identifying information is sent</b> — not your email address, not its hash, not your IP address.
    </p>
    <p>
      We use Gemini's free tier. <b
        >Google's terms for the free tier permit them to use content submitted through it to improve their products,
        including for human review.</b
      >
      That is a meaningfully different arrangement from a paid tier, and you should know about it before you write anything:
      text you submit as a review may be read by people at Google and may be used to train their models. It is not linked
      to you, because we do not send anything that identifies you.
    </p>
    <p>If you would rather this did not happen to something you have written, do not submit it as a review.</p>
    <p>
      A classifier never makes the final call on its own where it matters. Reviews touching on allegations about a
      specific person are always read by a person.
    </p>

    <h3>Deleting a review</h3>
    <p>
      Use the management key you were given when you confirmed the review. Withdrawing it erases the text and the abuse
      hashes. A record that a review existed is kept so that the one-review-per-course rule continues to work; it
      contains no content and nothing that identifies you beyond the same irreversible hash.
    </p>
    <p>
      Content already sent to Google for classification is outside our control once sent, which is another reason the
      paragraph above is worth reading before you write.
    </p>

    <h3>Other services involved</h3>
    <ul>
      <li><b>Brevo</b> sends the confirmation email, and receives your address to do so.</li>
      <li>
        <b>Cloudflare Turnstile</b> checks that submissions come from a person. It sets no cookie and collects no personal
        data.
      </li>
      <li><b>Supabase</b> hosts the database, in the United States.</li>
    </ul>

    <h2>Data Security</h2>
    <p>
      We take reasonable and appropriate steps to protect all applications and systems that make use of Google API
      Services to ensure that user data is secure in transit and at rest against unauthorized or unlawful access, use,
      destruction, loss, alteration, or disclosure.
    </p>
    <h2>Changes to This Policy</h2>
    <p>
      Jupiterp reserves the right to modify this Privacy Policy at any time. If we change the way your application uses
      Google user data, we will notify users and prompt them to consent to an updated privacy policy before making use
      of that data in a new way.
    </p>
    <h2>Contact Us</h2>
    <p>
      For any questions or concerns regarding these policies, please contact us at <code
        class="bg-bg-secondary ml-1 rounded-md p-1 text-sm"
      >
        admin@jupiterp.com</code
      >.
    </p>
  </article>
</main>
