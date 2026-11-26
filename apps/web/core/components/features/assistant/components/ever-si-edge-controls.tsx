'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useTranslations } from 'next-intl';
import { Button } from '@/core/components/duplicated-components/_button';
import { useSidebar } from '@/core/components/common/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/core/components/common/tooltip';
import { Bot, ChevronLeft, ChevronRight } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import {
	EVER_SI_DEFAULT_RETURN_PATH,
	EVER_SI_OPEN_BUTTON_ID,
	EVER_SI_PANEL_ID,
	EVER_SI_PATH,
	everSiPanelOpenAtom,
	everSiReturnPathAtom
} from '../atoms/ever-si-panel.atom';
import { everSiPanelModeOf, focusElementSoon } from '../ever-si-panel-mode';

type TooltipSide = 'right' | 'inline-start' | 'inline-end';

/**
 * A small round button that sits on an edge: 24 px, the smallest target WCAG 2.2 allows. Its surface stays opaque,
 * hovered or not, because it lies half over a hairline that must not show through it.
 */
const EDGE_BUTTON_RECIPE =
	'size-6 bg-background p-0 text-muted-foreground hover:bg-background hover:text-foreground dark:bg-background dark:hover:bg-background';

/** Chevrons point where the edge moves; in a right-to-left layout the panel grows the other way. */
const CHEVRON_RECIPE = 'size-3.5 rtl:rotate-180';

function EdgeTooltip({ label, side, children }: Readonly<{ label: string; side: TooltipSide; children: ReactNode }>) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>{children}</TooltipTrigger>
			<TooltipContent side={side}>{label}</TooltipContent>
		</Tooltip>
	);
}

/**
 * The button on the sidebar's edge that opens Ever SI beside the page, shown while it is collapsed. It replaces the
 * sidebar row on desktop; phones, whose sidebar is a sheet with no edge to carry it, keep the row.
 */
export function EverSiOpenButton({ publicTeam = false }: Readonly<{ publicTeam?: boolean }>) {
	const t = useTranslations();
	const pathname = usePathname();
	const { isMobile } = useSidebar();
	const [isOpen, setIsOpen] = useAtom(everSiPanelOpenAtom);
	const label = t('chatView.OPEN_ASSISTANT');

	const isCollapsed = everSiPanelModeOf(pathname, isOpen) === 'collapsed';
	if (publicTeam || isMobile || !isCollapsed) {
		return null;
	}

	const open = () => {
		setIsOpen(true);
		focusElementSoon(EVER_SI_PANEL_ID);
	};

	return (
		<EdgeTooltip label={label} side="right">
			<Button
				id={EVER_SI_OPEN_BUTTON_ID}
				type="button"
				variant="outline"
				aria-label={label}
				aria-expanded={false}
				onClick={open}
				// On the sidebar's free edge, half over the page, as the rail it sits on (`SidebarRail`).
				className={cn(
					EDGE_BUTTON_RECIPE,
					'absolute top-1/2 z-30 size-7 -translate-x-1/2 -translate-y-1/2 active:not-aria-[haspopup]:-translate-y-1/2',
					'group-data-[side=left]:-right-7 group-data-[side=right]:left-0'
				)}
			>
				<Bot aria-hidden="true" className="size-4" />
			</Button>
		</EdgeTooltip>
	);
}

/** On the panel's edge, above the grip: back to the button on the sidebar's edge. */
export function EverSiCollapseButton({ onCollapse }: Readonly<{ onCollapse: () => void }>) {
	const t = useTranslations();
	const label = t('chatView.COLLAPSE_ASSISTANT');

	return (
		<EdgeTooltip label={label} side="inline-end">
			<Button
				type="button"
				variant="outline"
				aria-label={label}
				aria-controls={EVER_SI_PANEL_ID}
				aria-expanded
				onClick={onCollapse}
				className={cn(EDGE_BUTTON_RECIPE, 'absolute -end-2 top-[calc(50%-2.5rem)] z-20')}
			>
				<ChevronLeft aria-hidden="true" className={CHEVRON_RECIPE} />
			</Button>
		</EdgeTooltip>
	);
}

/** On the panel's edge, below the grip: on to the full page, which holds the same conversation. */
export function EverSiExpandLink({ onNavigate }: Readonly<{ onNavigate: () => void }>) {
	const t = useTranslations();
	const label = t('chatView.OPEN_FULL_PAGE');

	return (
		<EdgeTooltip label={label} side="inline-end">
			<Button
				asChild
				variant="outline"
				className={cn(EDGE_BUTTON_RECIPE, 'absolute -end-2 top-[calc(50%+1rem)] z-20')}
			>
				<Link href={EVER_SI_PATH} onClick={onNavigate} aria-label={label}>
					<ChevronRight aria-hidden="true" className={CHEVRON_RECIPE} />
				</Link>
			</Button>
		</EdgeTooltip>
	);
}

/**
 * On the full page's far edge: back to the page Ever SI was widened from, with Ever SI in its panel beside it.
 * Desktop only: on phones there is no "beside", Ever SI is full screen either way.
 */
export function EverSiDockButton() {
	const t = useTranslations();
	const router = useRouter();
	const returnPath = useAtomValue(everSiReturnPathAtom);
	const setIsOpen = useSetAtom(everSiPanelOpenAtom);
	const label = t('chatView.DOCK_ASSISTANT');

	const dock = () => {
		setIsOpen(true);
		router.push(returnPath ?? EVER_SI_DEFAULT_RETURN_PATH);
	};

	return (
		<EdgeTooltip label={label} side="inline-start">
			<Button
				type="button"
				variant="outline"
				aria-label={label}
				onClick={dock}
				className={cn(
					EDGE_BUTTON_RECIPE,
					'absolute end-2 top-1/2 z-10 hidden -translate-y-1/2 active:not-aria-[haspopup]:-translate-y-1/2 md:inline-flex'
				)}
			>
				<ChevronLeft aria-hidden="true" className={CHEVRON_RECIPE} />
			</Button>
		</EdgeTooltip>
	);
}
