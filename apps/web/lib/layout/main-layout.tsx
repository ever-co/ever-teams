'use client';
import { cn } from '@/lib/utils';
import { PropsWithChildren, useRef, ReactNode } from 'react';
import { useAtomValue } from 'jotai';
import { fullWidthState } from '@app/stores/fullWidth';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@components/ui/resizable';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@components/app-sidebar';
import MainSidebarTrigger from './MainSidebarTrigger';
import AppContainer from './AppContainer';
import GlobalHeader from './GlobalHeader';
import GlobalFooter from './GlobalFooter';

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
	mainHeaderSlot?: JSX.Element | ReactNode;

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
 *    // ✅ Correct usage
 *    <MainLayout>
 *      <div className="h-full">Content</div>
 *    </MainLayout>
 *
 *    // ❌ Avoid
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
	// Global state for full-width mode
	const fullWidth = useAtomValue(fullWidthState);

	// Refs for dynamic height calculations
	const headerRef = useRef<HTMLDivElement>(null);
	const footerRef = useRef<HTMLDivElement>(null);

	return (
		<AppContainer title={title}>
			<SidebarProvider className="flex-1 w-full h-full">
				{/* Left sidebar structure implementation */}
				<AppSidebar publicTeam={publicTeam || false} />
				{/* Layout content structure implementation */}
				<SidebarInset className="relative flex-1 overflow-x-hidden !h-full !w-full">
					<ResizablePanelGroup direction="vertical" className="min-h-full">
						<GlobalHeader
							ref={headerRef}
							fullWidth={fullWidth}
							showTimer={showTimer}
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
							style={{ flex: 'none', minHeight: '100svh' }}
						>
							<div className={cn('flex-1 p-4 w-full h-full', className)}>
								<MainSidebarTrigger />
								{/* Warning: this is to remove the unwanted double scroll on the Dashboard */}
								<div
									className={cn('min-h-[calc(100vh_-_240px)] h-full flex-1', childrenClassName)}
									style={{
										/*
								marginTop: `${headerRef?.current?.offsetHeight ? headerRef.current.offsetHeight : 95}px`,*/
										marginBottom: `${isFooterFixed ? (footerRef?.current?.offsetHeight ? footerRef.current.offsetHeight : 96) : 0}px`
									}}
								>
									{headerRef?.current?.offsetHeight && (
										<div
											className="w-full"
											style={{
												height: `${headerRef?.current?.offsetHeight ? headerRef.current.offsetHeight + (mainHeaderSlot ? -30 : 0) : 95}px`
											}}
										></div>
									)}

									{children}
								</div>
							</div>
						</ResizablePanel>
						<GlobalFooter
							ref={footerRef}
							fullWidth={fullWidth}
							isFixed={isFooterFixed}
							footerClassName={footerClassName}
						/>
					</ResizablePanelGroup>
				</SidebarInset>
			</SidebarProvider>
		</AppContainer>
	);
}
