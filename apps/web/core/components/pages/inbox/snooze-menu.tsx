'use client';

import { type ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/core/components/common/dropdown-menu';
import { SNOOZE_PRESETS, SnoozePreset, snoozeUntil } from '@/core/lib/utils/inbox-entry';

const PRESET_KEYS: Record<SnoozePreset, 'LATER_TODAY' | 'TOMORROW' | 'NEXT_WEEK'> = {
	laterToday: 'LATER_TODAY',
	tomorrow: 'TOMORROW',
	nextWeek: 'NEXT_WEEK'
};

function formatUntil(date: Date, locale: string): string {
	return new Intl.DateTimeFormat(locale, { weekday: 'short', hour: 'numeric', minute: '2-digit' }).format(date);
}

/** The snooze presets (later today, tomorrow, next week) and, for a snoozed entry, "un-snooze". */
export function SnoozeMenu({
	children,
	isSnoozed,
	onSnooze,
	onUnsnooze,
	open,
	onOpenChange
}: Readonly<{
	children: ReactNode;
	isSnoozed: boolean;
	onSnooze: (until: Date) => void;
	onUnsnooze: () => void;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}>) {
	const t = useTranslations();
	const locale = useLocale();
	const now = new Date();

	return (
		<DropdownMenu open={open} onOpenChange={onOpenChange}>
			<DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="min-w-52">
				{SNOOZE_PRESETS.map((preset) => {
					const until = snoozeUntil(preset, now);
					return (
						<DropdownMenuItem key={preset} onClick={() => onSnooze(until)}>
							<span className="flex-1">{t(`inbox.SNOOZE.${PRESET_KEYS[preset]}`)}</span>
							<span className="text-xs text-muted-foreground">{formatUntil(until, locale)}</span>
						</DropdownMenuItem>
					);
				})}
				{isSnoozed && (
					<>
						<DropdownMenuSeparator />
						<DropdownMenuItem onClick={onUnsnooze}>{t('inbox.SNOOZE.UNSNOOZE')}</DropdownMenuItem>
					</>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
