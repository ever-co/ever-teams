'use client';
import { useCallbackRef } from '@app/hooks';
import { clsxm } from '@app/utils';
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
				className={clsxm('-z-50 absolute top-0 right-0 w-[1vw] h-[calc(100vh-_296px)]')}
			></div>
		</div>
	);
};
