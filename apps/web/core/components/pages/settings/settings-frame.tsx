'use client';

import { PropsWithChildren, ReactNode } from 'react';
import { cn } from '@/core/lib/helpers';

type SettingsFrameProps = PropsWithChildren<{
	navigation: ReactNode;
	className?: string;
}>;

/**
 * Settings: section nav beside the content once there is room for both. The AI chat panel takes part of
 * the width, so the two-column layout starts at a wider viewport while it is open (viewport breakpoints,
 * not container queries: a query container would re-parent the fixed-position overlays of the page).
 */
export function SettingsFrame({ navigation, children, className }: Readonly<SettingsFrameProps>) {
	return (
		<div
			data-testid="settings-frame"
			className={cn(
				'grid w-full grid-cols-1 items-start gap-6',
				'lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-8',
				className
			)}
		>
			<aside className="lg:sticky lg:top-4">{navigation}</aside>
			<section className="min-w-0 pb-8">{children}</section>
		</div>
	);
}
