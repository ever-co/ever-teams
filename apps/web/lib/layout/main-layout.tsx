'use client';

import { cn } from '@/lib/utils';
import { Toaster, ToastMessageManager } from '@components/ui/toaster';
import { Container, Divider, Meta } from 'lib/components';
import { PropsWithChildren, useRef, ReactNode } from 'react';
import { Footer, Navbar } from '.';
import { useAtomValue } from 'jotai';
import { fullWidthState } from '@app/stores/fullWidth';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@components/app-sidebar';
import MainSidebarTrigger from './MainSidebarTrigger';

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
		<div className="w-full h-full overflow-x-hidden min-w-fit">
			<style jsx global>
				{`
					:root {
						--tw-color-dark--theme: #191a20;
					}
					.mx-8-container {
						${fullWidth
							? `
							margin-left: 2rem;
							margin-right: 2rem;
							`
							: `	--tblr-gutter-x: 1.5rem;
						--tblr-gutter-y: 0;
						width: 100%;
						padding-right: calc(var(--tblr-gutter-x) * 0.5);
						padding-left: calc(var(--tblr-gutter-x) * 0.5);
						margin-right: auto;
						margin-left: auto;`}
					}
				`}
			</style>

			<Meta title={title} />
			<SidebarProvider>
				<AppSidebar publicTeam={publicTeam || false} />

				<SidebarInset>
					<div ref={headerRef} className="min-h-fit h-max">
						<header
							className={cn(
								'flex max-h-fit flex-col flex-1 sticky z-50 my-auto inset-x-0 w-full min-h-[80px] top-0 h-fit shrink-0 justify-start gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 bg-white dark:bg-dark-high  !mx-0 nav-items--shadow dark:border-b-[0.125rem] dark:border-b-[#26272C]',
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
						{mainHeaderSlot ? <div className={cn(mainHeaderSlotClassName)}>{mainHeaderSlot}</div> : null}
					</div>

					<div className={cn('flex flex-1 flex-col gap-4 p-4 h-max pt-5', className)}>
						<MainSidebarTrigger />
						{/* Warning: this is to remove the unwanted double scroll on the Dashboard */}
						<div
							className={cn('min-h-[calc(100vh_-_240px)] h-full flex flex-col flex-1', childrenClassName)}
							style={mainHeaderSlot ? { marginTop: `${headerRef?.current?.offsetHeight}px` } : undefined}
						>
							{children}
						</div>
					</div>
					<Container
						fullWidth={fullWidth}
						className={cn('w-full px-8 mt-auto', fullWidth && '!mx-0', footerClassName)}
					>
						<Divider />
						<Footer className="justify-between w-full px-0 mx-auto" />
					</Container>
				</SidebarInset>
				<Toaster />
				<ToastMessageManager />
			</SidebarProvider>
		</div>
	);
}
