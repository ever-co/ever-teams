/* eslint-disable react/display-name */
'use client';
import { forwardRef, LegacyRef } from 'react';

import { cn } from '@/lib/utils';
import { Container, Divider } from 'lib/components';
import { Footer } from '.';
import { useSidebar } from '@components/ui/sidebar';
interface GlobalFooterProps {
	footerClassName?: string;
	fullWidth?: boolean;
	isFixed?: boolean;
}

const GlobalFooter = forwardRef(({ fullWidth, footerClassName, isFixed = false }: GlobalFooterProps, ref) => {
	const { state } = useSidebar();
	return (
		<div
			ref={ref as LegacyRef<HTMLDivElement>}
			className={cn(
				'bg-white dark:bg-[#1e2025] shrink-0 transition-all duration-300 mt-auto',
				footerClassName,
				isFixed
					? `fixed z-50 bottom-0 left-0 right-0 !lg:pl-[${state === 'expanded' ? '--sidebar-width' : '--sidebar-width-icon'}] !lg:pl-[var(${state === 'expanded' ? '--sidebar-width' : '--sidebar-width-icon'})]`
					: ''
			)}
			style={
				isFixed
					? {
							paddingLeft: `var(${state === 'expanded' ? '--sidebar-width' : '--sidebar-width-icon'})`
						}
					: undefined
			}
		>
			<Divider />
			<Container fullWidth={fullWidth} className={cn('w-full px-8 mt-auto', fullWidth && '!mx-0')}>
				<Footer className="justify-between w-full px-0 mx-auto" />
			</Container>
		</div>
	);
});

export default GlobalFooter;
