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
				className={cn('w-full max-w-[230px]', state === 'collapsed' ? 'items-center gap-y-2' : '', 'gap-y-1')}
			>
				{homeData.map((item, index) => (
					<SidebarMenuItem key={item.label}>
						<SidebarMenuButton
							className={cn(
								'hover:bg-[#eaeef4] text-[#1F2937] items-center dark:text-gray-50 data-[active=true]:bg-[#eaeef4] min-h-10 h-10 dark:hover:bg-sidebar-accent px-3 py-2 transition-colors duration-300 !text-sm',
								state === 'collapsed' ? ' justify-center' : '',
								index === activeMenuIndex
									? 'font-medium bg-[#eaeef4] dark:text-gray-50 dark:bg-sidebar-accent'
									: '!font-normal'
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
										'transition-all text-sm',
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
