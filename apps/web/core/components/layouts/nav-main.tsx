'use client';
import { useAtom } from 'jotai';
import { ChevronRight, type LucideIcon } from 'lucide-react';
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
import { activeMenuIndexState, activeSubMenuIndexState, openMenusState } from '@/core/stores/common/menu';
import { ReactNode } from 'react';

export function NavMain({
	items
}: Readonly<{
	items: {
		title: string;
		url: string;
		selectable: boolean;
		icon: LucideIcon | React.FC<React.SVGProps<SVGSVGElement>>;
		isActive?: boolean;
		items?: {
			title: string;
			url: string;
			component?: ReactNode;
			icon?: ReactNode;
		}[];
	}[];
}>) {
	const { state } = useSidebar();
	const [openMenus, setOpenMenus] = useAtom(openMenusState);
	const [activeMenuIndex, setActiveMenuIndex] = useAtom(activeMenuIndexState);
	const [activeSubMenuIndex, setActiveSubMenuIndex] = useAtom(activeSubMenuIndexState);

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

	const ItemContent = (props: {
		title: string;
		url: string;
		selectable: boolean;
		icon: LucideIcon | React.FC<React.SVGProps<SVGSVGElement>>;
		isActive?: boolean;
		items?: {
			title: string;
			url: string;
			component?: ReactNode;
			icon?: ReactNode;
		}[];
	}) => {
		return (
			<>
				{state === 'collapsed' ? (
					<SidebarTriggerButton className="!p-0 !bg-inherit !text-inherit">
						<props.icon />
					</SidebarTriggerButton>
				) : (
					<props.icon />
				)}

				<span
					className={cn(
						'transition-all !text-sm',
						state === 'collapsed' ? 'opacity-0 hidden' : 'opacity-100'
					)}
				>
					{props.title}
				</span>
			</>
		);
	};
	return (
		<SidebarGroup>
			<SidebarGroupLabel>Platform</SidebarGroupLabel>
			<SidebarMenu
				className={cn('w-full max-w-[230px]', state === 'collapsed' ? 'items-center gap-y-2' : '', 'gap-y-1')}
			>
				{items.map((item, index) => (
					<Collapsible
						key={item.title}
						asChild
						defaultOpen={item.isActive}
						open={item.isActive || openMenus[item.title] || false}
						onOpenChange={() => handleMenuToggle(item.title, index)}
					>
						<SidebarMenuItem>
							{item.items?.length ? (
								<CollapsibleTrigger className="cursor-pointer" asChild>
									<SidebarMenuButton
										className={cn(
											'hover:bg-[#eaeef4] text-[#1F2937] items-center dark:text-gray-50 data-[active=true]:bg-[#eaeef4] min-h-10 h-10 dark:hover:bg-sidebar-accent px-3 py-2 transition-colors duration-300 !text-sm',
											state === 'collapsed' ? ' justify-center' : '',
											index === activeMenuIndex
												? 'font-medium bg-[#eaeef4] dark:text-gray-50 dark:bg-sidebar-accent'
												: '!font-normal' // Style for active menu
										)}
										asChild
										tooltip={item.title}
									>
										{item.selectable ? (
											<Link href={item.url}>
												<ItemContent {...item} />
											</Link>
										) : (
											<span>
												<ItemContent {...item} />
											</span>
										)}
									</SidebarMenuButton>
								</CollapsibleTrigger>
							) : (
								<SidebarMenuButton
									className={cn(
										'hover:bg-[#eaeef4] text-[#1F2937] items-center dark:text-gray-50 data-[active=true]:bg-[#eaeef4] min-h-10 h-10 dark:hover:bg-sidebar-accent px-3 py-2 transition-colors duration-300 !text-sm',
										state === 'collapsed' ? ' justify-center' : '',
										index === activeMenuIndex
											? 'font-medium bg-[#eaeef4] dark:text-gray-50 dark:bg-sidebar-accent'
											: '!font-normal'
									)}
									asChild
									tooltip={item.title}
								>
									<Link href={item.url}>
										{state === 'collapsed' ? (
											<SidebarTriggerButton className="!p-0 !bg-inherit !text-inherit">
												<item.icon />
											</SidebarTriggerButton>
										) : (
											<item.icon />
										)}
										<span
											className={cn(
												'transition-all text-sm',
												state === 'collapsed' ? 'opacity-0 hidden' : 'opacity-100'
											)}
										>
											{item.title}
										</span>
									</Link>
								</SidebarMenuButton>
							)}

							{item.items?.length ? (
								<>
									<CollapsibleTrigger asChild>
										<SidebarMenuAction className="data-[state=open]:rotate-90 mt-1">
											<ChevronRight />
											<span className="sr-only">Toggle</span>
										</SidebarMenuAction>
									</CollapsibleTrigger>
									<CollapsibleContent>
										<SidebarMenuSub className={cn('flex flex-col !gap-y-1.5 !px-2')}>
											{item.items.map((subItem, key) => (
												<SidebarMenuSubItem className="w-full max-w-[230px]" key={key}>
													{subItem?.component || (
														<SidebarMenuSubButton
															key={`sub-${key}`}
															className={cn(
																'hover:bg-[#eaeef4] text-[#1F2937] dark:text-gray-50 data-[active=true]:bg-[#eaeef4] min-h-10 h-10 dark:hover:bg-sidebar-accent transition-colors duration-300 !text-sm',

																// Style for active sub-menu
																key === activeSubMenuIndex
																	? 'font-medium bg-[#eaeef4] dark:text-gray-50 dark:bg-sidebar-accent'
																	: '!font-normal'
															)}
															onClick={() => handleSubMenuToggle(key)}
															asChild
														>
															<Link
																href={subItem.url}
																className="flex items-center w-full h-full gap-2"
															>
																{subItem.icon && (
																	<div
																		className={cn(
																			'w-8 h-8 border rounded-full flex items-center justify-center'
																		)}
																	>
																		{subItem.icon}
																	</div>
																)}
																<span
																	className={cn(
																		'transition-all !text-sm',
																		state === 'collapsed'
																			? 'opacity-0 hidden'
																			: 'opacity-100'
																	)}
																>
																	{subItem.title}
																</span>
															</Link>
														</SidebarMenuSubButton>
													)}
												</SidebarMenuSubItem>
											))}
										</SidebarMenuSub>
									</CollapsibleContent>
								</>
							) : null}
						</SidebarMenuItem>
					</Collapsible>
				))}
			</SidebarMenu>
		</SidebarGroup>
	);
}
