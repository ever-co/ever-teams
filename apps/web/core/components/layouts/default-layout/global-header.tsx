'use client';
import React, { forwardRef } from 'react';
import { Navbar } from '.';
import { cn } from '@/core/lib/helpers';
import MainSidebarTrigger from './main-sidebar-trigger';

export interface GlobalHeaderProps {
	showTimer?: boolean;
	/** In the timer's place, why a member whose time tracking is turned off has none. */
	showTrackingOff?: boolean;
	publicTeam?: boolean;
	notFound?: boolean;
	breadcrumb?: React.ReactNode;
	mainHeaderSlot: React.ReactNode;
	mainHeaderSlotClassName?: string;
	/** A notice for the whole page, between the bar and the toolbar band, so it never splits the band from its rows. */
	notice?: React.ReactNode;
	/** The notice's box, measured apart: the page's timer rule reads the header without it. */
	noticeRef?: React.Ref<HTMLDivElement>;
}

/**
 * The top of the shell panel: one 44px bar with the page's breadcrumb at its start and the global
 * controls at its end, then the page's own toolbar band when it has one.
 */
const GlobalHeader = forwardRef<HTMLDivElement, GlobalHeaderProps>(function GlobalHeader(
	{
		showTimer,
		showTrackingOff,
		publicTeam,
		notFound,
		breadcrumb,
		mainHeaderSlot,
		mainHeaderSlotClassName,
		notice,
		noticeRef
	},
	ref
) {
	const hasToolbar = Boolean(mainHeaderSlot);
	const hasNotice = Boolean(notice);

	return (
		<div ref={ref} className="relative z-40 flex w-full shrink-0 flex-col bg-background">
			<header className="flex h-11 min-h-11 w-full shrink-0 items-center gap-3 hairline-b border-border px-4">
				<div className="flex min-w-0 flex-1 items-center gap-2">
					<MainSidebarTrigger />
					{breadcrumb && <div className="min-w-0 flex-1">{breadcrumb}</div>}
				</div>
				<Navbar
					className="flex shrink-0 items-center"
					showTimer={showTimer}
					showTrackingOff={showTrackingOff}
					publicTeam={publicTeam || false}
					notFound={notFound || false}
				/>
			</header>
			{hasNotice && (
				// No padding on the measured box: ResizeObserver's contentRect would leave it out of the notice's height
				<div ref={noticeRef} data-slot="header-notice">
					{/* `empty:hidden`: a notice that has nothing to say renders nothing, and leaves no gap */}
					<div className="w-full px-4 pt-3 empty:hidden">{notice}</div>
				</div>
			)}
			{hasToolbar && (
				<div className={cn('w-full hairline-b border-border', mainHeaderSlotClassName)}>{mainHeaderSlot}</div>
			)}
		</div>
	);
});

export default GlobalHeader;
