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
import { useTranslations } from 'next-intl';
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
						'truncate transition-all text-sm',
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
			<SidebarGroupLabel>{t('sidebar.PLATFORM')}</SidebarGroupLabel>
			<SidebarMenu
				className={cn('w-full', state === 'collapsed' ? 'items-center gap-y-1' : '', 'gap-y-0.5')}
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
											'h-8 min-h-8 items-center gap-2.5 rounded-md px-2.5 text-sm text-foreground/90 transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.04] [&>svg]:size-[18px] [&>svg]:shrink-0',
											state === 'collapsed' ? ' justify-center' : '',
											index === activeMenuIndex
												? 'bg-black/[0.06] font-medium text-foreground dark:bg-white/[0.09]'
												: 'font-normal' // Style for active menu
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
										'h-8 min-h-8 items-center gap-2.5 rounded-md px-2.5 text-sm text-foreground/90 transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.04] [&>svg]:size-[18px] [&>svg]:shrink-0',
										state === 'collapsed' ? ' justify-center' : '',
										index === activeMenuIndex
											? 'bg-black/[0.06] font-medium text-foreground dark:bg-white/[0.09]'
											: 'font-normal'
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
												'truncate transition-all text-sm',
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
										<SidebarMenuAction className="text-muted-foreground data-[state=open]:rotate-90">
											<ChevronRight />
											<span className="sr-only">Toggle</span>
										</SidebarMenuAction>
									</CollapsibleTrigger>
									<CollapsibleContent>
										<SidebarMenuSub className={cn('flex flex-col gap-y-0.5 px-1.5')}>
											{item.items.map((subItem, key) => (
												<SidebarMenuSubItem className="w-full" key={key}>
													{subItem?.component || (
														<SidebarMenuSubButton
															key={`sub-${key}`}
															className={cn(
																'h-8 min-h-8 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-black/[0.04] hover:text-foreground dark:hover:bg-white/[0.04]',

																// Style for active sub-menu
																key === activeSubMenuIndex
																	? 'bg-black/[0.06] font-medium text-foreground dark:bg-white/[0.09]'
																	: 'font-normal'
															)}
															onClick={() => handleSubMenuToggle(key)}
															asChild
														>
															<Link
																href={subItem.url}
																className="flex gap-2 items-center w-full h-full"
															>
																{subItem.icon && (
																	<div
																		className={cn(
																			'flex size-5 flex-none shrink-0 items-center justify-center overflow-hidden rounded-md border border-border text-[10px] font-medium uppercase'
																		)}
																	>
																		{subItem.icon}
																	</div>
																)}
																<span
																	className={cn(
																		'truncate transition-all text-sm',
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
