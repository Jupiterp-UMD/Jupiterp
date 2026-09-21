/**
 * This file is part of Jupiterp. For terms of use, please see the file
 * called LICENSE at the top level of the Jupiterp source tree (online at
 * https://github.com/atcupps/Jupiterp/LICENSE).
 *
 *
 * @fileoverview Keyboard shortcuts for the course planner page.
 */

function focusCourseSearchInput() {
  const searchInput = document.getElementById('planner-course-search-input');
  if (!(searchInput instanceof HTMLInputElement)) {
    return;
  }

  searchInput.focus({ preventScroll: true });
}

export function handlePlannerShortcutKeydown(event: KeyboardEvent, isDesktop: boolean) {
  // NOTE: use alt instead of ctrl/cmd to avoid conflicts with assistive technologies and browser shortcuts
  if (event.ctrlKey || event.metaKey) {
    // TODO: ctrl shortcuts (e.g., ctrl+z and ctrl+shift+z for undo/redo)
    return;
  }

  // make sure to check if event is coming from an input, textarea, or contenteditable element and ignore it if so (unless it's the course search input)
  const activeElement = document.activeElement;
  const isInputFocused =
    activeElement instanceof HTMLInputElement ||
    activeElement instanceof HTMLTextAreaElement ||
    (activeElement instanceof HTMLElement && activeElement.isContentEditable);

  // use switch statement for better readability and to allow for future expansion of shortcuts
  switch (event.key) {
    case 'Escape':
      if (activeElement instanceof HTMLElement) {
        activeElement.blur();
      }
      return; // always prevent default for Escape to avoid conflicts with browser shortcuts
    case '/':
      if (activeElement?.id !== 'planner-course-search-input') {
        event.preventDefault();
        focusCourseSearchInput();
      }
      return;
    default:
      if (isInputFocused && !event.altKey) {
        return; // ignore shortcuts if an input is focused
      } // could use "alt" to skip this check
      break;
  }

  // Handle key-based shortcuts
  switch (event.key) {
    case ',':
      if (!isDesktop) {
        event.preventDefault();
        const scheduleElement = document.getElementById('planner-schedule');
        scheduleElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      break;
    case '.':
      if (!isDesktop) {
        event.preventDefault();
        const searchResultsElement = document.getElementById('planner-search-results');
        searchResultsElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      break;
    default:
      break;
  }
}
