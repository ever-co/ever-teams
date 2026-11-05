'use client';

import { useLayoutEffect, useRef, type RefObject } from 'react';
import { canAnimate } from '@/core/lib/utils/motion';
import { playStepArrival, type Travel } from './auth-step';

type LeftPage = { order: number; width: number; height: number; leftAt: number };

/**
 * The auth page the person just left. Every auth page mounts its own frame, so the frame itself cannot remember:
 * a client-side navigation keeps this module alive, a fresh load starts without it and nothing moves.
 */
let leftPage: LeftPage | null = null;

/** Where each page sits in the journey: moving to a later page travels forward, coming back travels backward. */
const PAGE_ORDER: Record<string, number> = {
	'/auth/passcode': 0,
	'/auth/password': 1,
	'/auth/forgot-password': 2,
	'/auth/reset-password': 3,
	'/auth/signup': 4,
	'/auth/accept-invite': 5,
	'/auth/workspace': 6,
	'/auth/social-welcome': 7,
	'/delete-account': 8,
	'/delete-account/confirm': 9
};

const LOCALE_PREFIX = /^\/[a-z]{2}(?=\/)/;

/** A page left longer ago than this was not the step before: signing out an hour later must not travel. */
const TRAVEL_WINDOW_MS = 2000;

const RESIZE_TIMING: KeyframeAnimationOptions = { duration: 320, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' };

function pageOrderOf(pathname: string) {
	const path = pathname.replace(LOCALE_PREFIX, '');
	return PAGE_ORDER[path] ?? 0;
}

function travelBetween(fromOrder: number, toOrder: number): Travel {
	if (toOrder < fromOrder) {
		return 'backward';
	}
	return 'forward';
}

function isRecent(previous: LeftPage | null): previous is LeftPage {
	if (!previous) {
		return false;
	}
	const elapsed = performance.now() - previous.leftAt;
	return elapsed < TRAVEL_WINDOW_MS;
}

/** Strict Mode runs the cleanup and the effect again on mount: the record that cleanup left is not a page left. */
function isFromAnotherPage(previous: LeftPage | null, ownLeave: LeftPage | null): previous is LeftPage {
	if (!isRecent(previous)) {
		return false;
	}
	return previous !== ownLeave;
}

function sizeChanged(previous: LeftPage, rect: DOMRect) {
	const widthChanged = Math.abs(previous.width - rect.width) > 1;
	const heightChanged = Math.abs(previous.height - rect.height) > 1;
	return widthChanged || heightChanged;
}

function resizeFrom(frame: HTMLElement, previous: LeftPage, rect: DOMRect) {
	if (!sizeChanged(previous, rect)) {
		return;
	}
	const keyframes = [
		{ width: `${previous.width}px`, height: `${previous.height}px` },
		{ width: `${rect.width}px`, height: `${rect.height}px` }
	];
	// The content keeps its final size while the frame passes through the old one: clip it until the frame catches up
	frame.style.overflow = 'clip';
	const animation = frame.animate(keyframes, RESIZE_TIMING);
	const release = () => {
		frame.style.overflow = '';
	};
	animation.onfinish = release;
	animation.oncancel = release;
}

/**
 * Moving between auth pages (code to password, back to sign in, on to sign up): the frame resizes from the page that
 * was left, the form arrives from the side of the travel. The scene beside it never moves. A first load stays still.
 */
export function useAuthPageTravel({
	frameRef,
	formRef
}: Readonly<{
	frameRef: RefObject<HTMLElement | null>;
	formRef: RefObject<HTMLElement | null>;
}>) {
	const ownLeave = useRef<LeftPage | null>(null);

	useLayoutEffect(() => {
		const frame = frameRef.current;
		if (!frame) {
			return;
		}
		const order = pageOrderOf(window.location.pathname);
		const previous = leftPage;
		leftPage = null;

		const travelsFromAnotherPage = isFromAnotherPage(previous, ownLeave.current) && canAnimate(frame);
		if (travelsFromAnotherPage && previous) {
			const rect = frame.getBoundingClientRect();
			const travel = travelBetween(previous.order, order);
			resizeFrom(frame, previous, rect);
			playStepArrival(formRef.current, travel, 'page');
		}

		return () => {
			const rect = frame.getBoundingClientRect();
			const left = { order, width: rect.width, height: rect.height, leftAt: performance.now() };
			leftPage = left;
			ownLeave.current = left;
		};
	}, [frameRef, formRef]);
}
