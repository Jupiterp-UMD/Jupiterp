/**
 * This file is part of Jupiterp. For terms of use, please see the file
 * called LICENSE at the top level of the Jupiterp source tree (online at
 * https://github.com/atcupps/Jupiterp/LICENSE).
 * Copyright (C) 2026 Andrew Cupps
 *
 * @fileoverview Sentry hooks for error tracking in the SvelteKit application.
 */
import { sequence } from '@sveltejs/kit/hooks';
import { handleErrorWithSentry, sentryHandle } from '@sentry/sveltekit';
import * as Sentry from '@sentry/sveltekit';
import type { Handle } from '@sveltejs/kit';

// format-check exempt 2
Sentry.init({
  dsn: 'https://24e8b736fa56aa42958e5ea40774e21a@o4507562502782976.ingest.us.sentry.io/4507562512023552',
  tracesSampleRate: 1.0,
});

/**
 * Let `content-range` survive server-side rendering.
 *
 * During SSR, SvelteKit replaces `fetch` with a wrapper that serialises the
 * response so the browser can reuse it without a second request. That wrapper
 * exposes only a small allowlist of headers, and reading anything else throws
 * rather than returning null:
 *
 *   Failed to get response header "content-range" — it must be included by
 *   the `filterSerializedResponseHeaders` option
 *
 * PostgREST returns row counts in `Content-Range`, and the API client reads it
 * to build paginated responses. Without this, every route whose `load` runs on
 * the server and asks for a count throws a 500 — the professor pages, which
 * are the whole point of the reviews work.
 *
 * Only this one header is allowed through; the default deny for everything
 * else is the behaviour worth keeping.
 */
const allowContentRange: Handle = async ({ event, resolve }) =>
  resolve(event, {
    filterSerializedResponseHeaders: (name) => name === 'content-range',
  });

export const handle = sequence(sentryHandle(), allowContentRange);

export const handleError = handleErrorWithSentry();
