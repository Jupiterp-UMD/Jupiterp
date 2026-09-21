/**
 * This file is part of Jupiterp. For terms of use, please see the file
 * called LICENSE at the top level of the Jupiterp source tree (online at
 * https://github.com/atcupps/Jupiterp/LICENSE).
 * Copyright (C) 2026 Andrew Cupps
 *
 * @fileoverview Server-side load for a professor page.
 */

import { error } from '@sveltejs/kit';
import { loadProfessor } from '../../../lib/professor/ProfessorData';
import type { PageLoad } from './$types';

/**
 * Professor pages are the reason this migration is worth doing for search
 * traffic, so they must render server-side rather than as an empty shell that
 * fills in on the client.
 *
 * Not prerendered: there are thousands of professors and the set changes every
 * term as Testudo scrapes discover new ones. The API caches these responses for
 * twelve hours, which is the right layer for it.
 */
export const ssr = true;
export const prerender = false;

export const load: PageLoad = async ({ params, fetch }) => {
  const data = await loadProfessor(params.slug, fetch);

  if (data === null) {
    error(404, `No professor found at "${params.slug}"`);
  }

  return { professor: data };
};
