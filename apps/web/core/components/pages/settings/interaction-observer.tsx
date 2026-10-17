'use client';
import { useCallbackRef } from '@/core/hooks';
import { clsxm } from '@/core/lib/utils';
import { useIntersectionObserver } from '@uidotdev/usehooks';
import React, { useEffect } from 'react';

export const InteractionObserverVisible = ({
	id,
	setActiveSection,
	children
}: {
	id: string;
	setActiveSection: (v: any) => void;
	children: React.ReactNode;
	className?: string;
}) => {
	const $setActiveSection = useCallbackRef(setActiveSection);

	const [ref, entry] = useIntersectionObserver({
		threshold: 0.9,
		root: null,
		rootMargin: '20px'
	});
	useEffect(() => {
		if (entry?.isIntersecting) {
			$setActiveSection.current?.(id);
		}
	}, [entry, id, $setActiveSection]);

	return (
		<div className="relative">
			{children}
			<div
				id={id}
				ref={ref}
				// Capped at the section's own height: the 100vh-tall marker used to hang below the last
				// (short) section and stretch the page past its content.
				className={clsxm('pointer-events-none absolute right-0 top-0 -z-50 h-[calc(100vh-296px)] max-h-full w-px')}
			></div>
		</div>
	);
};
