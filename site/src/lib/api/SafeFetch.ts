/**
 * This file is part of Jupiterp. For terms of use, please see the file
 * called LICENSE at the top level of the Jupiterp source tree (online at
 * https://github.com/atcupps/Jupiterp/LICENSE).
 *
 *
 * @fileoverview A fetch for the review pages that always settles.
 *
 * `fetch` does not resolve to an error response when the request never gets
 * one -- it rejects. A CORS refusal, a dropped connection, DNS, an ad blocker:
 * all of them throw a bare `TypeError` with no response attached. The review
 * pages awaited `fetch` with no `catch`, so any of those left the page on
 * "Sending…" or "Confirming…" indefinitely, with nothing in the UI and nothing
 * on the server, because the server never saw the request.
 *
 * That is exactly how the apex domain presented: jupiterp.com serves the site,
 * the API's origin allowlist did not include it, and every submission from
 * there hung. This turns those into an ordinary failure the page can show.
 */

/** How long a review write may take before the page gives up and says so. */
export const WRITE_TIMEOUT_MS = 30_000;

/** Shown when the request produced no response at all. */
export const UNREACHABLE_MESSAGE =
  "Couldn't reach Jupiterp. Check your connection and try again — if it keeps happening, try www.jupiterp.com.";

type Fetch = typeof globalThis.fetch;

/**
 * Issue a request, resolving to `null` instead of rejecting when no response
 * arrives -- whether the request failed outright or took longer than
 * `timeoutMs`.
 */
export async function sendSafely(
  fetchFn: Fetch,
  url: string,
  init: RequestInit = {},
  timeoutMs: number = WRITE_TIMEOUT_MS
): Promise<Response | null> {
  // A controller and a timer rather than `AbortSignal.timeout()`, which iOS
  // Safari only gained in 16. Where it is missing the call throws, and inside
  // this `try` that would turn every request into "couldn't reach Jupiterp".
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchFn(url, { ...init, signal: controller.signal });
  } catch (error) {
    console.error(`Request to ${url} failed without a response:`, error);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
