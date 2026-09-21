/**
 * This file is part of Jupiterp. For terms of use, please see the file
 * called LICENSE at the top level of the Jupiterp source tree (online at
 * https://github.com/atcupps/Jupiterp/LICENSE).
 *
 *
 * @fileoverview Mobile chain-scroll helper for scrollable planner elements.
 */

/**
 * This Svelte action enables "chain scrolling" without over-scrolling on mobile devices.
 * @requirement
 * - must have `overflow-y: auto` or `overflow-y: scroll` with `chain-scroll` applied to the scrollable element.
 * - recommend importing "PlannerState" from "CoursePlannerStores" and passing `chainScrollParent` and `isDesktop` to the `use:action` parameters.
 *
 * @example for src/routes/+page.svelte
 * ```svelte
 * <script lang="ts">
 *   import { chainScroll } from '../lib/course-planner/ChainScroll';
 *   import { PlannerState } from '../stores/CoursePlannerStores';
 *   let plannerState = { isDesktop: false, chainScrollParent: null };
 *   PlannerState.subscribe((state) => {
 *      plannerState = state;
 *   });
 * </script>
 *
 * <div use:chainScroll={{ parent: plannerState.chainScrollParent, enabled: plannerState.isDesktop }}>
 *   <!-- scrollable content -->
 * </div>
 * ```
 */

const LISTENER_OPTIONS = { passive: true } as const;

export type ChainScrollProps = {
  isDesktop: boolean;
  chainScrollParent?: HTMLElement | null;
};

export type ChainScrollParams = {
  parent: HTMLElement | null;
  enabled: boolean;
  element: HTMLElement | null | undefined;
};

function getUnconsumedDelta(element: HTMLElement, deltaY: number): number {
  const maxScrollTop = element.scrollHeight - element.clientHeight;
  if (maxScrollTop <= 0) {
    return deltaY;
  }

  const start = element.scrollTop;
  const clampedEnd = Math.min(maxScrollTop, Math.max(0, start + deltaY));
  const consumedByElement = clampedEnd - start;
  return deltaY - consumedByElement;
}

function applyClampedScrollDelta(element: HTMLElement, deltaY: number) {
  const maxScrollTop = element.scrollHeight - element.clientHeight;
  if (maxScrollTop <= 0) {
    return;
  }

  const clampedEnd = Math.min(maxScrollTop, Math.max(0, element.scrollTop + deltaY));
  element.scrollTop = clampedEnd;
}

function isAtScrollBoundary(element: HTMLElement, deltaY: number): boolean {
  const maxScrollTop = element.scrollHeight - element.clientHeight;
  if (maxScrollTop <= 0) {
    return true;
  }

  if (deltaY < 0 && element.scrollTop <= 0.5) {
    return true;
  }
  if (deltaY > 0 && element.scrollTop >= maxScrollTop - 0.5) {
    return true;
  }
  return false;
}

export function chainScroll(node: HTMLElement, params: ChainScrollParams) {
  let current = params;
  let previousTouchY = 0;

  const applyToParent = (deltaY: number) => {
    if (!current.enabled || !current.parent || !current.element) {
      return;
    }

    if (!isAtScrollBoundary(current.element, deltaY)) {
      return;
    }

    const unconsumedDelta = getUnconsumedDelta(current.element, deltaY);
    if (Math.abs(unconsumedDelta) <= 0.5) {
      return;
    }

    applyClampedScrollDelta(current.parent, unconsumedDelta);
  };

  const handleWheel = (event: WheelEvent) => {
    applyToParent(event.deltaY);
  };

  const handleTouchStart = (event: TouchEvent) => {
    if (event.touches.length !== 1) {
      return;
    }

    previousTouchY = event.touches[0].clientY;
  };

  const handleTouchMove = (event: TouchEvent) => {
    if (event.touches.length !== 1) {
      return;
    }

    const currentTouchY = event.touches[0].clientY;
    const deltaY = previousTouchY - currentTouchY;
    previousTouchY = currentTouchY;
    applyToParent(deltaY);
  };

  node.addEventListener('wheel', handleWheel, LISTENER_OPTIONS);
  node.addEventListener('touchstart', handleTouchStart, LISTENER_OPTIONS);
  node.addEventListener('touchmove', handleTouchMove, LISTENER_OPTIONS);

  return {
    update(nextParams: ChainScrollParams) {
      current = nextParams;
    },
    destroy() {
      node.removeEventListener('wheel', handleWheel);
      node.removeEventListener('touchstart', handleTouchStart);
      node.removeEventListener('touchmove', handleTouchMove);
    },
  };
}
