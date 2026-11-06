'use client';

import type { ReactNode } from 'react';
import { cn } from '@/core/lib/helpers';

/** Emil Kowalski's strong ease-out: the change starts at once and settles softly. */
const SWAP =
	'transition-[opacity,filter,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-opacity';

const SHOWN = 'opacity-100 blur-0';
const HIDDEN = 'pointer-events-none opacity-0 blur-[2px]';

function swapStateOf(isShown: boolean) {
	if (isShown) {
		return SHOWN;
	}
	return HIDDEN;
}

function iconStateOf(isShown: boolean) {
	if (isShown) {
		return 'scale-100';
	}
	return 'scale-[0.6]';
}

function textStateOf(isShown: boolean) {
	if (isShown) {
		return 'translate-y-0';
	}
	return 'translate-y-0.5';
}

function movementOf(kind: 'icon' | 'text') {
	if (kind === 'icon') {
		return iconStateOf;
	}
	return textStateOf;
}

/**
 * Two versions of the same place on the page (a glyph, a sentence, a label), stacked in one grid cell: the cell keeps
 * the size of the larger one, so nothing around it moves while one fades into the other.
 */
export function AuthSwap({
	showsFirst,
	first,
	second,
	kind,
	className
}: Readonly<{ showsFirst: boolean; first: ReactNode; second: ReactNode; kind: 'icon' | 'text'; className?: string }>) {
	const stateOf = movementOf(kind);
	const showsSecond = !showsFirst;

	return (
		<span className={cn('grid', className)}>
			<span
				aria-hidden={showsSecond || undefined}
				className={cn('col-start-1 row-start-1', SWAP, swapStateOf(showsFirst), stateOf(showsFirst))}
			>
				{first}
			</span>
			<span
				aria-hidden={showsFirst || undefined}
				className={cn('col-start-1 row-start-1', SWAP, swapStateOf(showsSecond), stateOf(showsSecond))}
			>
				{second}
			</span>
		</span>
	);
}

function revealRowsOf(isOpen: boolean) {
	if (isOpen) {
		return 'grid-rows-[1fr]';
	}
	return 'grid-rows-[0fr]';
}

function revealContentOf(isOpen: boolean) {
	if (isOpen) {
		return 'opacity-100 blur-0 translate-y-0';
	}
	return 'opacity-0 blur-[2px] -translate-y-1';
}

/**
 * The part only one method needs (the password and its notices): its row grows from nothing and its content clears
 * in, so the fields above never move and the button below slides down with the row. Inert while closed.
 */
export function AuthReveal({ isOpen, children }: Readonly<{ isOpen: boolean; children: ReactNode }>) {
	return (
		<div
			inert={!isOpen}
			className={cn(
				'grid transition-[grid-template-rows] duration-250 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none',
				revealRowsOf(isOpen)
			)}
		>
			<div className="-mx-1 -mb-1 min-h-0 overflow-hidden px-1 pb-1">
				<div className={cn('flex flex-col gap-5 pt-5', SWAP, revealContentOf(isOpen))}>{children}</div>
			</div>
		</div>
	);
}
