/**
 * This file is part of Jupiterp. For terms of use, please see the file
 * called LICENSE at the top level of the Jupiterp source tree (online at
 * https://github.com/atcupps/Jupiterp/LICENSE).
 *
 *
 * @fileoverview How the browser keeps reviewer session tokens.
 *
 * It used to keep only the latest token, and every 202 replaced it. Someone who
 * reviewed three professors and then confirmed the first link was activating a
 * token the browser had already thrown away, and a submit under a second
 * address overwrote a live session.
 */

import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import { webcrypto } from 'node:crypto';
import { TextEncoder } from 'node:util';
import type { ReviewSubmission } from './types';

jest.mock('../client', () => ({ client: { dbUrl: 'https://api.example' } }));

import { activateReviewSessions, hasReviewSessions, submitReview } from './JupiterpApi';

Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
Object.defineProperty(globalThis, 'TextEncoder', { value: TextEncoder, configurable: true });

const review = (email: string): ReviewSubmission => ({
  instructor_slug: 'shane-walsh',
  course_code: 'CMSC132',
  term: 202508,
  rating: 4,
  expected_grade: 'A',
  title: 't',
  body: 'a perfectly fine review',
  email,
});

interface Call {
  url: string;
  body: Record<string, unknown>;
}

/** A fetch that answers each call with the next reply and records what it got. */
function fakeFetch(replies: { status: number; body: unknown }[]) {
  const calls: Call[] = [];
  const fn = (async (url: string, init?: RequestInit) => {
    calls.push({ url, body: JSON.parse(String(init?.body ?? '{}')) });
    const reply = replies.shift() ?? { status: 500, body: {} };
    return { ok: reply.status < 300, status: reply.status, json: async () => reply.body } as Response;
  }) as typeof fetch;
  return { fn, calls };
}

async function sha256Hex(text: string) {
  const digest = await webcrypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Buffer.from(digest).toString('hex');
}

const stored = () => JSON.parse(localStorage.getItem('reviewSessions') ?? '[]') as { token: string }[];

describe('reviewer sessions', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('keeps every pending token, so any of their links can start a session', async () => {
    const { fn } = fakeFetch([
      { status: 202, body: { status: 'verification_sent', session_token: 'T1' } },
      { status: 202, body: { status: 'verification_sent', session_token: 'T2' } },
      { status: 202, body: { status: 'verification_sent', session_token: 'T3' } },
    ]);
    for (const email of ['a@umd.edu', 'a@umd.edu', 'b@umd.edu']) {
      await submitReview(review(email), { rememberDevice: true }, fn);
    }
    expect(stored().map((s) => s.token)).toEqual(['T1', 'T2', 'T3']);

    // The first link is confirmed last; its token is still here to send.
    const activate = fakeFetch([
      { status: 200, body: { activated: true, token_hash: await sha256Hex('T1'), expires_at: '2999-01-01T00:00:00Z' } },
    ]);
    await expect(activateReviewSessions('VERIFY', activate.fn)).resolves.toEqual(new Date('2999-01-01T00:00:00Z'));
    expect(activate.calls[0].body).toEqual({ verify_token: 'VERIFY', session_tokens: ['T1', 'T2', 'T3'] });
  });

  test('sends only an active token for the same address, and keeps it after a new 202', async () => {
    const hash = await sha256Hex('a@umd.edu');
    localStorage.setItem(
      'reviewSessions',
      JSON.stringify([
        { token: 'PENDING', emailHash: hash, savedAt: Date.now() },
        { token: 'ACTIVE', emailHash: hash, savedAt: Date.now(), expiresAt: Date.now() + 60_000 },
      ])
    );
    const { fn, calls } = fakeFetch([
      { status: 202, body: { status: 'verification_sent', session_token: 'OTHER' } },
      { status: 201, body: { status: 'submitted', manage_key: 'K' } },
    ]);

    await submitReview(review('b@umd.edu'), { rememberDevice: true }, fn);
    expect(calls[0].body.session_token).toBeUndefined();
    expect(stored().map((s) => s.token)).toEqual(['PENDING', 'ACTIVE', 'OTHER']);

    const result = await submitReview(review(' A@umd.edu '), { rememberDevice: true }, fn);
    expect(calls[1].body.session_token).toBe('ACTIVE');
    expect(result).toEqual({ ok: true, submitted: true, manageKey: 'K' });
  });

  test('without "remember this device", nothing is kept or sent and old sessions are dropped', async () => {
    localStorage.setItem(
      'reviewSessions',
      JSON.stringify([
        { token: 'ACTIVE', emailHash: await sha256Hex('a@umd.edu'), savedAt: Date.now(), expiresAt: Date.now() + 1 },
      ])
    );
    const { fn, calls } = fakeFetch([{ status: 202, body: { status: 'verification_sent', session_token: 'NEW' } }]);

    await submitReview(review('a@umd.edu'), {}, fn);

    expect(calls[0].body.session_token).toBeUndefined();
    expect(hasReviewSessions()).toBe(false);
  });

  test('stores a hash of the address, never the address', async () => {
    const { fn } = fakeFetch([{ status: 202, body: { status: 'verification_sent', session_token: 'T' } }]);
    await submitReview(review('someone@umd.edu'), { rememberDevice: true }, fn);
    expect(localStorage.getItem('reviewSessions')).not.toContain('someone');
  });

  test('drops expired sessions and pending ones older than the link', async () => {
    const day = 24 * 60 * 60 * 1000;
    localStorage.setItem(
      'reviewSessions',
      JSON.stringify([
        { token: 'STALE', emailHash: 'h', savedAt: Date.now() - 3 * day },
        { token: 'EXPIRED', emailHash: 'h', savedAt: Date.now(), expiresAt: Date.now() - 1 },
      ])
    );
    expect(hasReviewSessions()).toBe(false);
    expect(localStorage.getItem('reviewSessions')).toBeNull();
  });
});
