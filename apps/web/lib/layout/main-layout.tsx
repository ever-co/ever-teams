'use client';

import { cn } from '@/lib/utils';
import { Container, Divider } from 'lib/components';
import { PropsWithChildren, useRef, ReactNode } from 'react';
import { Footer } from '.';
import { useAtomValue } from 'jotai';
import { fullWidthState } from '@app/stores/fullWidth';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@components/app-sidebar';
import MainSidebarTrigger from './MainSidebarTrigger';
import AppContainer from './AppContainer';
import GlobalHeader from './GlobalHeader';

type Props = PropsWithChildren<{
	title?: string;
	showTimer?: boolean;
	publicTeam?: boolean;
	notFound?: boolean;
	className?: string;
	childrenClassName?: string;
	footerClassName?: string;
	mainHeaderSlot?: JSX.Element | ReactNode;
	mainHeaderSlotClassName?: string;
}>;

export function MainLayout({
	children,
	title,
	showTimer,
	publicTeam,
	notFound,
	className,
	childrenClassName,
	mainHeaderSlot,
	mainHeaderSlotClassName = '',
	footerClassName = ''
}: Props) {
	const fullWidth = useAtomValue(fullWidthState);
	const headerRef = useRef<HTMLDivElement>(null);

	return (
		<AppContainer title={title}>
			<SidebarProvider>
				<AppSidebar publicTeam={publicTeam || false} />

				<SidebarInset className="relative flex-1 overflow-x-hidden">
					<GlobalHeader
						ref={headerRef}
						fullWidth={fullWidth}
						showTimer={showTimer}
						publicTeam={publicTeam || false}
						notFound={notFound || false}
						mainHeaderSlot={mainHeaderSlot}
						mainHeaderSlotClassName={mainHeaderSlotClassName}
					/>

					<div
						className={cn('flex flex-1 flex-col gap-4 p-4 pt-20', className)}
						style={{
							paddingTop: `${headerRef?.current?.offsetHeight ? headerRef.current.offsetHeight + 25 : 115}px`
						}}
					>
						<MainSidebarTrigger />
						{/* Warning: this is to remove the unwanted double scroll on the Dashboard */}
						<div
							className={cn('min-h-[calc(100vh_-_240px)] h-full flex flex-col flex-1', childrenClassName)}
							style={
								mainHeaderSlot && headerRef.current
									? { marginTop: `${headerRef.current.offsetHeight}px` }
									: undefined
							}
						>
							{children}
						</div>
					</div>
					<div className={cn('bg-white dark:bg-[#1e2025]', footerClassName)}>
						<Container fullWidth={fullWidth} className={cn('w-full px-8 mt-auto', fullWidth && '!mx-0')}>
							<Divider />
							<Footer className="justify-between w-full px-0 mx-auto" />
						</Container>
					</div>
				</SidebarInset>
			</SidebarProvider>
		</AppContainer>
	);
}
