'use client';
import { cn } from '@/core/lib/helpers';
import { PropsWithChildren, useEffect, useRef, useState, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useAtomValue } from 'jotai';
import { fullWidthState } from '@/core/stores/common/full-width';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/core/components/common/resizable';
import { SidebarProvider, SidebarInset } from '@/core/components/common/sidebar';

import { useElementHeight } from '@/core/hooks/common';
import { useActiveTimer } from '@/core/hooks/common/use-active-timer';
import { usePathname } from 'next/navigation';
import { PATH_WITH_MORE_THAN_ONE_TIMER } from '@/core/constants/config/constants';
import AppContainer from './app-container';
import GlobalHeader from './global-header';
import MainSidebarTrigger from './main-sidebar-trigger';
import GlobalFooter from './global-footer';

// Lazy load AppSidebar for performance optimization
import { AppSidebarSkeleton } from '@/core/components/common/skeleton/app-sidebar-skeleton';

const LazyAppSidebar = dynamic(() => import('../app-sidebar').then((mod) => ({ default: mod.AppSidebar })), {
	loading: () => <AppSidebarSkeleton />,
	ssr: false // Client-only to avoid hydration issues with heavy hooks
});

/**
 * Props interface for the MainLayout component
 * @interface MainLayoutProps
 */
type Props = PropsWithChildren<{
	/** Page title - updates both document title and header */
	title?: string;

	/** Displays a timer in the header - useful for timed features */
	showTimer?: boolean;

	/** Enables public team mode with specific layout adjustments */
	publicTeam?: boolean;

	/** Indicates if the current route is a 404 page */
	notFound?: boolean;

	/** Additional CSS classes for the main container */
	className?: string;

	/** Additional CSS classes for the children wrapper */
	childrenClassName?: string;

	/** Additional CSS classes for the footer */
	footerClassName?: string;

	/** Custom content to be rendered in the header slot */
	mainHeaderSlot?: React.ReactNode;

	/** Additional CSS classes for the header slot */
	mainHeaderSlotClassName?: string;

	/** Controls whether the footer is fixed to the bottom */
	isFooterFixed?: boolean;
}>;

/**
 * MainLayout - A responsive layout component with resizable sidebar
 *
 * This component serves as the main layout structure for the application,
 * providing a consistent layout with header, footer, and resizable sidebar.
 * It handles complex layout calculations and provides a robust structure
 * for content organization.
 *
 * @component
 * @example
 * // Basic usage
 * <MainLayout title="Dashboard">
 *   <DashboardContent />
 * </MainLayout>
 *
 * @example
 * // Advanced usage with custom header content and fixed footer
 * <MainLayout
 *   title="Analytics"
 *   showTimer={true}
 *   isFooterFixed={true}
 *   mainHeaderSlot={<AnalyticsHeader />}
 * >
 *   <AnalyticsContent />
 * </MainLayout>
 *
 * * USAGE NOTES:
 *
 * 1. Content Height Management:
 *    The layout automatically handles content height calculations.
 *    Avoid setting fixed heights on direct children.
 *
 *    @example
 *    // Correct usage
 *    <MainLayout>
 *      <div className="h-full">Content</div>
 *    </MainLayout>
 *
 *    // Avoid
 *    <MainLayout>
 *      <div style={{ height: '100vh' }}>Content</div>
 *    </MainLayout>
 *
 * 2. Scroll Behavior:
 *    The component implements custom scrolling.
 *    Don't add additional scroll containers.
 *
 * 3. Header Customization:
 *    Use `mainHeaderSlot` for custom header content.
 *    This ensures proper layout integration.
 *
 *
 */
export function MainLayout({
	children,
	title,
	publicTeam,
	notFound,
	className,
	childrenClassName,
	mainHeaderSlot,
	isFooterFixed = false,
	mainHeaderSlotClassName = '',
	footerClassName = ''
}: Props) {
	// Global state for full-width mode
	const fullWidth = useAtomValue(fullWidthState);

	const [shouldRenderTimer, setShouldRenderTimer] = useState(false);
	const { activeTimer, setActiveTimer } = useActiveTimer();
	const path = usePathname();
	// Refs for dynamic height calculations
	const headerRef = useRef<HTMLDivElement>(null);
	const footerRef = useRef<HTMLDivElement>(null);
	const headerHeight = useElementHeight<HTMLDivElement | null>(headerRef);
	const footerHeight = useElementHeight<HTMLDivElement | null>(footerRef);
	useEffect(() => {
		if (!headerHeight) return;

		// Verify if the page has potentially more than one timer using precise matching
		const hasMultipleTimers = PATH_WITH_MORE_THAN_ONE_TIMER.some((p: string) => {
			if (p === '/') {
				return path === '/'; // Exact match for the home page
			}
			return path.startsWith(p); // Match for paths that start with the pattern
		});

		// If the page has multiple timers, only show the timer navbar when the header is reduced
		// Otherwise, always show the timer navbar
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
		<AppContainer title={title}>
			<SidebarProvider className="flex-1 w-full h-full">
				{/* Left sidebar structure implementation - Lazy loaded for performance */}
				<Suspense fallback={<AppSidebarSkeleton />}>
					<LazyAppSidebar publicTeam={publicTeam || false} />
				</Suspense>
				{/* Layout content structure implementation */}
				<SidebarInset className="relative flex-1 overflow-x-hidden !h-full !w-full">
					<ResizablePanelGroup direction="vertical" className="min-h-full">
						<GlobalHeader
							ref={headerRef}
							fullWidth={fullWidth}
							showTimer={shouldRenderTimer && activeTimer}
							publicTeam={publicTeam || false}
							notFound={notFound || false}
							mainHeaderSlot={mainHeaderSlot}
							mainHeaderSlotClassName={mainHeaderSlotClassName}
						/>

						<ResizableHandle withHandle />
						{/* </Container> */}
						<ResizablePanel
							defaultSize={75}
							className="!overflow-y-auto custom-scrollbar w-full min-h-svh h-full"
							style={{
								flexGrow: 0,
								flexShrink: 0,
								flexBasis: 'auto',
								minHeight: '90svh'
							}}
						>
							<div className={cn('flex-1 p-4 w-full h-full', className)}>
								<MainSidebarTrigger />
								{/* Warning: this is to remove the unwanted double scroll on the Dashboard */}
								<div
									className={cn(
										'min-h-[calc(100vh_-_240px)] h-full w-full flex-1 overflow-x-hidden',
										childrenClassName
									)}
									style={{
										/*
								marginTop: `${headerRef?.current?.offsetHeight ? headerRef.current.offsetHeight : 95}px`,*/
										marginBottom: `${isFooterFixed ? footerHeight : 0}px`
									}}
								>
									{headerHeight && (
										<div
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
				</SidebarInset>
			</SidebarProvider>
		</AppContainer>
	);
}
