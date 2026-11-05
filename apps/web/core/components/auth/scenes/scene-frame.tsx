'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/core/lib/helpers';
import { prefersReducedMotion } from '@/core/lib/utils/motion';

const ARRIVAL_KEYFRAMES: Keyframe[] = [
	{ opacity: 0, filter: 'blur(4px)', transform: 'translateY(8px) scale(0.985)' },
	{ opacity: 1, filter: 'blur(0)', transform: 'translateY(0) scale(1)' }
];
const ARRIVAL_TIMING: KeyframeAnimationOptions = { duration: 340, easing: 'cubic-bezier(0.2, 0, 0, 1)' };

/** A bar standing for something not known yet: pressed into the surface, never pulsing (nothing is loading). */
export function SceneBar({ className }: Readonly<{ className?: string }>) {
	return (
		<span
			aria-hidden="true"
			className={cn(
				'block h-2 rounded-full bg-foreground/[0.07] shadow-[inset_0_1px_0_rgb(0_0_0/0.04)] dark:bg-foreground/[0.08]',
				className
			)}
		/>
	);
}

export function SceneDot({ className }: Readonly<{ className?: string }>) {
	return (
		<span aria-hidden="true" className={cn('block size-5 shrink-0 rounded-full bg-foreground/[0.07]', className)} />
	);
}

/** A new `sceneKey` brings the sheet in again; typing inside a scene only updates its text. */
export function AuthScene({
	sceneKey,
	title,
	description,
	children
}: Readonly<{ sceneKey: string; title: ReactNode; description?: ReactNode; children: ReactNode }>) {
	const sheetRef = useRef<HTMLDivElement>(null);
	const previousKey = useRef(sceneKey);

	useEffect(() => {
		if (previousKey.current === sceneKey) {
			return;
		}
		previousKey.current = sceneKey;
		const sheet = sheetRef.current;
		if (!sheet) {
			return;
		}
		if (prefersReducedMotion()) {
			return;
		}
		sheet.animate(ARRIVAL_KEYFRAMES, ARRIVAL_TIMING);
	}, [sceneKey]);

	return (
		<div aria-hidden="true" className="relative flex h-full min-h-[30rem] flex-col overflow-hidden select-none">
			<div className="flex max-w-xs flex-col gap-1 px-8 pt-8">
				<p className="text-[13px] font-medium text-foreground">{title}</p>
				{description && <p className="text-xs text-pretty text-muted-foreground">{description}</p>}
			</div>
			<div ref={sheetRef} className="absolute top-32 right-0 bottom-0 left-8">
				{children}
			</div>
		</div>
	);
}

export function AppSheet({ sidebar, children }: Readonly<{ sidebar: ReactNode; children: ReactNode }>) {
	return (
		<div className="surface-raised flex h-full overflow-hidden rounded-tl-xl">
			<div className="flex w-36 shrink-0 flex-col gap-4 bg-sidebar p-3">{sidebar}</div>
			<div className="flex min-w-0 flex-1 flex-col gap-4 bg-card p-5">{children}</div>
		</div>
	);
}

function navBarWidthOf(row: number) {
	const isEven = row % 2 === 0;
	if (isEven) {
		return 'w-16';
	}
	return 'w-12';
}

export function SceneNavRows({ count = 5 }: Readonly<{ count?: number }>) {
	const rows = Array.from({ length: count }, (_, index) => index);
	return (
		<div className="flex flex-col gap-3 px-1">
			{rows.map((row) => (
				<div key={row} className="flex items-center gap-2">
					<span className="size-3 shrink-0 rounded-[4px] bg-foreground/[0.07]" />
					<SceneBar className={cn('h-1.5', navBarWidthOf(row))} />
				</div>
			))}
		</div>
	);
}

export function MailSheet({ children }: Readonly<{ children: ReactNode }>) {
	return (
		<div className="surface-raised flex h-full flex-col overflow-hidden rounded-tl-xl bg-card">
			<div className="flex items-center gap-2 bg-sidebar px-4 py-3">
				<SceneBar className="h-1.5 w-14" />
				<SceneBar className="h-1.5 w-10" />
			</div>
			<div className="flex flex-col gap-4 p-5">{children}</div>
		</div>
	);
}
