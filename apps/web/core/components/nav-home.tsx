'use client';

import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarTriggerButton,
	useSidebar
} from '@/core/components/common/sidebar';
import { memo } from 'react';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { cn } from '../lib/helpers';
import { isPathActive } from '../lib/utils/navigation-path';
import Link from 'next/link';
import type { NavIcon } from './layouts/nav-main';
import { NAV_ROW_ACTIVE_RECIPE, NAV_ROW_RECIPE } from '@/core/components/layouts/nav-row-recipe';

function ariaCurrentFor(isActive: boolean) {
	if (isActive) {
		return 'page' as const;
	}
	return undefined;
}

export const NavHome = memo(function NavHome({
	homeData
}: {
	homeData: {
		url: string;
		icon: NavIcon;
		title: string;
		selectable: boolean;
		label: string;
		/** What waits behind the entry (unread notifications, unread messages); nothing is shown for 0. */
		badge?: number;
	}[];
}) {
	const t = useTranslations();
	const pathname = usePathname();
	const { state } = useSidebar();
	const isCollapsed = state === 'collapsed';

	return (
		<SidebarGroup>
			<SidebarGroupLabel>{t('sidebar.FORYOU')}</SidebarGroupLabel>
			<SidebarMenu className={cn('w-full gap-y-0.5', isCollapsed && 'items-center gap-y-1')}>
				{homeData.map((item) => {
					const isActive = isPathActive(pathname, item.url);
					return (
						<SidebarMenuItem key={item.label}>
							<SidebarMenuButton
								className={cn(
									NAV_ROW_RECIPE,
									isCollapsed && 'justify-center',
									isActive && NAV_ROW_ACTIVE_RECIPE
								)}
								isActive={isActive}
								asChild
								tooltip={item.title}
							>
								<Link href={item.url} aria-current={ariaCurrentFor(isActive)}>
									{isCollapsed && (
										<SidebarTriggerButton
											variant="ghost"
											className="!p-0 !bg-inherit !text-inherit"
										>
											<item.icon className="size-4" />
										</SidebarTriggerButton>
									)}
									{!isCollapsed && <item.icon className="size-4" />}
									<span className={cn('truncate', isCollapsed && 'hidden')}>{item.title}</span>
									{(item.badge ?? 0) > 0 &&
										(isCollapsed ? (
											<span aria-hidden="true" className="absolute end-1 top-1 size-1.5 rounded-full bg-primary" />
										) : (
											<span className="ms-auto shrink-0 rounded-full bg-primary px-1.5 text-[10px] font-semibold leading-4 tabular-nums text-primary-foreground">
												{(item.badge ?? 0) > 99 ? '99+' : item.badge}
											</span>
										))}
								</Link>
							</SidebarMenuButton>
						</SidebarMenuItem>
					);
				})}
			</SidebarMenu>
		</SidebarGroup>
	);
});
