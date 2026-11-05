'use client';

import { useCallback, useState } from 'react';

const DEFAULT_MARGIN = '600px';

function supportsIntersectionObserver() {
	return typeof window !== 'undefined' && 'IntersectionObserver' in window;
}

function scrollsVertically(element: Element) {
	const { overflowY } = window.getComputedStyle(element);
	return overflowY === 'auto' || overflowY === 'scroll';
}

/** A scrolling ancestor clips what it holds, so the margin only works when measured from that ancestor. */
function scrollContainerOf(element: Element) {
	let ancestor = element.parentElement;
	while (ancestor) {
		if (scrollsVertically(ancestor)) {
			return ancestor;
		}
		ancestor = ancestor.parentElement;
	}
	return null;
}

export function useHasComeNear<T extends Element>(margin: string = DEFAULT_MARGIN) {
	const [hasComeNear, setHasComeNear] = useState(false);

	const ref = useCallback(
		(element: T | null) => {
			if (!element || hasComeNear) {
				return;
			}
			if (!supportsIntersectionObserver()) {
				setHasComeNear(true);
				return;
			}
			const observer = new IntersectionObserver(
				(entries) => {
					const isNear = entries.some((entry) => entry.isIntersecting);
					if (isNear) {
						setHasComeNear(true);
						observer.disconnect();
					}
				},
				{ root: scrollContainerOf(element), rootMargin: margin }
			);
			observer.observe(element);
			return () => observer.disconnect();
		},
		[hasComeNear, margin]
	);

	return { ref, hasComeNear };
}
