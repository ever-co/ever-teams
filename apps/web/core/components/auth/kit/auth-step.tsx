'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ResizingPanel } from '@/core/components/common/resizing-panel';
import { prefersReducedMotion } from '@/core/lib/utils/motion';

export type Travel = 'forward' | 'backward';

const TRAVEL_DISTANCE: Record<Travel, string> = {
	forward: '6px',
	backward: '-6px'
};

const ARRIVAL_TIMING: KeyframeAnimationOptions = { duration: 220, easing: 'cubic-bezier(0.2, 0, 0, 1)' };

function travelBetween(fromOrder: number, toOrder: number): Travel {
	if (toOrder < fromOrder) {
		return 'backward';
	}
	return 'forward';
}

function arrivalKeyframesOf(travel: Travel): Keyframe[] {
	const distance = TRAVEL_DISTANCE[travel];
	return [
		{ opacity: 0, filter: 'blur(4px)', transform: `translateX(${distance})` },
		{ opacity: 1, filter: 'blur(0)', transform: 'translateX(0)' }
	];
}

/** The arrival of a step that stays mounted while hidden (a form whose fields must keep their state). */
export function playStepArrival(element: HTMLElement | null, travel: Travel) {
	if (!element) {
		return;
	}
	if (prefersReducedMotion()) {
		return;
	}
	const keyframes = arrivalKeyframesOf(travel);
	element.animate(keyframes, ARRIVAL_TIMING);
}

export function AuthSteps({ step, order, children }: Readonly<{ step: string; order: number; children: ReactNode }>) {
	const contentRef = useRef<HTMLDivElement>(null);
	const [shown, setShown] = useState<{ step: string; order: number; travel: Travel | null }>({
		step,
		order,
		travel: null
	});

	if (shown.step !== step) {
		const travel = travelBetween(shown.order, order);
		setShown({ step, order, travel });
	}

	useEffect(() => {
		if (!shown.travel) {
			return;
		}
		playStepArrival(contentRef.current, shown.travel);
	}, [shown]);

	return (
		<div className="-m-1">
			<ResizingPanel>
				<div ref={contentRef} key={shown.step} className="p-1">
					{children}
				</div>
			</ResizingPanel>
		</div>
	);
}
