/** This file is part of Jupiterp. See LICENSE at the repository root. */
import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { SHARE_PARAM } from '$lib/course-planner/ShareLink';
import type { PageLoad } from './$types';

// Existing root share links must still open the planner and import the schedule.
export const load: PageLoad = ({ url }) => {
  if (url.searchParams.has(SHARE_PARAM)) {
    redirect(307, `${resolve('/planner')}${url.search}${url.hash}`);
  }
};
