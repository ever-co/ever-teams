'use client';
import React, { forwardRef, LegacyRef } from 'react';
import { Navbar } from '.';
import { cn } from '@/core/lib/helpers';
export interface GlobalHeaderProps {
	showTimer?: boolean;
	publicTeam?: boolean;
	notFound?: boolean;
	mainHeaderSlot: React.ReactNode;
	mainHeaderSlotClassName?: string;
}
const GlobalHeader = forwardRef(
	({ showTimer, publicTeam, notFound, mainHeaderSlot, mainHeaderSlotClassName }: GlobalHeaderProps, ref) => {
		return (
			<div
				ref={ref as LegacyRef<HTMLDivElement>}
				className="relative z-40 flex w-full shrink-0 flex-col border-b border-border bg-background"
			>
				<header className="relative z-50 flex h-16 min-h-16 w-full shrink-0 items-center bg-background px-6">
					<Navbar
						className="flex w-full items-center"
						showTimer={showTimer}
						publicTeam={publicTeam || false}
						notFound={notFound || false}
					/>
				</header>
				{mainHeaderSlot ? (
					<div className={cn('w-full border-t border-border', mainHeaderSlotClassName)}>
						{mainHeaderSlot}
					</div>
				) : null}
			</div>
		);
	}
);

export default GlobalHeader;
