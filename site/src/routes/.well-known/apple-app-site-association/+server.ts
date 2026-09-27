/**
 * This file is part of Jupiterp. For terms of use, please see the file
 * called LICENSE at the top level of the Jupiterp source tree (online at
 * https://github.com/atcupps/Jupiterp/LICENSE).
 *
 *
 * @fileoverview Apple's associated-domains file, which lets the iOS app open
 * professor pages, review links, and searches in place of Safari.
 *
 * A route rather than a file in `static/`, because the name has no extension:
 * served as a static asset it goes out as `application/octet-stream`, and Apple
 * expects `application/json`. The Android counterpart has a `.json` name and
 * lives in `static/.well-known/assetlinks.json`.
 *
 * Apple's CDN fetches this without following redirects, so it has to answer
 * 200 on both jupiterp.com and www.jupiterp.com -- which it does, since
 * neither host redirects to the other.
 */

import type { RequestHandler } from './$types';

// Rendered per request so the Content-Type below is what is actually sent; a
// prerendered copy would be served as a static file and lose it.
export const prerender = false;

/** `<Apple Team ID>.<bundle id>` for the iOS app. */
const APP_ID = '7P2ZTVF379.com.jupiterp.jupiterpmobile';

const association = {
  applinks: {
    details: [
      {
        appIDs: [APP_ID],
        components: [{ '/': '/professor/*' }, { '/': '/review/*' }, { '?': { s: '*' } }],
      },
    ],
  },
};

export const GET: RequestHandler = () =>
  new Response(JSON.stringify(association), {
    headers: {
      'Content-Type': 'application/json',
      // Apple's CDN re-fetches on its own schedule; an hour keeps a change
      // here from being held back for long.
      'Cache-Control': 'public, max-age=3600',
    },
  });
