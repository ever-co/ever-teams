'use client';

import { useSidebar } from '@/core/components/common/sidebar';
import { EverStar } from '@/core/components/icons/ever-star';
import { useAppSwitcherPlacement } from '@/core/hooks/common/use-app-switcher-placement';
import { AppSwitcherMenu } from './app-switcher-menu';

/**
 * The Ever mark at the head of the sidebar (spec A2). Where the App Launcher sits in the sidebar, the mark opens it;
 * where it sits in the top bar or the rail, the mark stays, plain. The rail is not drawn on phones, so its users
 * find the launcher here, in the sidebar sheet. A deployment that links no other app shows no mark at all.
 */
export function SidebarAppSwitcher() {
	const { isMobile, state } = useSidebar();
	const placement = useAppSwitcherPlacement();
	const isSidebarPicked = placement === 'sidebar';
	const isRailOnPhone = placement === 'rail' && isMobile;
	const opensLauncher = isSidebarPicked || isRailOnPhone;

	if (placement === null) {
		return null;
	}

	if (!opensLauncher) {
		return (
			<span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center">
				<EverStar className="size-5 motion-safe:animate-[spin_9s_linear_infinite]" />
			</span>
		);
	}

	const isCollapsedToIcons = state === 'collapsed' && !isMobile;
	let side: 'bottom' | 'right' = 'bottom';
	if (isCollapsedToIcons) {
		side = 'right';
	}

	return <AppSwitcherMenu side={side} align="start" size="icon-sm" trigger="mark" className="shrink-0" />;
}
