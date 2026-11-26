'use client';

import { PropsWithChildren, Suspense } from 'react';
import { SidebarProvider, SidebarInset } from '@/core/components/common/sidebar';
import { LazyAppSidebar, LazyEverSiPanel } from '@/core/components/optimized-components/common';
import { AppSidebarSkeleton } from '@/core/components/common/skeleton/app-sidebar-skeleton';
import AppContainer from './app-container';
import { LayoutShellContext } from './layout-shell-context';
import { publicState } from '@/core/stores';
import { useAtomValue } from 'jotai';

/**
 * The persistent shell of the (main) route group: the sidebar sits on the window background and
 * every page renders inside one rounded panel beside it, so a navigation only swaps the panel's
 * content. Ever SI, when open, is a panel of its own between the two. Mounted once in
 * `app/[locale]/(main)/layout.tsx`.
 */
export function LayoutShell({ children }: PropsWithChildren) {
	const publicTeam = useAtomValue(publicState);
	const isPublicTeam = publicTeam || false;

	return (
		<LayoutShellContext.Provider value={true}>
			<AppContainer>
				<SidebarProvider className="h-dvh min-h-0 w-full">
					<Suspense fallback={<AppSidebarSkeleton />}>
						<LazyAppSidebar publicTeam={isPublicTeam} />
					</Suspense>

					<LazyEverSiPanel publicTeam={isPublicTeam} />

					<SidebarInset>{children}</SidebarInset>
				</SidebarProvider>
			</AppContainer>
		</LayoutShellContext.Provider>
	);
}
