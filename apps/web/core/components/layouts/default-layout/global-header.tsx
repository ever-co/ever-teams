'use client';
import React, { forwardRef } from 'react';
import { Navbar } from '.';
import { cn } from '@/core/lib/helpers';
import MainSidebarTrigger from './main-sidebar-trigger';

export interface GlobalHeaderProps {
	showTimer?: boolean;
	publicTeam?: boolean;
	notFound?: boolean;
	breadcrumb?: React.ReactNode;
	mainHeaderSlot: React.ReactNode;
	mainHeaderSlotClassName?: string;
}

/**
 * The top of the shell panel: one 44px bar with the page's breadcrumb at its start and the global
 * controls at its end, then the page's own toolbar band when it has one.
 */
const GlobalHeader = forwardRef<HTMLDivElement, GlobalHeaderProps>(function GlobalHeader(
	{ showTimer, publicTeam, notFound, breadcrumb, mainHeaderSlot, mainHeaderSlotClassName },
	ref
) {
	const hasToolbar = Boolean(mainHeaderSlot);

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
					publicTeam={publicTeam || false}
					notFound={notFound || false}
				/>
			</header>
			{hasToolbar && (
				<div className={cn('w-full hairline-b border-border', mainHeaderSlotClassName)}>{mainHeaderSlot}</div>
			)}
		</div>
	);
});

export default GlobalHeader;
