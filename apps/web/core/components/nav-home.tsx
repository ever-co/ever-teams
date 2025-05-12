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
} from '@/core/components/ui/sidebar';
import { useTranslations } from 'next-intl';
import { FC, ReactNode, SVGProps } from 'react';
import { cn } from '../lib/helpers';
import Link from 'next/link';
import { useAtom } from 'jotai';
import { activeSubMenuIndexState, openMenusState } from '../stores/menu';
import { activeMenuIndexState } from '../stores/menu';
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
