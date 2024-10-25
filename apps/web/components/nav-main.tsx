'use client';

import { ChevronRight, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
	useSidebar
} from '@/components/ui/sidebar';

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
			<SidebarMenu className={cn(state === 'collapsed' ? 'items-center' : '', 'gap-y-4')}>
				{items.map((item) => (
					<Collapsible key={item.title} asChild defaultOpen={item.isActive}>
						<SidebarMenuItem>
							<SidebarMenuButton asChild tooltip={item.title}>
								<a href={item.url}>
									<item.icon />
									<span
										className={cn(
											'transition-all',
											state === 'collapsed' ? 'opacity-0 hidden' : 'opacity-100'
										)}
									>
										{item.title}
									</span>
								</a>
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
										<SidebarMenuSub>
											{item.items?.map((subItem) => (
												<SidebarMenuSubItem key={subItem.title}>
													<SidebarMenuSubButton asChild>
														<a href={subItem.url}>
															<span
																className={cn(
																	'transition-all',
																	state === 'collapsed'
																		? 'opacity-0 hidden'
																		: 'opacity-100'
																)}
															>
																{subItem.title}
															</span>
														</a>
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
