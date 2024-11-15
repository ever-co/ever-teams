'use client';
import { cn } from '@/lib/utils';
import { PropsWithChildren, useRef, ReactNode } from 'react';
import { useAtomValue } from 'jotai';
import { fullWidthState } from '@app/stores/fullWidth';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@components/app-sidebar';
import MainSidebarTrigger from './MainSidebarTrigger';
import AppContainer from './AppContainer';
import GlobalHeader from './GlobalHeader';
import GlobalFooter from './GlobalFooter';

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
	isFooterFixed?: boolean;
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
	isFooterFixed = false,
	mainHeaderSlotClassName = '',
	footerClassName = ''
}: Props) {
	const fullWidth = useAtomValue(fullWidthState);
	const headerRef = useRef<HTMLDivElement>(null);
	const footerRef = useRef<HTMLDivElement>(null);

	return (
		<AppContainer title={title}>
			<SidebarProvider className="w-full h-full">
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

					<div className={cn('flex flex-1 flex-col gap-4 p-4', className)}>
						<MainSidebarTrigger />
						{/* Warning: this is to remove the unwanted double scroll on the Dashboard */}
						<div
							className={cn('min-h-[calc(100vh_-_240px)] h-full flex flex-col flex-1', childrenClassName)}
							style={{
								marginTop: `${headerRef?.current?.offsetHeight ? headerRef.current.offsetHeight : 95}px`,
								marginBottom: `${isFooterFixed ? (footerRef?.current?.offsetHeight ? footerRef.current.offsetHeight : 96) : 0}px`
							}}
						>
							{children}
						</div>
					</div>
					<GlobalFooter
						ref={footerRef}
						fullWidth={fullWidth}
						isFixed={isFooterFixed}
						footerClassName={footerClassName}
					/>
				</SidebarInset>
			</SidebarProvider>
		</AppContainer>
	);
}
