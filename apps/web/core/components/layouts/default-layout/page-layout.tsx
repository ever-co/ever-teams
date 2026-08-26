'use client';

import { cn } from '@/core/lib/helpers';
import { PropsWithChildren, useEffect, useRef, useState } from 'react';
import { useElementHeight } from '@/core/hooks/common';
import { useActiveTimer } from '@/core/hooks/common/use-active-timer';
import { usePathname } from 'next/navigation';
import { APP_NAME, PATH_WITH_MORE_THAN_ONE_TIMER, APPLICATION_LANGUAGES_CODE } from '@/core/constants/config/constants';
import GlobalHeader from './global-header';
import MainSidebarTrigger from './main-sidebar-trigger';
import GlobalFooter from './global-footer';
import { PageContentScroller } from './page-content-scroller';

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
	const [shouldRenderTimer, setShouldRenderTimer] = useState(false);
	const { activeTimer, setActiveTimer } = useActiveTimer();
	const path = usePathname();

	const headerRef = useRef<HTMLDivElement>(null);
	const headerHeight = useElementHeight<HTMLDivElement | null>(headerRef);

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
		<div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
			<GlobalHeader
				ref={headerRef}
				showTimer={(shouldRenderTimer && activeTimer) || showTimer}
				publicTeam={publicTeam || false}
				notFound={notFound || false}
				mainHeaderSlot={mainHeaderSlot}
				mainHeaderSlotClassName={mainHeaderSlotClassName}
			/>
			<PageContentScroller
				footer={<GlobalFooter isFixed={false} footerClassName={footerClassName} />}
				footerFixed={isFooterFixed}
			>
				<main className={cn('relative flex min-h-full w-full flex-col p-4', className)}>
					<MainSidebarTrigger />
					<div className={cn('min-h-0 w-full flex-1 overflow-x-hidden', childrenClassName)}>{children}</div>
				</main>
			</PageContentScroller>
		</div>
	);
}
