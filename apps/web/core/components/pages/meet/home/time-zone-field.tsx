'use client';

import { useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { controlRecipe } from '@/core/components/common/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/components/common/popover';
import { ChevronsUpDown, Globe } from '@/core/components/icons';
import TimeZoneList from '@/core/components/settings/pages/preferences/time-zone-list';
import { cn } from '@/core/lib/helpers';
import { timeZoneLabelOf, utcOffsetOf } from '@/core/lib/utils/settings-time-zone';

interface TimeZoneFieldProps {
	zone: string;
	/** When the meeting starts, for the zone's offset then (it changes with daylight saving). */
	at: Date;
	onChange: (zone: string) => void;
}

/** The time zone the meeting's date and time are read in, as the inspiration shows it: "London (UTC +00:00)". */
export function TimeZoneField({ zone, at, onChange }: Readonly<TimeZoneFieldProps>) {
	const t = useTranslations();
	const labelId = useId();
	const triggerId = useId();
	const [isOpen, setIsOpen] = useState(false);
	const offset = utcOffsetOf(zone, Number.isNaN(at.getTime()) ? new Date() : at) ?? '+00:00';

	const pick = (picked: string) => {
		onChange(picked);
		setIsOpen(false);
	};

	return (
		<div className="flex flex-col gap-1.5 sm:col-span-2">
			<span id={labelId} className="text-sm font-medium text-foreground">
				{t('settings.preferences.TIME_ZONE')}
			</span>
			<Popover open={isOpen} onOpenChange={setIsOpen}>
				<PopoverTrigger
					id={triggerId}
					aria-labelledby={`${labelId} ${triggerId}`}
					data-testid="meeting-time-zone"
					className={cn(controlRecipe, 'flex h-9 w-full items-center gap-2 px-2.5 text-left text-[13px]')}
				>
					<Globe className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
					<span className="min-w-0 flex-1 truncate text-foreground">{timeZoneLabelOf(zone)}</span>
					<span className="shrink-0 text-xs tabular-nums text-muted-foreground">
						{t('settings.preferences.UTC_OFFSET', { offset })}
					</span>
					<ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
				</PopoverTrigger>
				<PopoverContent align="start" className="w-[min(20rem,calc(100vw-2rem))] p-0">
					<TimeZoneList currentZone={zone} onPick={pick} />
				</PopoverContent>
			</Popover>
		</div>
	);
}
