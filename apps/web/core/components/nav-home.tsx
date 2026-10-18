'use client';
import { type LucideIcon } from 'lucide-react';

import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarTriggerButton,
	useSidebar
} from '@/core/components/common/sidebar';
import { useTranslations } from 'next-intl';
import { FC, SVGProps, useState } from 'react';
import { cn } from '../lib/helpers';
import Link from 'next/link';
export function NavHome({
	homeData
}: {
	homeData: {
		url: string;
		icon: LucideIcon | FC<SVGProps<SVGSVGElement>>;
		title: string;
		selectable: boolean;
		label: string;
	}[];
}) {
	const t = useTranslations();

	const { state } = useSidebar();
	const [activeMenuIndex, setActiveMenuIndex] = useState(-1);

	return (
		<SidebarGroup>
			<SidebarGroupLabel>{t('sidebar.FORYOU')}</SidebarGroupLabel>
			<SidebarMenu
				className={cn('w-full', state === 'collapsed' ? 'items-center gap-y-1' : '', 'gap-y-0.5')}
			>
				{homeData.map((item, index) => (
					<SidebarMenuItem key={item.label}>
						<SidebarMenuButton
							className={cn(
								'h-8 min-h-8 items-center gap-2.5 rounded-md px-2.5 text-sm text-foreground/90 transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.04] [&>svg]:size-[18px] [&>svg]:shrink-0',
								state === 'collapsed' ? ' justify-center' : '',
								index === activeMenuIndex
									? 'bg-black/[0.06] font-medium text-foreground dark:bg-white/[0.09]'
									: 'font-normal'
							)}
							onClick={() => setActiveMenuIndex(index)}
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
										'truncate transition-all text-sm',
										state === 'collapsed' ? 'opacity-0 hidden' : 'opacity-100'
									)}
								>
									{item.title}
								</span>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
				))}
			</SidebarMenu>
		</SidebarGroup>
	);
}
