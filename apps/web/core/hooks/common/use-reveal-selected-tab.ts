'use client';

import { type RefObject, useEffect, useRef } from 'react';
import { useIsomorphicLayoutEffect } from '@/core/hooks/common/use-isomorphic-layout-effect';
import { scrollBehavior } from '@/core/lib/utils/motion';
import { type ContentSpan, revealedScrollLeftOf } from '@/core/lib/utils/scroll-reveal';

const SELECTED_TAB = '[role="tab"][aria-selected="true"]';

function contentSpanOf(scroller: HTMLElement, item: HTMLElement): ContentSpan {
	const scrollerLeft = scroller.getBoundingClientRect().left + scroller.clientLeft;
	const itemBox = item.getBoundingClientRect();
	const start = itemBox.left - scrollerLeft + scroller.scrollLeft;
	return { start, end: start + itemBox.width };
}

function scrollScrollerTo(scroller: HTMLElement, left: number, behavior: ScrollBehavior) {
	const canScrollTo = typeof scroller.scrollTo === 'function';
	if (!canScrollTo) {
		scroller.scrollLeft = left;
		return;
	}
	scroller.scrollTo({ left, behavior });
}

function revealedLeftOf(scroller: HTMLElement, room: number) {
	const selected = scroller.querySelector<HTMLElement>(SELECTED_TAB);
	if (!selected) {
		return null;
	}
	const view = {
		scrollLeft: scroller.scrollLeft,
		viewWidth: scroller.clientWidth,
		contentWidth: scroller.scrollWidth
	};
	const span = contentSpanOf(scroller, selected);
	return revealedScrollLeftOf(view, span, room);
}

function scrollToRevealed(scroller: HTMLElement, left: number, behavior: ScrollBehavior) {
	const isInView = left === scroller.scrollLeft;
	if (isInView) {
		return;
	}
	scrollScrollerTo(scroller, left, behavior);
}

/** The first reveal happens as the page arrives: no motion then. */
function revealBehaviorOf(isFirstReveal: boolean): ScrollBehavior {
	if (isFirstReveal) {
		return 'auto';
	}
	return scrollBehavior();
}

/**
 * Keeps the selected tab of a switch that scrolls sideways whole in view, with `room` pixels around it for its focus
 * ring: when the switch mounts, whenever `selectedKey` changes (a click, an arrow key, a link) and when the switch
 * changes width. Only the scroller moves, never the page, and a change of width moves it without motion.
 */
export function useRevealSelectedTab(scrollerRef: RefObject<HTMLElement | null>, selectedKey: string, room: number) {
	const hasRevealedRef = useRef(false);

	useIsomorphicLayoutEffect(() => {
		const scroller = scrollerRef.current;
		if (!scroller) {
			return;
		}
		const left = revealedLeftOf(scroller, room);
		if (left === null) {
			return;
		}
		const isFirstReveal = !hasRevealedRef.current;
		hasRevealedRef.current = true;
		scrollToRevealed(scroller, left, revealBehaviorOf(isFirstReveal));
	}, [room, scrollerRef, selectedKey]);

	useEffect(() => {
		const scroller = scrollerRef.current;
		const canObserve = typeof ResizeObserver !== 'undefined';
		if (!scroller || !canObserve) {
			return;
		}
		let observedWidth = scroller.clientWidth;
		const observer = new ResizeObserver(() => {
			const width = scroller.clientWidth;
			const hasNewWidth = width !== observedWidth;
			observedWidth = width;
			if (!hasNewWidth) {
				return;
			}
			const left = revealedLeftOf(scroller, room);
			if (left === null) {
				return;
			}
			scrollToRevealed(scroller, left, 'auto');
		});
		observer.observe(scroller);
		return () => observer.disconnect();
	}, [room, scrollerRef]);
}
