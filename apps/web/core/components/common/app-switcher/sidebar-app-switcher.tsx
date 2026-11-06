'use client';

import { useSidebar } from '@/core/components/common/sidebar';
import { useAppSwitcherPlacement } from '@/core/hooks/common/use-app-switcher-placement';
import { AppSwitcherMenu } from './app-switcher-menu';

/** The rail is not drawn on phones, so its users find the button here, in the sidebar sheet. */
export function SidebarAppSwitcher() {
	const { isMobile, state } = useSidebar();
	const placement = useAppSwitcherPlacement();
	const isSidebarPicked = placement === 'sidebar';
	const isRailOnPhone = placement === 'rail' && isMobile;
	const showsButton = isSidebarPicked || isRailOnPhone;

	if (!showsButton) {
		return null;
	}

	const isCollapsedToIcons = state === 'collapsed' && !isMobile;
	let side: 'bottom' | 'right' = 'bottom';
	if (isCollapsedToIcons) {
		side = 'right';
	}

	return <AppSwitcherMenu side={side} align="start" size="icon-sm" className="shrink-0" />;
}
