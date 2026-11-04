import * as React from 'react';
import { type LucideIcon } from 'lucide-react';
import Link from 'next/link';

import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar
} from '@/core/components/common/sidebar';

import { cn } from '@/core/lib/helpers';
export function NavSecondary({
	items,
	...props
}: {
	items: {
		title: string;
		url: string;
		icon: LucideIcon;
	}[];
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
	const { state } = useSidebar();
	const isCollapsed = state === 'collapsed';
	return (
		<SidebarGroup {...props}>
			<SidebarGroupContent>
				<SidebarMenu className="gap-y-1">
					{items.map((item) => (
						<SidebarMenuItem key={item.title} className="w-full max-w-[230px]">
							<SidebarMenuButton asChild size="sm" className="w-full max-w-[230px]">
								<Link href={item.url}>
									<item.icon className="size-4" />
									<span
										className={cn(
											'transition-opacity',
											isCollapsed && 'hidden opacity-0',
											!isCollapsed && 'opacity-100'
										)}
									>
										{item.title}
									</span>
								</Link>
							</SidebarMenuButton>
						</SidebarMenuItem>
					))}
				</SidebarMenu>
			</SidebarGroupContent>
		</SidebarGroup>
	);
}
