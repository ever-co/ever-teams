'use client';
import { useAtom } from 'jotai';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
	SidebarGroup,
	SidebarMenu,
	SidebarMenuAction,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	SidebarTriggerButton,
	useSidebar
} from '@/components/ui/sidebar';
import Link from 'next/link';
import { activeMenuIndexState, activeSubMenuIndexState, openMenusState } from '@/app/stores/menu';

export function NavMain({
	items
}: Readonly<{
	items: {
		title: string;
		url: string;
		icon: LucideIcon;
		isActive?: boolean;
		items?: {
			title: string;
			url: string;
			component?: JSX.Element;
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
	return (
		<SidebarGroup>
			<SidebarMenu className={cn(state === 'collapsed' ? 'items-center' : '', 'gap-y-5')}>
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
											'hover:bg-[#eaeef4] text-[#1F2937] items-center dark:text-gray-50 data-[active=true]:bg-[#eaeef4] min-h-10 h-10 dark:hover:bg-sidebar-accent px-3 py-2 transition-colors duration-300',
											state === 'collapsed' ? ' justify-center' : '',
											index === activeMenuIndex
												? 'font-medium bg-[#eaeef4] dark:text-gray-50 dark:bg-sidebar-accent'
												: '!font-normal' // Style for active menu
										)}
										asChild
										tooltip={item.title}
									>
										<span>
											{state === 'collapsed' ? (
												<SidebarTriggerButton className="!p-0 !bg-inherit !text-inherit">
													<item.icon />
												</SidebarTriggerButton>
											) : (
												<item.icon />
											)}

											<span
												className={cn(
													'transition-all font-medium',
													state === 'collapsed' ? 'opacity-0 hidden' : 'opacity-100'
												)}
											>
												{item.title}
											</span>
										</span>
									</SidebarMenuButton>
								</CollapsibleTrigger>
							) : (
								<SidebarMenuButton
									className={cn(
										'hover:bg-[#eaeef4] text-[#1F2937] items-center dark:text-gray-50 data-[active=true]:bg-[#eaeef4] min-h-10 h-10 dark:hover:bg-sidebar-accent px-3 py-2 transition-colors duration-300',
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
												'transition-all font-medium',
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
										<SidebarMenuAction className="data-[state=open]:rotate-90">
											<ChevronRight />
											<span className="sr-only">Toggle</span>
										</SidebarMenuAction>
									</CollapsibleTrigger>
									<CollapsibleContent>
										<SidebarMenuSub className={cn('flex flex-col gap-y-3')}>
											{item.items.map((subItem, key) => (
												<SidebarMenuSubItem key={key}>
													{subItem?.component || (
														<SidebarMenuSubButton
															className={cn(
																'hover:bg-[#eaeef4] text-[#1F2937] dark:text-gray-50 data-[active=true]:bg-[#eaeef4] min-h-10 h-10 dark:hover:bg-sidebar-accent transition-colors duration-300',

																// Style for active sub-menu
																key === activeSubMenuIndex
																	? 'font-medium bg-[#eaeef4] dark:text-gray-50 dark:bg-sidebar-accent'
																	: '!font-light'
															)}
															onClick={() => handleSubMenuToggle(key)}
															asChild
														>
															<Link href={subItem.url}>
																<span
																	className={cn(
																		'transition-all font-medium',
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
