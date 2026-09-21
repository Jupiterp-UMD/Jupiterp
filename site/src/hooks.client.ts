/**
 * This file is part of Jupiterp. For terms of use, please see the file
 * called LICENSE at the top level of the Jupiterp source tree (online at
 * https://github.com/atcupps/Jupiterp/LICENSE).
 *
 *
 * @fileoverview Sentry hooks for error tracking in the SvelteKit application.
 */
import { handleErrorWithSentry } from '@sentry/sveltekit';
import * as Sentry from '@sentry/sveltekit';

// format-check exempt 2
Sentry.init({
  dsn: 'https://24e8b736fa56aa42958e5ea40774e21a@o4507562502782976.ingest.us.sentry.io/4507562512023552',
  tracesSampleRate: 1.0,
});

// If you have a custom error handler, pass it to `handleErrorWithSentry`
export const handleError = handleErrorWithSentry();
