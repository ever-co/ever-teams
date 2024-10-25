'use client';

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
	useSidebar
} from '@/components/ui/sidebar';
import Link from 'next/link';

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
		}[];
	}[];
}>) {
	const { state } = useSidebar();
	return (
		<SidebarGroup>
			<SidebarMenu className={cn(state === 'collapsed' ? 'items-center' : '', 'gap-y-5')}>
				{items.map((item) => (
					<Collapsible key={item.title} asChild defaultOpen={item.isActive}>
						<SidebarMenuItem>
							<SidebarMenuButton
								className="hover:bg-[#eaeef4] text-[#1F2937] dark:text-gray-50 data-[active=true]:bg-[#eaeef4] min-h-10 h-10 dark:hover:bg-sidebar-accent px-3 py-2 transition-colors duration-300"
								asChild
								tooltip={item.title}
							>
								<Link href={item.url}>
									<item.icon />
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
											{item.items?.map((subItem) => (
												<SidebarMenuSubItem key={subItem.title}>
													<SidebarMenuSubButton
														className="hover:bg-[#eaeef4] text-[#1F2937] dark:text-gray-50 data-[active=true]:bg-[#eaeef4] min-h-10 h-10 dark:hover:bg-sidebar-accent transition-colors duration-300"
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
