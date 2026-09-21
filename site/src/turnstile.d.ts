/**
 * This file is part of Jupiterp. For terms of use, please see the file
 * called LICENSE at the top level of the Jupiterp source tree (online at
 * https://github.com/atcupps/Jupiterp/LICENSE).
 * Copyright (C) 2026 Andrew Cupps
 *
 * @fileoverview Types for the Cloudflare Turnstile widget.
 *
 * Turnstile ships no types and is loaded from a script tag at runtime, so
 * `window.turnstile` is `undefined` until it arrives. It is declared optional
 * here for exactly that reason: every call site has to handle the script not
 * having loaded, which is a real state and not a defensive nicety — the review
 * form went to production with markup for a widget whose script was never
 * loaded at all.
 *
 * Only the four members the review form uses are declared. Widening this is
 * cheap; guessing at the rest is not.
 */

interface TurnstileRenderOptions {
  sitekey: string;
  /** Called with a fresh token once the visitor passes. Tokens are single-use. */
  callback?: (token: string) => void;
  /** Tokens expire after a few minutes; this fires when one does. */
  'expired-callback'?: () => void;
  'error-callback'?: () => void;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'normal' | 'flexible' | 'compact';
  action?: string;
}

interface TurnstileApi {
  /** Renders a widget and returns its id, used for reset and remove. */
  render(container: HTMLElement | string, options: TurnstileRenderOptions): string;
  /** Discards the current token and issues a new challenge. */
  reset(widgetId?: string): void;
  remove(widgetId?: string): void;
  getResponse(widgetId?: string): string | undefined;
}

interface Window {
  turnstile?: TurnstileApi;
}
