'use client';

import { useEffect, useRef, type RefObject } from 'react';
import { scrollBehavior } from '@/core/lib/utils/motion';
import { centredScrollLeftOf, stripOverflows } from '@/core/lib/utils/strip-scroll';

/**
 * Keeps the active item of a horizontal strip in view: when the active key changes, the strip scrolls the item to
 * its middle, so a tab picked by a command on a phone is never left beyond the edge. The first scroll is instant.
 */
export function useActiveItemInView<Strip extends HTMLElement, Item extends HTMLElement>(
	activeRef: RefObject<Item | null>,
	activeKey: string
) {
	const stripRef = useRef<Strip>(null);
	const hasScrolled = useRef(false);

	useEffect(() => {
		const strip = stripRef.current;
		const item = activeRef.current;
		if (!strip || !item) return;
		const stripRect = strip.getBoundingClientRect();
		const stripBox = {
			left: stripRect.left,
			scrollLeft: strip.scrollLeft,
			clientWidth: strip.clientWidth,
			scrollWidth: strip.scrollWidth
		};
		if (!stripOverflows(stripBox)) return;
		const itemRect = item.getBoundingClientRect();
		const left = centredScrollLeftOf(stripBox, { left: itemRect.left, width: itemRect.width });
		let behavior: ScrollBehavior = 'auto';
		if (hasScrolled.current) {
			behavior = scrollBehavior();
		}
		strip.scrollTo({ left, behavior });
		hasScrolled.current = true;
	}, [activeKey, activeRef]);

	return stripRef;
}
