'use client';

import { useId, useState } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { controlRecipe } from '@/core/components/common/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/components/common/popover';
import { Button } from '@/core/components/duplicated-components/_button';
import { ChevronsUpDown, Spinner } from '@/core/components/icons';
import { SettingsRow } from '@/core/components/settings/kit/settings-page';
import { useTimeZoneSetting } from '@/core/hooks/settings/use-time-zone-setting';
import { cn } from '@/core/lib/helpers';
import { timeZoneLabelOf } from '@/core/lib/utils/settings-time-zone';

function TimeZoneListSkeleton() {
	return (
		<div aria-hidden="true" className="flex flex-col gap-2 p-3">
			<span className="h-8 rounded-md bg-foreground/[0.05]" />
			<span className="h-56" />
		</div>
	);
}

const TimeZoneList = dynamic(() => import('./time-zone-list'), { ssr: false, loading: TimeZoneListSkeleton });

const TRIGGER_CLASS = cn(controlRecipe, 'flex h-8 w-full items-center gap-2 px-2.5 text-left text-[13px] sm:w-64');

export function TimeZoneRow() {
	const t = useTranslations();
	const triggerId = useId();
	const [isOpen, setIsOpen] = useState(false);
	const [status, setStatus] = useState('');
	const { currentZone, display, isSaving, saveZone, detect } = useTimeZoneSetting();

	const announce = (zone: string) => {
		const label = timeZoneLabelOf(zone);
		const message = t('settings.preferences.TIME_ZONE_SET', { zone: label });
		setStatus(message);
	};

	const pick = async (zone: string) => {
		setIsOpen(false);
		setStatus('');
		const isSaved = await saveZone(zone);
		if (isSaved) {
			announce(zone);
		}
	};

	const detectZone = async () => {
		setStatus('');
		const zone = await detect();
		if (zone) {
			announce(zone);
		}
	};

	return (
		<SettingsRow
			label={t('settings.preferences.TIME_ZONE')}
			description={t('settings.preferences.TIME_ZONE_DESCRIPTION')}
			htmlFor={triggerId}
			controlClassName="flex-wrap"
		>
			<Popover open={isOpen} onOpenChange={setIsOpen}>
				<PopoverTrigger id={triggerId} className={TRIGGER_CLASS} disabled={isSaving}>
					{display && (
						<>
							<span className="min-w-0 flex-1 truncate text-foreground">{display.label}</span>
							<span className="shrink-0 text-xs text-muted-foreground tabular-nums">
								{t('settings.preferences.UTC_OFFSET', { offset: display.offset })}
							</span>
						</>
					)}
					{!display && (
						<span className="min-w-0 flex-1 truncate text-muted-foreground">
							{t('settings.preferences.TIME_ZONE_PICK')}
						</span>
					)}
					{isSaving && <Spinner className="size-3.5 shrink-0 animate-spin text-muted-foreground" />}
					{!isSaving && <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />}
				</PopoverTrigger>
				<PopoverContent align="end" className="w-[min(20rem,calc(100vw-2rem))] p-0">
					<TimeZoneList currentZone={currentZone} onPick={pick} />
				</PopoverContent>
			</Popover>
			<Button type="button" variant="ghost" size="sm" onClick={detectZone} disabled={isSaving}>
				{t('common.DETECT')}
			</Button>
			<span aria-live="polite" className="sr-only">
				{status}
			</span>
		</SettingsRow>
	);
}
