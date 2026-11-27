'use client';

import { useTranslations } from 'next-intl';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/core/components/common/tooltip';
import { EVER_APP_ADD_URL } from '@/core/constants/config/ever-apps';
import { useAppLauncher } from '@/core/hooks/common/use-app-launcher';
import { useAppSwitcherPlacement } from '@/core/hooks/common/use-app-switcher-placement';
import type { LauncherItem } from '@/core/lib/utils/app-launcher';
import { cn } from '@/core/lib/helpers';
import { AddGlyph, AppGlyph } from './app-glyph';

const TOOLTIP_DELAY_MS = 400;

/**
 * The rail and the sidebar read as one column (owner, 2026-11-05: less room between them). The rail is `w-12`;
 * the sidebar after it drops its left padding and, collapsed to icons, narrows its icon column from 4rem to 3rem.
 */
export const APP_RAIL_WIDTH_CLASS = 'w-12 md:[&~.peer]:[--sidebar-width-icon:3rem]';

/** The fixed sidebar moves right by the rail's width. */
export const APP_RAIL_SIDEBAR_CLASS = 'md:left-12 md:pl-0';

const RAIL_SLOT = 'flex size-10 items-center justify-center rounded-lg';

const RAIL_LINK =
	'outline-none transition-colors hover:bg-foreground/5 focus-visible:ring-[3px] focus-visible:ring-ring/50';

function RailTooltip({ label }: Readonly<{ label: string }>) {
	return (
		<TooltipContent side="right" sideOffset={6}>
			{label}
		</TooltipContent>
	);
}

function CurrentAppTile({ item }: Readonly<{ item: LauncherItem }>) {
	const t = useTranslations();
	return (
		<>
			<span
				aria-hidden="true"
				className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary"
			/>
			<Tooltip>
				<TooltipTrigger asChild delay={TOOLTIP_DELAY_MS}>
					<span aria-current="page" className={RAIL_SLOT}>
						<AppGlyph item={item} size="md" />
						<span className="sr-only">{t('switchers.CURRENT_APP', { app: item.name })}</span>
					</span>
				</TooltipTrigger>
				<RailTooltip label={item.name} />
			</Tooltip>
		</>
	);
}

/** Coming soon without a link from this deployment: a tile that says so, never a dead link. */
function UnlinkedAppTile({ item }: Readonly<{ item: LauncherItem }>) {
	const t = useTranslations();
	return (
		<Tooltip>
			<TooltipTrigger asChild delay={TOOLTIP_DELAY_MS}>
				<span className={cn(RAIL_SLOT, 'opacity-60')}>
					<AppGlyph item={item} size="md" />
					<span className="sr-only">{t('switchers.APP_COMING_SOON', { app: item.name })}</span>
				</span>
			</TooltipTrigger>
			<RailTooltip label={item.name} />
		</Tooltip>
	);
}

/** Same tab, as the panel's rows: a plain link (Ctrl/Cmd/middle click still opens a new tab when wanted). */
function OtherAppTile({ item }: Readonly<{ item: LauncherItem }>) {
	return (
		<Tooltip>
			<TooltipTrigger asChild delay={TOOLTIP_DELAY_MS}>
				<a href={item.url} aria-label={item.name} className={cn(RAIL_SLOT, RAIL_LINK)}>
					<AppGlyph item={item} size="md" />
				</a>
			</TooltipTrigger>
			<RailTooltip label={item.name} />
		</Tooltip>
	);
}

/** "+ Add" at the end of the rail: a "+" tile, named by its tooltip, to Ever Platform's page that adds an app. */
function AddAppTile({ href }: Readonly<{ href: string }>) {
	const t = useTranslations();
	const label = t('switchers.ADD_APPS_IN_PLATFORM');
	return (
		<Tooltip>
			<TooltipTrigger asChild delay={TOOLTIP_DELAY_MS}>
				<a href={href} aria-label={label} className={cn(RAIL_SLOT, RAIL_LINK)}>
					<AddGlyph size="md" />
				</a>
			</TooltipTrigger>
			<RailTooltip label={label} />
		</Tooltip>
	);
}

function RailTile({ item }: Readonly<{ item: LauncherItem }>) {
	if (item.isCurrent) {
		return <CurrentAppTile item={item} />;
	}
	if (item.url === '') {
		return <UnlinkedAppTile item={item} />;
	}
	return <OtherAppTile item={item} />;
}

/** Mounted by AppSidebar, which renders on the client only, so the stored placement is known on the first render. */
export function AppRail() {
	const t = useTranslations();
	const placement = useAppSwitcherPlacement();
	const { railItems } = useAppLauncher();
	const isRailPicked = placement === 'rail';

	if (!isRailPicked) {
		return null;
	}

	return (
		<nav
			aria-label={t('switchers.APP_LAUNCHER')}
			className={cn('hidden h-dvh shrink-0 flex-col overflow-y-auto pt-4 pb-2 md:flex', APP_RAIL_WIDTH_CLASS)}
		>
			<ul className="flex flex-col items-center gap-1">
				{railItems.map((item) => (
					<li key={item.key} className="relative flex w-full justify-center">
						<RailTile item={item} />
					</li>
				))}
				{EVER_APP_ADD_URL && (
					<li className="mt-1 flex w-full flex-col items-center gap-1">
						<span aria-hidden="true" className="w-6 hairline-t border-border" />
						<AddAppTile href={EVER_APP_ADD_URL} />
					</li>
				)}
			</ul>
		</nav>
	);
}
