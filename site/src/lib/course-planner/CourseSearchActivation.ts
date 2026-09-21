/**
 * This file is part of Jupiterp. For terms of use, please see the file
 * called LICENSE at the top level of the Jupiterp source tree (online at
 * https://github.com/atcupps/Jupiterp/LICENSE).
 *
 *
 * @fileoverview Focus and activation helpers for the course search input.
 */

import { tick } from 'svelte';

export interface CourseSearchActivationControllerOptions {
  isDesktop: () => boolean;
  blockSearchInputPointer: () => boolean;
  setBlockSearchInputPointer: (value: boolean) => void;
  searchActivationInProgress: () => boolean;
  setSearchActivationInProgress: (value: boolean) => void;
  suppressSearchBlurReset: () => boolean;
  setSuppressSearchBlurReset: (value: boolean) => void;
  searchInputElement: () => HTMLInputElement | null;
  keyboardPrimeElement: () => HTMLInputElement | null;
  scrollToSearch: () => void;
}

function waitForScrollToFinish(delayMs = 250) {
  return new Promise<void>((resolve) => {
    setTimeout(() => resolve(), delayMs);
  });
}

function primeMobileKeyboard(keyboardPrimeElement: HTMLInputElement | null) {
  keyboardPrimeElement?.focus({ preventScroll: true });
}

export function createCourseSearchActivationController(options: CourseSearchActivationControllerOptions) {
  function canActivateSearchInput() {
    return !options.isDesktop() && options.blockSearchInputPointer() && !options.searchActivationInProgress();
  }

  async function activateSearchInput() {
    if (!canActivateSearchInput()) {
      return;
    }

    options.setSearchActivationInProgress(true);
    options.setSuppressSearchBlurReset(true);
    options.scrollToSearch();
    primeMobileKeyboard(options.keyboardPrimeElement());
    await waitForScrollToFinish();
    options.setBlockSearchInputPointer(false);
    await tick();
    options.searchInputElement()?.focus({ preventScroll: true });
    options.setSearchActivationInProgress(false);
  }

  function handleSearchFocus(event: FocusEvent) {
    if (!options.isDesktop() && options.blockSearchInputPointer() && !options.searchActivationInProgress()) {
      event.preventDefault();
      void activateSearchInput();
    }
  }

  function handleSearchBlur() {
    if (!options.isDesktop() && !options.suppressSearchBlurReset()) {
      options.setBlockSearchInputPointer(true);
    }
    options.setSuppressSearchBlurReset(false);
  }

  return {
    activateSearchInput,
    handleSearchFocus,
    handleSearchBlur,
  };
}
