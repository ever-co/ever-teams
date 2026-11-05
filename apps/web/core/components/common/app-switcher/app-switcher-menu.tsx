'use client';

import { useTranslations } from 'next-intl';
import { AppsGrid } from '@/core/components/icons/hugeicons';
import { buttonVariants } from '@/core/components/duplicated-components/_button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger
} from '@/core/components/common/dropdown-menu';
import { SelectedMark } from '@/core/components/common/selected-mark';
import { EVER_APPS, isCurrentEverApp, type EverApp } from '@/core/constants/config/ever-apps';
import { cn } from '@/core/lib/helpers';
import { AppGlyph } from './app-glyph';

const TRIGGER_RECIPE =
	'text-muted-foreground data-popup-open:bg-foreground/5 data-popup-open:text-foreground [&_svg]:size-4';

const APP_ROW = 'h-9 gap-2.5';

type AppSwitcherMenuSize = 'icon' | 'icon-sm';

interface AppSwitcherMenuProps {
	side: 'bottom' | 'right';
	align: 'start' | 'end';
	size: AppSwitcherMenuSize;
	className?: string;
}

function AppRowContent({ app }: Readonly<{ app: EverApp }>) {
	const isCurrent = isCurrentEverApp(app);
	return (
		<>
			<AppGlyph app={app} />
			<span className="min-w-0 flex-1 truncate">{app.shortName}</span>
			<span className="truncate text-xs text-muted-foreground">{app.domain}</span>
			<span className="flex size-4 shrink-0 items-center justify-center">{isCurrent && <SelectedMark />}</span>
		</>
	);
}

function AppRow({ app }: Readonly<{ app: EverApp }>) {
	const t = useTranslations();
	const isCurrent = isCurrentEverApp(app);

	if (isCurrent) {
		return (
			<DropdownMenuItem aria-current="page" className={APP_ROW}>
				<AppRowContent app={app} />
			</DropdownMenuItem>
		);
	}

	return (
		<DropdownMenuItem asChild className={APP_ROW}>
			<a href={app.url} target="_blank" rel="noopener noreferrer">
				<AppRowContent app={app} />
				<span className="sr-only">{t('switchers.OPENS_IN_NEW_TAB')}</span>
			</a>
		</DropdownMenuItem>
	);
}

export function AppSwitcherMenu({ side, align, size, className }: Readonly<AppSwitcherMenuProps>) {
	const t = useTranslations();
	const label = t('switchers.SWITCH_APP');

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				aria-label={label}
				title={label}
				className={cn(buttonVariants({ variant: 'ghost', size }), TRIGGER_RECIPE, className)}
			>
				<AppsGrid aria-hidden="true" />
			</DropdownMenuTrigger>
			<DropdownMenuContent side={side} align={align} sideOffset={6} collisionPadding={8} className="w-64">
				<DropdownMenuLabel>{t('switchers.APPS')}</DropdownMenuLabel>
				{EVER_APPS.map((app) => (
					<AppRow key={app.id} app={app} />
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
