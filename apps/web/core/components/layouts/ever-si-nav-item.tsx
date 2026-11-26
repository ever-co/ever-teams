'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAtom } from 'jotai';
import { useTranslations } from 'next-intl';
import { Bot } from '@/core/components/icons/hugeicons';
import {
	SidebarGroup,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar
} from '@/core/components/common/sidebar';
import {
	EVER_SI_PANEL_ID,
	EVER_SI_PATH,
	everSiPanelOpenAtom
} from '@/core/components/features/assistant/atoms/ever-si-panel.atom';
import { isPathActive } from '@/core/lib/utils/navigation-path';
import { cn } from '@/core/lib/helpers';
import { NAV_ROW_ACTIVE_RECIPE, NAV_ROW_RECIPE } from './nav-row-recipe';

function rowClassName(isActive: boolean) {
	return cn(NAV_ROW_RECIPE, 'group-data-[collapsible=icon]:justify-center', isActive && NAV_ROW_ACTIVE_RECIPE);
}

function ariaCurrentFor(isActive: boolean) {
	if (isActive) {
		return 'page' as const;
	}
	return undefined;
}

function RowContent({ label }: Readonly<{ label: string }>) {
	return (
		<>
			<Bot aria-hidden="true" />
			<span className="truncate group-data-[collapsible=icon]:hidden">{label}</span>
		</>
	);
}

/**
 * The "Ever SI" row under Home (spec A7). It opens and closes the Ever SI panel beside the page instead of leaving
 * it; on `/assistant`, where the page is Ever SI, and for a public team page's visitors it stays a link to the page.
 */
export function EverSiNavItem({ publicTeam = false }: Readonly<{ publicTeam?: boolean }>) {
	const t = useTranslations();
	const pathname = usePathname();
	const { isMobile, setOpenMobile } = useSidebar();
	const [isOpen, setIsOpen] = useAtom(everSiPanelOpenAtom);
	const label = t('chatView.ASSISTANT');
	const isOnFullPage = isPathActive(pathname, EVER_SI_PATH);
	const isLink = isOnFullPage || publicTeam;

	const togglePanel = () => {
		const willOpen = !isOpen;
		setIsOpen(willOpen);
		// On phones the sidebar is a sheet over the page: Ever SI opens full screen in its place.
		if (willOpen && isMobile) {
			setOpenMobile(false);
		}
	};

	return (
		<SidebarGroup className="-mt-3">
			<SidebarMenu className="w-full gap-y-0.5 group-data-[collapsible=icon]:items-center">
				<SidebarMenuItem>
					{isLink && (
						<SidebarMenuButton
							asChild
							isActive={isOnFullPage}
							tooltip={label}
							className={rowClassName(isOnFullPage)}
						>
							<Link href={EVER_SI_PATH} aria-current={ariaCurrentFor(isOnFullPage)}>
								<RowContent label={label} />
							</Link>
						</SidebarMenuButton>
					)}
					{!isLink && (
						<SidebarMenuButton
							type="button"
							isActive={isOpen}
							tooltip={label}
							aria-expanded={isOpen}
							aria-controls={EVER_SI_PANEL_ID}
							onClick={togglePanel}
							className={rowClassName(isOpen)}
						>
							<RowContent label={label} />
						</SidebarMenuButton>
					)}
				</SidebarMenuItem>
			</SidebarMenu>
		</SidebarGroup>
	);
}
