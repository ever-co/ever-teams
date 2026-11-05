'use client';

import { useTranslations } from 'next-intl';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/core/components/common/tooltip';
import { EVER_APPS, isCurrentEverApp, type EverApp } from '@/core/constants/config/ever-apps';
import { useAppSwitcherPlacement } from '@/core/hooks/common/use-app-switcher-placement';
import { cn } from '@/core/lib/helpers';
import { AppGlyph } from './app-glyph';

const TOOLTIP_DELAY_MS = 400;

export const APP_RAIL_WIDTH_CLASS = 'w-12';

/**
 * The fixed sidebar moves right by the rail's `w-12` and, while expanded, drops its own left padding, so the
 * rail and the sidebar read as one column (owner, 2026-11-05: less room between them).
 */
export const APP_RAIL_SIDEBAR_CLASS = 'md:left-12 md:group-data-[state=expanded]:pl-0';

const RAIL_SLOT = 'flex size-10 items-center justify-center rounded-lg';

const RAIL_LINK =
	'outline-none transition-colors hover:bg-foreground/5 focus-visible:ring-[3px] focus-visible:ring-ring/50';

function RailTooltip({ app }: Readonly<{ app: EverApp }>) {
	return (
		<TooltipContent side="right" sideOffset={6}>
			{app.shortName}
		</TooltipContent>
	);
}

function CurrentAppTile({ app }: Readonly<{ app: EverApp }>) {
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
						<AppGlyph app={app} size="md" />
						<span className="sr-only">{t('switchers.CURRENT_APP', { app: app.shortName })}</span>
					</span>
				</TooltipTrigger>
				<RailTooltip app={app} />
			</Tooltip>
		</>
	);
}

function OtherAppTile({ app }: Readonly<{ app: EverApp }>) {
	const t = useTranslations();
	const label = t('switchers.APP_OPENS_IN_NEW_TAB', { app: app.shortName });

	return (
		<Tooltip>
			<TooltipTrigger asChild delay={TOOLTIP_DELAY_MS}>
				<a
					href={app.url}
					target="_blank"
					rel="noopener noreferrer"
					aria-label={label}
					className={cn(RAIL_SLOT, RAIL_LINK)}
				>
					<AppGlyph app={app} size="md" />
				</a>
			</TooltipTrigger>
			<RailTooltip app={app} />
		</Tooltip>
	);
}

function RailTile({ app }: Readonly<{ app: EverApp }>) {
	const isCurrent = isCurrentEverApp(app);
	if (isCurrent) {
		return <CurrentAppTile app={app} />;
	}
	return <OtherAppTile app={app} />;
}

/** Mounted by AppSidebar, which renders on the client only, so the stored placement is known on the first render. */
export function AppRail() {
	const t = useTranslations();
	const placement = useAppSwitcherPlacement();
	const isRailPicked = placement === 'rail';

	if (!isRailPicked) {
		return null;
	}

	return (
		<nav
			aria-label={t('switchers.EVER_APPS')}
			className={cn('hidden h-dvh shrink-0 flex-col overflow-y-auto pt-4 pb-2 md:flex', APP_RAIL_WIDTH_CLASS)}
		>
			<ul className="flex flex-col items-center gap-1">
				{EVER_APPS.map((app) => (
					<li key={app.id} className="relative flex w-full justify-center">
						<RailTile app={app} />
					</li>
				))}
			</ul>
		</nav>
	);
}
