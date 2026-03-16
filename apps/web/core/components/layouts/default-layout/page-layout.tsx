'use client';

import { cn } from '@/core/lib/helpers';
import { PropsWithChildren, useEffect, useRef, useState } from 'react';
import { useAtomValue } from 'jotai';
import { fullWidthState } from '@/core/stores/common/full-width';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/core/components/common/resizable';
import { useElementHeight } from '@/core/hooks/common';
import { useActiveTimer } from '@/core/hooks/common/use-active-timer';
import { usePathname } from 'next/navigation';
import { APP_NAME, PATH_WITH_MORE_THAN_ONE_TIMER, APPLICATION_LANGUAGES_CODE } from '@/core/constants/config/constants';
import GlobalHeader from './global-header';
import MainSidebarTrigger from './main-sidebar-trigger';
import GlobalFooter from './global-footer';

/**
 * Props for the PageLayout component.
 * Contains only page-specific layout concerns (no sidebar, no providers).
 */
type PageLayoutProps = PropsWithChildren<{
	/** Page title — updates the browser tab via document.title (format: "title | APP_NAME") */
	title?: string;
	/** Displays a timer in the header */
	showTimer?: boolean;
	/** Public team mode flag (passed to GlobalHeader) */
	publicTeam?: boolean;
	/** 404 page indicator */
	notFound?: boolean;
	/** Additional CSS classes for the main container */
	className?: string;
	/** Additional CSS classes for the children wrapper */
	childrenClassName?: string;
	/** Additional CSS classes for the footer */
	footerClassName?: string;
	/** Custom content rendered in the header slot */
	mainHeaderSlot?: React.ReactNode;
	/** Additional CSS classes for the header slot */
	mainHeaderSlotClassName?: string;
	/** Controls whether the footer is fixed to the bottom */
	isFooterFixed?: boolean;
}>;

/**
 * PageLayout — Page-specific layout content (header, resizable panels, footer).
 *
 * This component is designed to be used INSIDE LayoutShell.
 * LayoutShell provides the persistent sidebar and container.
 * PageLayout provides the per-page content that changes on navigation.
 *
 * @example
 * // In a page.tsx file:
 * <PageLayout showTimer mainHeaderSlot={<MyHeader />}>
 *   <PageContent />
 * </PageLayout>
 */
export function PageLayout({
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
}: PageLayoutProps) {
	const fullWidth = useAtomValue(fullWidthState);

	const [shouldRenderTimer, setShouldRenderTimer] = useState(false);
	const { activeTimer, setActiveTimer } = useActiveTimer();
	const path = usePathname();

	const headerRef = useRef<HTMLDivElement>(null);
	const footerRef = useRef<HTMLDivElement>(null);
	const headerHeight = useElementHeight<HTMLDivElement | null>(headerRef);
	const footerHeight = useElementHeight<HTMLDivElement | null>(footerRef);

	// Update browser tab title when `title` prop changes (restores on unmount)
	useEffect(() => {
		if (!title) return;

		const previousTitle = document.title;
		document.title = `${title} | ${APP_NAME}`;

		return () => {
			document.title = previousTitle;
		};
	}, [title]);

	useEffect(() => {
		if (!headerHeight) return;

		const normalizedPath = (() => {
			const segments = path.split('/').filter(Boolean);
			if (segments.length > 0 && APPLICATION_LANGUAGES_CODE.includes(segments[0])) {
				return '/' + segments.slice(1).join('/');
			}
			return path;
		})();

		const hasMultipleTimers = PATH_WITH_MORE_THAN_ONE_TIMER.some((p: string) => {
			if (p === '/') {
				return normalizedPath === '/' || normalizedPath === '';
			}
			return normalizedPath.startsWith(p);
		});

		const shouldActivateTimer = !hasMultipleTimers || headerHeight <= 100;

		setActiveTimer((prev) => {
			if (prev !== shouldActivateTimer) {
				return shouldActivateTimer;
			}
			return prev;
		});
		setShouldRenderTimer(true);
	}, [path, headerHeight, mainHeaderSlot]);

	return (
		<>
			<ResizablePanelGroup direction="vertical" className="min-h-full">
				<GlobalHeader
					ref={headerRef}
					fullWidth={fullWidth}
					showTimer={(shouldRenderTimer && activeTimer) || showTimer}
					publicTeam={publicTeam || false}
					notFound={notFound || false}
					mainHeaderSlot={mainHeaderSlot}
					mainHeaderSlotClassName={mainHeaderSlotClassName}
				/>

				<ResizableHandle withHandle />
				<ResizablePanel
					defaultSize={75}
					className="overflow-y-auto! custom-scrollbar w-full min-h-svh h-full"
					style={{
						flexGrow: 0,
						flexShrink: 0,
						flexBasis: 'auto',
						minHeight: '90svh'
					}}
				>
					<div className={cn('flex-1 p-4 w-full h-full', className)}>
						<MainSidebarTrigger />
						<div
							className={cn(
								'overflow-x-hidden flex-1 w-full h-full min-h-[calc(100vh-240px)]',
								childrenClassName
							)}
							style={{
								marginBottom: `${isFooterFixed ? footerHeight : 0}px`
							}}
						>
							{headerHeight && (
								<div
									data-layout="main-scroll-offset"
									className="w-full"
									style={{
										height: `${headerHeight + (mainHeaderSlot ? -30 : 0)}px`
									}}
								></div>
							)}
							{children}
						</div>
					</div>
				</ResizablePanel>
			</ResizablePanelGroup>
			<GlobalFooter
				ref={footerRef}
				fullWidth={fullWidth}
				isFixed={isFooterFixed}
				footerClassName={footerClassName}
			/>
		</>
	);
}
