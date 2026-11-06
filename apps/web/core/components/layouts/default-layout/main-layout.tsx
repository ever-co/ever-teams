'use client';

import { PropsWithChildren, Suspense } from 'react';
import { SidebarProvider, SidebarInset } from '@/core/components/common/sidebar';
import AppContainer from './app-container';
import { useIsInsideLayoutShell } from './layout-shell-context';
import { PageLayout } from './page-layout';
import { LazyAppSidebar } from '@/core/components/optimized-components/common';
import { AppSidebarSkeleton } from '@/core/components/common/skeleton/app-sidebar-skeleton';

type MainLayoutProps = PropsWithChildren<{
	title?: string;
	showTimer?: boolean;
	publicTeam?: boolean;
	notFound?: boolean;
	className?: string;
	childrenClassName?: string;
	footerClassName?: string;
	breadcrumb?: React.ReactNode;
	mainHeaderSlot?: React.ReactNode;
	mainHeaderSlotClassName?: string;
	isFooterFixed?: boolean;
}>;

/**
 * Backward-compatible layout entry point for routes outside LayoutShell.
 * PageLayout owns page chrome and the single content scroller in both modes.
 */
export function MainLayout({ children, ...pageProps }: MainLayoutProps) {
	const isInsideShell = useIsInsideLayoutShell();
	const pageContent = <PageLayout {...pageProps}>{children}</PageLayout>;
	const isPublicTeam = pageProps.publicTeam || false;

	if (isInsideShell) {
		return pageContent;
	}

	return (
		<AppContainer title={pageProps.title}>
			<SidebarProvider className="h-dvh min-h-0 w-full">
				<Suspense fallback={<AppSidebarSkeleton />}>
					<LazyAppSidebar publicTeam={isPublicTeam} />
				</Suspense>
				<SidebarInset>{pageContent}</SidebarInset>
			</SidebarProvider>
		</AppContainer>
	);
}
