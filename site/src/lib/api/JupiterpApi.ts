/**
 * This file is part of Jupiterp. For terms of use, please see the file
 * called LICENSE at the top level of the Jupiterp source tree (online at
 * https://github.com/atcupps/Jupiterp/LICENSE).
 * Copyright (C) 2026 Andrew Cupps
 *
 * @fileoverview Grade and instructor calls against the Jupiterp API.
 *
 * `@jupiterp/jupiterp` v0.8.5 has no grade methods, so the endpoints the API
 * already serves are unreachable from the site. This module fills that gap and
 * is written to be lifted into the package unchanged; see `types.ts`.
 *
 * Every function takes an optional `fetch`. SvelteKit passes its own during
 * SSR so that server-side requests are traced and relative URLs resolve, and
 * `+page.ts` load functions are required to use it. Defaulting to the global
 * keeps client-side callers from having to care.
 */

import { client } from '../client';
import { normalizeName } from '../professor/Names';
import { sendSafely, UNREACHABLE_MESSAGE } from './SafeFetch';
import type {
  CourseGradeSummary,
  CourseInstructorGradeSummary,
  CourseTermGradeSummary,
  GradeTerm,
  InstructorFull,
  InstructorGradeSummary,
  InstructorTermGradeSummary,
  Page,
  Review,
  ReviewSubmission,
} from './types';

type Fetch = typeof globalThis.fetch;

/** Thrown for any non-2xx response, so callers get one failure mode. */
export class JupiterpApiError extends Error {
  constructor(
    readonly status: number,
    readonly path: string,
    body: string
  ) {
    super(`Jupiterp API ${status} for ${path}${body ? `: ${body}` : ''}`);
    this.name = 'JupiterpApiError';
  }
}

async function get<T>(path: string, params: URLSearchParams, fetchFn: Fetch = fetch): Promise<Page<T>> {
  const url = `${client.dbUrl}${path}?${params.toString()}`;
  const response = await fetchFn(url);

  if (!response.ok) {
    throw new JupiterpApiError(response.status, path, await response.text().catch(() => ''));
  }

  return {
    data: (await response.json()) as T[],
    total: parseContentRange(response.headers.get('Content-Range')),
  };
}

/**
 * Read the total out of a PostgREST `Content-Range` header.
 *
 * The format is `0-49/4812`. The total is `*` when the request
 * did not ask for an exact count, which is not an error -- it means the
 * caller did not pay for one.
 */
export function parseContentRange(header: string | null): number | null {
  if (header === null) {
    return null;
  }
  const total = header.split('/')[1];
  if (total === undefined || total === '*') {
    return null;
  }
  const parsed = Number.parseInt(total, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function build(entries: Record<string, string | number | boolean | undefined>): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(entries)) {
    if (value !== undefined && value !== '' && value !== false) {
      params.set(key, String(value));
    }
  }
  return params;
}

/* ============================== grades ================================= */

export interface CourseGradesConfig {
  /** Comma-separated course codes. */
  courseCodes: string;
  minStudents?: number;
  sortBy?: string;
  limit?: number;
}

/** Course-wide grade distributions, one row per course. */
export async function courseGradeSummary(cfg: CourseGradesConfig, fetchFn?: Fetch): Promise<Page<CourseGradeSummary>> {
  return get<CourseGradeSummary>(
    '/v1/grades/summary',
    build({
      groupBy: 'course',
      courseCodes: cfg.courseCodes,
      minStudents: cfg.minStudents,
      sortBy: cfg.sortBy,
      limit: cfg.limit ?? 500,
    }),
    fetchFn
  );
}

export interface CourseInstructorGradesConfig extends CourseGradesConfig {
  /**
   * Also count sections whose instructor was carried across lecture groups or
   * into a differently-coded offering. Wider coverage, lower confidence; the
   * professor page exposes this as an explicit opt-in toggle.
   */
  includeCarried?: boolean;
}

/** Per-professor grade distributions within one or more courses. */
export async function courseInstructorGradeSummary(
  cfg: CourseInstructorGradesConfig,
  fetchFn?: Fetch
): Promise<Page<CourseInstructorGradeSummary>> {
  return get<CourseInstructorGradeSummary>(
    '/v1/grades/summary',
    build({
      groupBy: 'instructor',
      includeCarried: cfg.includeCarried,
      courseCodes: cfg.courseCodes,
      minStudents: cfg.minStudents,
      sortBy: cfg.sortBy,
      limit: cfg.limit ?? 500,
    }),
    fetchFn
  );
}

/**
 * One professor's grades across every course they have taught.
 *
 * Filtered by slug rather than name on purpose: the same professor is spelled
 * several ways across the registrar exports, Testudo, and PlanetTerp, and an
 * exact name match silently returns nothing for a large share of instructors.
 */
export async function instructorGradeSummary(
  instructorSlug: string,
  fetchFn?: Fetch
): Promise<InstructorGradeSummary | null> {
  const page = await get<InstructorGradeSummary>(
    '/v1/grades/summary',
    build({ groupBy: 'instructorOverall', instructorSlug, limit: 1 }),
    fetchFn
  );
  return page.data[0] ?? null;
}

/** One professor's grades per term, oldest first, for the trend chart. */
export async function instructorTermGradeSummary(
  instructorSlug: string,
  fetchFn?: Fetch
): Promise<Page<InstructorTermGradeSummary>> {
  return get<InstructorTermGradeSummary>(
    '/v1/grades/summary',
    build({
      groupBy: 'instructorTerm',
      instructorSlug,
      sortBy: 'term.asc',
      limit: 200,
    }),
    fetchFn
  );
}

/** One professor's grades per course, largest first. */
export async function instructorCourseGradeSummary(
  instructorSlug: string,
  options: { includeCarried?: boolean } = {},
  fetchFn?: Fetch
): Promise<Page<CourseInstructorGradeSummary>> {
  return get<CourseInstructorGradeSummary>(
    '/v1/grades/summary',
    build({
      groupBy: 'instructor',
      instructorSlug,
      includeCarried: options.includeCarried,
      sortBy: 'graded.desc',
      limit: 500,
    }),
    fetchFn
  );
}

/** Grade distributions for one course, per term. */
export async function courseTermGradeSummary(
  courseCodes: string,
  fetchFn?: Fetch
): Promise<Page<CourseTermGradeSummary>> {
  return get<CourseTermGradeSummary>(
    '/v1/grades/summary',
    build({ groupBy: 'term', courseCodes, sortBy: 'term.asc', limit: 200 }),
    fetchFn
  );
}

/** Every term for which grade data exists, newest first. */
export async function gradeTerms(fetchFn?: Fetch): Promise<Page<GradeTerm>> {
  return get<GradeTerm>('/v1/grades/terms', build({}), fetchFn);
}

/* ============================ instructors =============================== */

export interface InstructorSearchConfig {
  /** Case-insensitive substring match, normalized server-side. */
  nameSearch?: string;
  activeOnly?: boolean;
  sortBy?: string;
  limit?: number;
  offset?: number;
  /** Ask for a total row count in `Content-Range`. Costs an extra aggregate. */
  count?: boolean;
}

/**
 * Search instructors by partial name, server-side.
 *
 * The planner previously paged through every active instructor into a
 * client-side record on each page load -- several hundred KB, and untenable
 * once the directory covers the full historical instructor set.
 */
export async function searchInstructors(cfg: InstructorSearchConfig, fetchFn?: Fetch): Promise<Page<InstructorFull>> {
  return get<InstructorFull>(
    '/v1/instructors',
    build({
      // The server matches against a normalized column, so an
      // un-normalized query finds nothing: "O'Brien" against the stored
      // "o brien" fails on the apostrophe.
      nameSearch: normalizeName(cfg.nameSearch) ?? undefined,
      activeOnly: cfg.activeOnly,
      sortBy: cfg.sortBy,
      limit: cfg.limit ?? 50,
      offset: cfg.offset,
      count: cfg.count,
    }),
    fetchFn
  );
}

/**
 * Course codes this professor is scheduled to teach right now.
 *
 * Filtered by `instructorSlug`, not by name: the API resolves each section's
 * instructors through the alias table, so this finds a professor whose Testudo
 * spelling differs from their canonical record.
 *
 * Distinct from the courses on a professor page, which come from grade data
 * and are therefore always at least a term behind. A student writing a review
 * is usually writing about the course they are in now, which by definition has
 * no grades yet.
 */
export async function currentCourseCodesFor(slug: string, fetchFn?: Fetch): Promise<string[]> {
  const page = await get<{ course_code: string }>('/v1/sections', build({ instructorSlug: slug, limit: 500 }), fetchFn);
  return [...new Set(page.data.map((row) => row.course_code))].sort();
}

/** Fetch one instructor by slug, or null when there is no such professor. */
export async function instructorBySlug(slug: string, fetchFn?: Fetch): Promise<InstructorFull | null> {
  const page = await get<InstructorFull>('/v1/instructors', build({ instructorSlugs: slug, limit: 1 }), fetchFn);
  return page.data[0] ?? null;
}

export { normalizeName as normalizeSearchTerm };

/* =============================== reviews ================================ */

/**
 * Approved reviews for one professor.
 *
 * Served from a database view that cannot express an unapproved row and does
 * not contain the submitter's identity columns at all, so there is no filter
 * here that could be forgotten.
 */
export async function reviewsFor(
  instructorSlug: string,
  options: {
    courseCode?: string;
    sort?: ReviewSort;
    /** One star bucket: 4 is 4.0 up to but not including 5.0. */
    rating?: number;
    source?: Review['source'];
    limit?: number;
    offset?: number;
  } = {},
  fetchFn?: Fetch
): Promise<Page<Review>> {
  return get<Review>(
    '/v1/reviews',
    build({
      instructorSlug,
      courseCode: options.courseCode,
      sort: options.sort,
      rating: options.rating,
      source: options.source,
      limit: options.limit ?? 25,
      offset: options.offset,
    }),
    fetchFn
  );
}

/** The orders `GET /v1/reviews` accepts. `newest` is the API's default. */
export type ReviewSort = 'newest' | 'oldest' | 'highest' | 'lowest';

/** The API's reply to a submission, or to a validation failure. */
export interface SubmitResult {
  ok: boolean;
  /** Present on failure. Safe to show: the API writes these for humans. */
  error?: string;
  /** True when the caller should wait and retry rather than change anything. */
  rateLimited?: boolean;
  /**
   * True when a reviewer session skipped the confirmation email: the review is
   * already with the moderators and `manageKey` is its key, shown once.
   */
  submitted?: boolean;
  manageKey?: string;
}

/* =========================== reviewer sessions ========================== */

/**
 * Reviewer session tokens, so that after confirming one review by email the
 * next few from this browser go straight through.
 *
 * Kept only when the reviewer ticks "remember this device", because anyone
 * who later uses this browser and types the same address inherits the
 * session. Several are kept, not just the latest: someone who reviews three
 * professors and then confirms the first link needs the first token.
 *
 * A token starts a session only when this browser presents it together with
 * the emailed link (see `activateReviewSessions`). The API decides everything
 * else -- expiry, the use cap, the address it is bound to -- and the copy
 * here is pruned once it cannot matter: 48 hours unconfirmed, the link's own
 * lifetime, or the moment its session expires.
 */
const REVIEW_SESSIONS_KEY = 'reviewSessions';
const PENDING_SESSION_MAX_AGE_MS = 48 * 60 * 60 * 1000;
/** The API refuses an activation presenting more than this. */
const MAX_STORED_SESSIONS = 20;

interface StoredSession {
  token: string;
  /** SHA-256 of the address, so the address itself is not left in storage. */
  emailHash: string;
  savedAt: number;
  /** Set once the session is activated; absent while it is pending. */
  expiresAt?: number;
}

function isStoredSession(value: unknown): value is StoredSession {
  const v = value as StoredSession;
  return typeof v?.token === 'string' && typeof v.emailHash === 'string' && typeof v.savedAt === 'number';
}

function readSessions(): StoredSession[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(REVIEW_SESSIONS_KEY) ?? '[]');
    const now = Date.now();
    const all = Array.isArray(parsed) ? parsed.filter(isStoredSession) : [];
    const live = all.filter((s) =>
      s.expiresAt === undefined ? now - s.savedAt < PENDING_SESSION_MAX_AGE_MS : s.expiresAt > now
    );
    if (live.length !== all.length) {
      writeSessions(live);
    }
    return live;
  } catch {
    // Private mode, blocked storage, or a corrupt value: no session, so the
    // review goes through the email flow, which always works.
    return [];
  }
}

function writeSessions(sessions: StoredSession[]) {
  try {
    if (sessions.length === 0) {
      localStorage.removeItem(REVIEW_SESSIONS_KEY);
      return;
    }
    localStorage.setItem(REVIEW_SESSIONS_KEY, JSON.stringify(sessions.slice(-MAX_STORED_SESSIONS)));
  } catch {
    // As above: costs only the shortcut.
  }
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const emailKey = (email: string) => sha256Hex(email.trim().toLowerCase());

/** Whether this browser is keeping any reviewer session, pending or active. */
export function hasReviewSessions(): boolean {
  return readSessions().length > 0;
}

/** Drop every reviewer session this browser holds. */
export function forgetReviewSessions() {
  writeSessions([]);
}

/**
 * Start the session issued with the review whose link was just confirmed.
 *
 * Sends every pending token: this page cannot tell which review the link
 * belongs to, and the API matches it. Returns when the session expires, or
 * undefined if none started -- nothing stored, a link from another browser,
 * or an address with a rejected review.
 */
export async function activateReviewSessions(verifyToken: string, fetchFn: Fetch = fetch): Promise<Date | undefined> {
  const pending = readSessions().filter((s) => s.expiresAt === undefined);
  if (pending.length === 0) {
    return undefined;
  }
  const response = await sendSafely(fetchFn, `${client.dbUrl}/v1/reviews/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ verify_token: verifyToken, session_tokens: pending.map((s) => s.token) }),
  });
  const payload = response?.ok ? await response.json().catch(() => ({})) : {};
  const expiresAt = Date.parse(payload.expires_at);
  if (payload.activated !== true || Number.isNaN(expiresAt)) {
    return undefined;
  }

  const sessions = readSessions();
  for (const session of sessions) {
    if ((await sha256Hex(session.token)) === payload.token_hash) {
      session.expiresAt = expiresAt;
      writeSessions(sessions);
      return new Date(expiresAt);
    }
  }
  return undefined;
}

/**
 * Submit a review.
 *
 * With `rememberDevice`, an active session for this address is used and a new
 * pending one is kept. Without it, every session this browser held is
 * dropped: unticking the box is how a reviewer on a shared computer says so.
 *
 * Without an active reviewer session, the API answers identically whether or
 * not this address has already reviewed this professor, so a caller cannot use
 * it to find out. Do not try to interpret that response as anything finer than
 * "accepted".
 */
export async function submitReview(
  review: ReviewSubmission,
  { rememberDevice = false }: { rememberDevice?: boolean } = {},
  fetchFn: Fetch = fetch
): Promise<SubmitResult> {
  let emailHash: string | undefined;
  let sessionToken: string | undefined;
  if (rememberDevice) {
    emailHash = await emailKey(review.email);
    const now = Date.now();
    sessionToken = readSessions()
      .filter((s) => s.emailHash === emailHash && s.expiresAt !== undefined && s.expiresAt > now)
      .sort((a, b) => (b.expiresAt ?? 0) - (a.expiresAt ?? 0))[0]?.token;
  } else {
    forgetReviewSessions();
  }

  const response = await sendSafely(fetchFn, `${client.dbUrl}/v1/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...review, session_token: sessionToken }),
  });

  if (response === null) {
    return { ok: false, error: UNREACHABLE_MESSAGE };
  }
  if (response.ok) {
    const payload = await response.json().catch(() => ({}));
    // A 202 ran the email flow and issued a new pending token. It is added,
    // not swapped in: the active one sent, if any, stays good, and so do
    // other pending ones whose links have not been clicked yet.
    if (rememberDevice && emailHash !== undefined && typeof payload.session_token === 'string') {
      writeSessions([...readSessions(), { token: payload.session_token, emailHash, savedAt: Date.now() }]);
    }
    if (payload.status === 'submitted') {
      return { ok: true, submitted: true, manageKey: payload.manage_key };
    }
    return { ok: true };
  }
  const payload = await response.json().catch(() => ({ error: 'Something went wrong.' }));
  return {
    ok: false,
    error: payload.error ?? 'Something went wrong.',
    rateLimited: response.status === 429,
  };
}

/** Confirm an emailed verification link. Returns the manage key, once. */
export async function verifyReview(
  token: string,
  fetchFn: Fetch = fetch
): Promise<{ ok: boolean; manageKey?: string; message: string }> {
  const response = await sendSafely(fetchFn, `${client.dbUrl}/v1/reviews/verify/${encodeURIComponent(token)}`);
  if (response === null) {
    return { ok: false, message: UNREACHABLE_MESSAGE };
  }
  const payload = await response.json().catch(() => ({}));
  return {
    ok: response.ok,
    manageKey: payload.manage_key,
    message: payload.message ?? payload.error ?? 'Something went wrong.',
  };
}

/** The review a manage key controls, as the withdrawal page needs to show it. */
export interface ManagedReview {
  id: string;
  instructor: string;
  instructor_slug: string;
  course_code: string | null;
  term: number | null;
  rating: number;
  title: string | null;
  body: string | null;
  status: string;
  submitted_at: string;
  /** False once there is nothing left to retract. */
  withdrawable: boolean;
}

/**
 * Look up the review a manage key controls.
 *
 * The key alone identifies it. A reviewer is never told their review's id — not
 * in the verification response, not in the email — so a withdrawal flow that
 * needed one could not be completed by the only person entitled to use it.
 *
 * Returns null for a key the server does not recognise, which is the same
 * answer it gives for a key that is simply wrong.
 */
export async function manageReview(manageKey: string, fetchFn: Fetch = fetch): Promise<ManagedReview | null> {
  const response = await fetchFn(`${client.dbUrl}/v1/reviews/manage`, {
    headers: { Authorization: `Bearer ${manageKey}` },
  });
  if (!response.ok) {
    return null;
  }
  return (await response.json()) as ManagedReview;
}

/** Withdraw a review using its manage key. */
export async function withdrawReview(id: string, manageKey: string, fetchFn: Fetch = fetch): Promise<boolean> {
  const response = await sendSafely(fetchFn, `${client.dbUrl}/v1/reviews/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${manageKey}` },
  });
  return response?.ok ?? false;
}

/** Report a published review for breaching the content policy. */
export async function reportReview(
  id: string,
  reason: string,
  detail: string,
  fetchFn: Fetch = fetch
): Promise<boolean> {
  const response = await sendSafely(fetchFn, `${client.dbUrl}/v1/reviews/${encodeURIComponent(id)}/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason, detail }),
  });
  return response?.ok ?? false;
}
