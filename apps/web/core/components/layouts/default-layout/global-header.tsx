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
				className="relative z-40 flex w-full shrink-0 flex-col border-b bg-background dark:border-[#26272C] dark:bg-dark-high"
			>
				<header className="flex max-h-fit flex-col flex-1 my-auto inset-x-0 w-full min-h-[80px] top-0 h-fit shrink-0 justify-start gap-2 px-8 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-20 bg-white dark:bg-dark-high !mx-0 !nav-items--shadow dark:!shadow-none border-b-[0.5px] dark:border-b-[0.125rem] border-gray-200 relative z-50 dark:border-b-[#26272C]">
					<Navbar
						className="flex items-center justify-end w-full transition-all h-max !mx-0"
						showTimer={showTimer}
						publicTeam={publicTeam || false}
						notFound={notFound || false}
					/>
				</header>
				{mainHeaderSlot ? (
					<div className={cn('w-full border-t dark:border-[#26272C]', mainHeaderSlotClassName)}>
						{mainHeaderSlot}
					</div>
				) : null}
			</div>
		);
	}
);

export default GlobalHeader;
