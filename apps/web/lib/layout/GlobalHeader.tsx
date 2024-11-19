/* eslint-disable react/display-name */
import React, { forwardRef, LegacyRef, useState } from 'react';
import { Navbar } from '.';
import { cn } from '../utils';
import { useSidebar } from '@components/ui/sidebar';
import { ResizableHandle, ResizablePanel } from '@components/ui/resizable';
export interface GlobalHeaderProps {
	fullWidth?: boolean;
	showTimer?: boolean;
	publicTeam?: boolean;
	notFound?: boolean;
	mainHeaderSlot: React.ReactNode;
	mainHeaderSlotClassName?: string;
}
const GlobalHeader = forwardRef(
	(
		{ fullWidth, showTimer, publicTeam, notFound, mainHeaderSlot, mainHeaderSlotClassName }: GlobalHeaderProps,
		ref
	) => {
		const { state } = useSidebar();
		const [headerSize, setHeaderSize] = useState(10);
		return (
			<div
				ref={ref as LegacyRef<HTMLDivElement>}
				className={cn(
					'fixed flex flex-col top-0 left-0 right-0 z-50 bg-white border-b min-h-fit shrink-0 h-max bg-background ',
					`!lg:pl-[${state === 'expanded' ? '--sidebar-width' : '--sidebar-width-icon'}]`,
					`!lg:pl-[var(${state === 'expanded' ? '--sidebar-width' : '--sidebar-width-icon'})]`
				)}
				style={{
					paddingLeft: `var(${state === 'expanded' ? '--sidebar-width' : '--sidebar-width-icon'})`
				}}
			>
				<header
					className={cn(
						'flex max-h-fit flex-col flex-1  my-auto inset-x-0 w-full min-h-[80px] top-0 h-fit shrink-0 justify-start gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-20 bg-white dark:bg-dark-high !mx-0 !nav-items--shadow dark:!shadow-none border-b-[0.5px] dark:border-b-[0.125rem] border-gray-200 relative z-50 dark:border-b-[#26272C]',
						!fullWidth ? 'lg:px-8' : 'px-8'
					)}
				>
					<Navbar
						className={cn(
							'flex items-center justify-end w-full transition-all h-max',
							!fullWidth ? 'x-container mx-auto' : '!mx-0'
						)}
						showTimer={showTimer}
						publicTeam={publicTeam || false}
						notFound={notFound || false}
					/>
				</header>
				{mainHeaderSlot ? (
					<ResizablePanel
						defaultSize={30}
						className={cn(
							headerSize < 20 ? '!overflow-hidden h-fit' : '!overflow-visible',
							'dark:bg-dark-high border-b-[0.125rem] dark:border-[#26272C]'
						)}
						onResize={(size) => setHeaderSize(size)}
					>
						<div className={cn('flex-1 w-full', mainHeaderSlotClassName)}>{mainHeaderSlot}</div>
					</ResizablePanel>
				) : null}
				<ResizableHandle withHandle />
			</div>
		);
	}
);

export default GlobalHeader;
