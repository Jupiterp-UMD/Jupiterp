/**
 * This file is part of Jupiterp. For terms of use, please see the file
 * called LICENSE at the top level of the Jupiterp source tree (online at
 * https://github.com/atcupps/Jupiterp/LICENSE).
 *
 *
 * @fileoverview The review pages must settle when a request gets no response.
 *
 * A rejected fetch -- a CORS refusal from a host missing from the API's
 * allowlist, in the case that prompted this -- left the review form on
 * "Sending…" forever.
 */

import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import { sendSafely } from './SafeFetch';

describe('sendSafely', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('resolves to null when the request is refused outright', async () => {
    // What the browser throws for a CORS refusal: a TypeError, no response.
    const refused = (() => Promise.reject(new TypeError('Failed to fetch'))) as typeof fetch;
    await expect(sendSafely(refused, 'https://api.example/v1/reviews')).resolves.toBeNull();
  });

  test('resolves to null when no response arrives in time', async () => {
    // Never answers, but honours the abort signal the way fetch does.
    const hangs = ((_url: string, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
      })) as typeof fetch;
    await expect(sendSafely(hangs, 'https://api.example/v1/reviews', {}, 20)).resolves.toBeNull();
  });

  // jsdom has no `Response`; the helper only passes it through, so a stub does.
  const reply = (status: number) => ({ status, ok: status >= 200 && status < 300 }) as Response;

  test('passes an error response through untouched', async () => {
    const tooMany = (() => Promise.resolve(reply(429))) as typeof fetch;
    const response = await sendSafely(tooMany, 'https://api.example/v1/reviews');
    expect(response?.status).toBe(429);
  });

  test('keeps the caller’s request options', async () => {
    let seen: RequestInit | undefined;
    const capture = ((_url: string, init?: RequestInit) => {
      seen = init;
      return Promise.resolve(reply(202));
    }) as typeof fetch;
    await sendSafely(capture, 'https://api.example/v1/reviews', { method: 'POST', body: '{}' });
    expect(seen?.method).toBe('POST');
    expect(seen?.body).toBe('{}');
    expect(seen?.signal).toBeInstanceOf(AbortSignal);
  });
});
