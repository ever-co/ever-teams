'use client';

import Link from 'next/link';
import { useId } from 'react';
import { useTranslations } from 'next-intl';
import { EverStar } from '@/core/components/icons/ever-star';
import { GridView, Settings } from '@/core/components/icons/hugeicons';
import { buttonVariants } from '@/core/components/duplicated-components/_button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/core/components/common/dropdown-menu';
import { EVER_APP_ADD_URL } from '@/core/constants/config/ever-apps';
import { useAppLauncher } from '@/core/hooks/common/use-app-launcher';
import type { LauncherItem, LauncherSection, LauncherSectionId } from '@/core/lib/utils/app-launcher';
import { cn } from '@/core/lib/helpers';
import { AddGlyph, AppGlyph } from './app-glyph';
import { LauncherChips } from './launcher-chips';

const TRIGGER_RECIPE = 'data-popup-open:bg-foreground/5';

const HOVER_OPEN_DELAY_MS = 120;

const HOVER_CLOSE_DELAY_MS = 200;

/** Two lines, the name and what the app does: 20 + 16 px of text in a 44 px row. */
const APP_ROW = 'h-11 gap-2.5 py-1';

const ACTION_ROW = 'h-9 gap-2.5';

/** Where Manage apps lives: Settings › Preferences, under the position tiles. */
export const MANAGE_APPS_HREF = '/settings/personal/preferences#manage-apps';

const SECTION_LABEL_KEYS = {
	pinned: 'switchers.PINNED',
	ever: 'switchers.EVER_APPS',
	yours: 'switchers.YOUR_APPS'
} as const satisfies Record<LauncherSectionId, string>;

type AppSwitcherMenuSize = 'icon' | 'icon-sm';

/** `mark`: the turning Ever star (sidebar, spec A2). `grid`: the apps grid of the top bar (spec A3). */
type AppSwitcherTrigger = 'mark' | 'grid';

interface AppSwitcherMenuProps {
	side: 'bottom' | 'right';
	align: 'start' | 'end';
	size: AppSwitcherMenuSize;
	trigger: AppSwitcherTrigger;
	className?: string;
}

/** The logo, the name and one line of what the app does. No host: the row says what the app is, not where. */
function AppRowContent({ item }: Readonly<{ item: LauncherItem }>) {
	const t = useTranslations();
	return (
		<>
			<AppGlyph item={item} />
			<span className="flex min-w-0 flex-1 flex-col">
				<span className="flex min-w-0 items-center gap-1.5">
					<span className="min-w-0 truncate leading-5">{item.name}</span>
					<LauncherChips item={item} />
				</span>
				{item.lineKey && (
					<span className="min-w-0 truncate text-xs leading-4 text-muted-foreground">{t(item.lineKey)}</span>
				)}
			</span>
		</>
	);
}

function AppRow({ item }: Readonly<{ item: LauncherItem }>) {
	const isLink = !item.isCurrent && item.url !== '';

	if (item.isCurrent) {
		return (
			<DropdownMenuItem aria-current="page" className={APP_ROW}>
				<AppRowContent item={item} />
			</DropdownMenuItem>
		);
	}

	// Coming soon, and no link from this deployment: listed so the person knows it exists, never a dead link.
	if (!isLink) {
		return (
			<DropdownMenuItem disabled className={APP_ROW}>
				<AppRowContent item={item} />
			</DropdownMenuItem>
		);
	}

	// Same tab (owner, 2026-11-26): a plain link, so Ctrl/Cmd/middle click still opens a new tab when wanted.
	return (
		<DropdownMenuItem asChild className={APP_ROW}>
			<a href={item.url}>
				<AppRowContent item={item} />
			</a>
		</DropdownMenuItem>
	);
}

/** "+ Add", the last row: Ever Platform's page that adds an app of your own, in the same tab. */
function AddAppRow({ href }: Readonly<{ href: string }>) {
	const t = useTranslations();
	const label = t('switchers.ADD_APPS_IN_PLATFORM');
	return (
		<DropdownMenuItem asChild className={ACTION_ROW}>
			<a href={href} aria-label={label} title={label}>
				<AddGlyph />
				<span className="min-w-0 truncate">{t('switchers.ADD_APP')}</span>
			</a>
		</DropdownMenuItem>
	);
}

function AppSection({ section }: Readonly<{ section: LauncherSection }>) {
	const t = useTranslations();
	const labelId = useId();
	return (
		<DropdownMenuGroup aria-labelledby={labelId}>
			<DropdownMenuLabel id={labelId}>{t(SECTION_LABEL_KEYS[section.id])}</DropdownMenuLabel>
			{section.items.map((item) => (
				<AppRow key={item.key} item={item} />
			))}
		</DropdownMenuGroup>
	);
}

function TriggerIcon({ trigger }: Readonly<{ trigger: AppSwitcherTrigger }>) {
	if (trigger === 'grid') {
		return <GridView className="size-4" aria-hidden="true" />;
	}
	return <EverStar className="size-5 motion-safe:animate-[spin_9s_linear_infinite]" />;
}

/** The App Launcher (spec A3): every Ever app and the person's own, as arranged in Manage apps. */
export function AppSwitcherMenu({ side, align, size, trigger, className }: Readonly<AppSwitcherMenuProps>) {
	const t = useTranslations();
	const { panelSections } = useAppLauncher();
	const label = t('switchers.APP_LAUNCHER');

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				openOnHover={trigger === 'mark'}
				delay={HOVER_OPEN_DELAY_MS}
				closeDelay={HOVER_CLOSE_DELAY_MS}
				aria-label={label}
				title={label}
				className={cn(buttonVariants({ variant: 'ghost', size }), TRIGGER_RECIPE, className)}
			>
				<TriggerIcon trigger={trigger} />
			</DropdownMenuTrigger>
			<DropdownMenuContent
				side={side}
				align={align}
				sideOffset={6}
				collisionPadding={8}
				aria-label={label}
				className="w-72"
			>
				<p className="px-2 pt-1.5 pb-1 text-[13px] font-medium text-foreground">{t('switchers.APPS')}</p>
				{panelSections.map((section) => (
					<AppSection key={section.id} section={section} />
				))}
				{EVER_APP_ADD_URL && (
					<>
						<DropdownMenuSeparator />
						<AddAppRow href={EVER_APP_ADD_URL} />
					</>
				)}
				<DropdownMenuSeparator />
				<p className="px-2 py-1.5 text-xs text-pretty text-muted-foreground">
					{t('switchers.LAUNCHER_FOOTER')}
				</p>
				<DropdownMenuItem asChild className="h-8 gap-2.5">
					<Link href={MANAGE_APPS_HREF}>
						<Settings className="size-4 text-muted-foreground" aria-hidden="true" />
						{t('switchers.MANAGE_APPS')}
					</Link>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
