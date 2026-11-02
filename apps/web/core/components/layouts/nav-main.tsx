'use client';
import { useAtom } from 'jotai';
import { ChevronRight } from '@/core/components/icons/hugeicons';
import { cn } from '@/core/lib/helpers';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/core/components/common/collapsible';
import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuAction,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	SidebarTriggerButton,
	useSidebar
} from '@/core/components/common/sidebar';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { activeMenuIndexState, activeSubMenuIndexState, openMenusState } from '@/core/stores/common/menu';
import { memo, ReactNode } from 'react';
import { isPathActive } from '@/core/lib/utils/navigation-path';
import { NAV_ROW_ACTIVE_RECIPE, NAV_ROW_RECIPE, NAV_SUB_ROW_ACTIVE_RECIPE, NAV_SUB_ROW_RECIPE } from './nav-row-recipe';

export type NavIcon = React.ComponentType<{ className?: string }>;

type NavSubItem = {
	title: string;
	url: string;
	component?: ReactNode;
	icon?: ReactNode;
	/** A count or a state mark at the row's end; it gives way to `actions` under the pointer. */
	trailing?: ReactNode;
	/** Row actions (a "..." menu), outside the link so the row never nests interactive elements. */
	actions?: ReactNode;
};

type NavGroupAction = {
	label: string;
	icon: ReactNode;
	onClick: () => void;
};

type NavItem = {
	title: string;
	url: string;
	selectable: boolean;
	icon: NavIcon;
	isActive?: boolean;
	items?: NavSubItem[];
	/** An action of the whole group, such as creating an item, shown beside its chevron under the pointer. */
	action?: NavGroupAction;
};

/** The current page's row is marked by a short brand segment laid on the group's guide line. */
const CURRENT_SUB_ITEM_MARK =
	'relative before:pointer-events-none before:absolute before:inset-y-1.5 before:-left-[9px] before:w-0.5 before:rounded-full before:bg-primary';

const SUB_ROW_TRAILING = 'ml-auto flex shrink-0 items-center transition-opacity';

/** Under the pointer, on keyboard focus or while its menu is open, a row with actions trades its mark for them. */
const SUB_ROW_TRAILING_YIELDING =
	'group-hover/sub-row:opacity-0 group-focus-within/sub-row:opacity-0 group-has-data-popup-open/sub-row:opacity-0';

const SUB_ROW_LINK_WITH_ACTIONS =
	'group-hover/sub-row:pr-7 group-focus-within/sub-row:pr-7 group-has-data-popup-open/sub-row:pr-7';

const SUB_ROW_ACTIONS =
	'absolute top-1/2 right-1 flex -translate-y-1/2 items-center opacity-0 transition-opacity group-hover/sub-row:opacity-100 group-focus-within/sub-row:opacity-100 has-data-popup-open:opacity-100 max-md:opacity-100';

function matchLength(pathname: string | null, url: string) {
	if (!isPathActive(pathname, url)) {
		return -1;
	}
	const urlPath = url.split('?')[0];
	return urlPath.length;
}

function ariaCurrentFor(isActive: boolean) {
	if (isActive) {
		return 'page' as const;
	}
	return undefined;
}

/** The sub item whose link is the closest match of the current page, so only one of them is highlighted. */
function findActiveSubItemIndex(pathname: string | null, subItems: NavSubItem[] | undefined) {
	let bestIndex = -1;
	let bestLength = -1;
	(subItems ?? []).forEach((subItem, index) => {
		const length = matchLength(pathname, subItem.url);
		if (length > bestLength) {
			bestLength = length;
			bestIndex = index;
		}
	});
	return bestIndex;
}

function isNavItemActive(pathname: string | null, item: NavItem) {
	const isOwnPageActive = item.selectable && isPathActive(pathname, item.url);
	const hasActiveSubItem = findActiveSubItemIndex(pathname, item.items) >= 0;
	return isOwnPageActive || hasActiveSubItem;
}

function NavItemContent({ item, isCollapsed }: { item: NavItem; isCollapsed: boolean }) {
	return (
		<>
			{isCollapsed && (
				<SidebarTriggerButton variant="ghost" className="!p-0 !bg-inherit !text-inherit">
					<item.icon className="size-4" />
				</SidebarTriggerButton>
			)}
			{!isCollapsed && <item.icon className="size-4" />}

			<span className={cn('truncate', isCollapsed && 'hidden')}>{item.title}</span>
		</>
	);
}

export const NavMain = memo(function NavMain({ items }: Readonly<{ items: NavItem[] }>) {
	const t = useTranslations();
	const { state } = useSidebar();
	const pathname = usePathname();
	const isCollapsed = state === 'collapsed';
	const [openMenus, setOpenMenus] = useAtom(openMenusState);
	const [, setActiveMenuIndex] = useAtom(activeMenuIndexState);
	const [, setActiveSubMenuIndex] = useAtom(activeSubMenuIndexState);

	const handleMenuToggle = (label: string, index: number) => {
		setOpenMenus((prev) => ({
			...prev,
			[label]: !prev[label] // Reverses the opening state of the selected menu
		}));

		// Close all other sub-menus
		setOpenMenus((prev) => {
			const newState = { ...prev };
			Object.keys(prev).forEach((key) => {
				if (key !== label) {
					newState[key] = false;
				}
			});
			return newState;
		});

		setActiveMenuIndex(index);
		setActiveSubMenuIndex(null); // Reset active sub-menu index
	};

	const handleSubMenuToggle = (subIndex: number) => {
		setActiveSubMenuIndex(subIndex);
	};

	return (
		<SidebarGroup>
			<SidebarGroupLabel>{t('sidebar.PLATFORM')}</SidebarGroupLabel>
			<SidebarMenu className={cn('w-full gap-y-0.5', isCollapsed && 'items-center gap-y-1')}>
				{items.map((item, index) => {
					const isActive = isNavItemActive(pathname, item);
					const activeSubItemIndex = findActiveSubItemIndex(pathname, item.items);
					const hasSubItems = Boolean(item.items?.length);
					const rowClassName = cn(
						NAV_ROW_RECIPE,
						isCollapsed && 'justify-center',
						isActive && NAV_ROW_ACTIVE_RECIPE
					);

					return (
						<Collapsible
							key={item.title}
							asChild
							defaultOpen={item.isActive}
							open={item.isActive || openMenus[item.title] || false}
							onOpenChange={() => handleMenuToggle(item.title, index)}
						>
							<SidebarMenuItem>
								{hasSubItems && (
									<CollapsibleTrigger className="cursor-pointer" asChild>
										<SidebarMenuButton
											className={rowClassName}
											isActive={isActive}
											asChild
											tooltip={item.title}
										>
											{item.selectable ? (
												<Link href={item.url}>
													<NavItemContent item={item} isCollapsed={isCollapsed} />
												</Link>
											) : (
												<span>
													<NavItemContent item={item} isCollapsed={isCollapsed} />
												</span>
											)}
										</SidebarMenuButton>
									</CollapsibleTrigger>
								)}
								{!hasSubItems && (
									<SidebarMenuButton
										className={rowClassName}
										isActive={isActive}
										asChild
										tooltip={item.title}
									>
										<Link href={item.url} aria-current={ariaCurrentFor(isActive)}>
											<NavItemContent item={item} isCollapsed={isCollapsed} />
										</Link>
									</SidebarMenuButton>
								)}

								{item.action && !isCollapsed && (
									<SidebarMenuAction
										showOnHover
										aria-label={item.action.label}
										title={item.action.label}
										onClick={item.action.onClick}
										className="right-7 text-muted-foreground"
									>
										{item.action.icon}
									</SidebarMenuAction>
								)}
								{hasSubItems && (
									<>
										<CollapsibleTrigger asChild>
											<SidebarMenuAction
												aria-label={t('sidebar.TOGGLE_GROUP', { name: item.title })}
												className="text-muted-foreground transition-transform duration-150 data-[state=open]:rotate-90 data-panel-open:rotate-90"
											>
												<ChevronRight aria-hidden="true" />
											</SidebarMenuAction>
										</CollapsibleTrigger>
										<CollapsibleContent>
											<SidebarMenuSub className="flex flex-col gap-y-0.5 px-1.5">
												{item.items?.map((subItem, key) => {
													const isSubItemActive = key === activeSubItemIndex;
													const hasActions = Boolean(subItem.actions);
													return (
														<SidebarMenuSubItem
															className={cn(
																'group/sub-row relative w-full',
																isSubItemActive && CURRENT_SUB_ITEM_MARK
															)}
															key={key}
														>
															{subItem?.component || (
																<SidebarMenuSubButton
																	key={`sub-${key}`}
																	isActive={isSubItemActive}
																	className={cn(
																		NAV_SUB_ROW_RECIPE,
																		isSubItemActive && NAV_SUB_ROW_ACTIVE_RECIPE
																	)}
																	onClick={() => handleSubMenuToggle(key)}
																	asChild
																>
																	<Link
																		href={subItem.url}
																		aria-current={ariaCurrentFor(isSubItemActive)}
																		className={cn(
																			'flex h-full w-full items-center gap-2',
																			hasActions && SUB_ROW_LINK_WITH_ACTIONS
																		)}
																	>
																		{subItem.icon && (
																			<span className="flex size-4 shrink-0 items-center justify-center">
																				{subItem.icon}
																			</span>
																		)}
																		<span
																			className={cn(
																				'min-w-0 flex-1 truncate',
																				isCollapsed && 'hidden'
																			)}
																		>
																			{subItem.title}
																		</span>
																		{subItem.trailing && (
																			<span
																				className={cn(
																					SUB_ROW_TRAILING,
																					hasActions &&
																						SUB_ROW_TRAILING_YIELDING
																				)}
																			>
																				{subItem.trailing}
																			</span>
																		)}
																	</Link>
																</SidebarMenuSubButton>
															)}
															{hasActions && (
																<span className={SUB_ROW_ACTIONS}>
																	{subItem.actions}
																</span>
															)}
														</SidebarMenuSubItem>
													);
												})}
											</SidebarMenuSub>
										</CollapsibleContent>
									</>
								)}
							</SidebarMenuItem>
						</Collapsible>
					);
				})}
			</SidebarMenu>
		</SidebarGroup>
	);
});
