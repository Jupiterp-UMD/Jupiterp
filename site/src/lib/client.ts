/**
 * This file is part of Jupiterp. For terms of use, please see the file
 * called LICENSE at the top level of the Jupiterp source tree (online at
 * https://github.com/atcupps/Jupiterp/LICENSE).
 * Copyright (C) 2026 Andrew Cupps
 *
 * @fileoverview Creates an API client instance for use elsewhere.
 */
import { JupiterpClientV1 } from '@jupiterp/jupiterp';
import { env } from '$env/dynamic/public';

/**
 * The API this site talks to.
 *
 * Overridable so that pointing the site at a local API is a shell variable
 * rather than a source edit:
 *
 *     PUBLIC_JUPITERP_API=http://localhost:8080 npm run dev
 *
 * Note the scheme: the local API serves plain HTTP, so `http://localhost:8080`.
 * `https://` there fails the TLS handshake and surfaces as a network error with
 * no response at all, which reads like the server being down.
 *
 * Unset, this is production, so nothing changes for a normal build or deploy.
 */
const apiUrl = env.PUBLIC_JUPITERP_API?.trim();

export const client = apiUrl ? new JupiterpClientV1(apiUrl) : JupiterpClientV1.createDefault();
