'use client';

import { PropsWithChildren, Suspense } from 'react';
import { SidebarProvider, SidebarInset } from '@/core/components/common/sidebar';
import { LazyAppSidebar } from '@/core/components/optimized-components/common';
import { AppSidebarSkeleton } from '@/core/components/common/skeleton/app-sidebar-skeleton';
import AppContainer from './app-container';
import { LayoutShellContext } from './layout-shell-context';
import { publicState } from '@/core/stores';
import { useAtomValue } from 'jotai';

/**
 * LayoutShell — Persistent layout wrapper that survives page navigations.
 *
 * Contains everything that should NOT be destroyed/recreated on navigation:
 * - AppContainer (Meta + global styles + ToastMessageManager)
 * - SidebarProvider (sidebar context)
 * - LazyAppSidebar (the heaviest component — projects, favorites, modals)
 * - SidebarInset (content area wrapper)
 *
 * This component is placed in `app/[locale]/(main)/layout.tsx` so it persists
 * across all page navigations within the (main) route group.
 *
 * Each page then uses PageLayout for page-specific content (header, footer, etc.)
 */
export function LayoutShell({ children }: PropsWithChildren) {
	// Derive publicTeam from Jotai atom (set by AppState/InitState)
	// This replaces the prop-based approach from MainLayout
	const publicTeam = useAtomValue(publicState);

	return (
		<LayoutShellContext.Provider value={true}>
			<AppContainer>
				<SidebarProvider className="flex-1 w-full h-full">
					{/* Left sidebar — Lazy loaded, persists across navigations */}
					<Suspense fallback={<AppSidebarSkeleton />}>
						<LazyAppSidebar publicTeam={publicTeam || false} />
					</Suspense>

					{/* Content area — children will be PageLayout from each page */}
					<SidebarInset className="relative flex-1 overflow-x-hidden !h-full !w-full">
						{children}
					</SidebarInset>
				</SidebarProvider>
			</AppContainer>
		</LayoutShellContext.Provider>
	);
}

