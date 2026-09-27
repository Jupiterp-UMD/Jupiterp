/**
 * This file is part of Jupiterp. For terms of use, please see the file
 * called LICENSE at the top level of the Jupiterp source tree (online at
 * https://github.com/atcupps/Jupiterp/LICENSE).
 * Copyright (C) 2026 Andrew Cupps
 *
 * @fileoverview Ambient type augmentations for `@svelte-put/clickoutside`.
 *
 * The action dispatches a `clickoutside` CustomEvent, but v3.0.2 only ships
 * the Svelte 4 `on:clickoutside` attribute type. Svelte 5 listens for custom
 * events through the `onclickoutside` property form, which the package does
 * not yet declare, so `svelte-check` rejects it. Remove this file once
 * `@svelte-put/clickoutside` publishes Svelte 5 attribute types.
 */

declare module 'svelte/elements' {
  // `T` must be declared to match the upstream interface's type parameters,
  // even though this augmentation does not reference it.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  export interface HTMLAttributes<T extends EventTarget> {
    onclickoutside?: (event: CustomEvent<MouseEvent>) => void;
  }
}

export {};
