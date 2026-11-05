'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ResizingPanel } from '@/core/components/common/resizing-panel';
import { prefersReducedMotion } from '@/core/lib/utils/motion';

export type Travel = 'forward' | 'backward';

/** A step inside a page moves a little; a whole page arriving moves a little more, over a little longer. */
export type ArrivalScale = 'step' | 'page';

const TRAVEL_PIXELS: Record<ArrivalScale, number> = {
	step: 6,
	page: 12
};

const ARRIVAL_TIMING: Record<ArrivalScale, KeyframeAnimationOptions> = {
	step: { duration: 220, easing: 'cubic-bezier(0.2, 0, 0, 1)' },
	page: { duration: 300, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' }
};

function travelBetween(fromOrder: number, toOrder: number): Travel {
	if (toOrder < fromOrder) {
		return 'backward';
	}
	return 'forward';
}

function signedDistanceOf(travel: Travel, scale: ArrivalScale) {
	const pixels = TRAVEL_PIXELS[scale];
	if (travel === 'backward') {
		return -pixels;
	}
	return pixels;
}

function arrivalKeyframesOf(travel: Travel, scale: ArrivalScale): Keyframe[] {
	const distance = signedDistanceOf(travel, scale);
	return [
		{ opacity: 0, filter: 'blur(4px)', transform: `translateX(${distance}px)` },
		{ opacity: 1, filter: 'blur(0)', transform: 'translateX(0)' }
	];
}

/** The arrival of a step that stays mounted while hidden (a form whose fields must keep their state). */
export function playStepArrival(element: HTMLElement | null, travel: Travel, scale: ArrivalScale = 'step') {
	if (!element) {
		return;
	}
	if (prefersReducedMotion()) {
		return;
	}
	const keyframes = arrivalKeyframesOf(travel, scale);
	element.animate(keyframes, ARRIVAL_TIMING[scale]);
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
