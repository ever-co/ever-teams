import * as React from 'react';
import { type LucideIcon } from 'lucide-react';

import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar
} from '@/components/ui/sidebar';

import { cn } from '@/lib/utils';
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
	return (
		<SidebarGroup {...props}>
			<SidebarGroupContent>
				<SidebarMenu className="gap-y-3">
					{items.map((item) => (
						<SidebarMenuItem key={item.title}>
							<SidebarMenuButton asChild size="sm">
								<a href={item.url}>
									<item.icon className="size-4" />
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
						</SidebarMenuItem>
					))}
				</SidebarMenu>
			</SidebarGroupContent>
		</SidebarGroup>
	);
}
