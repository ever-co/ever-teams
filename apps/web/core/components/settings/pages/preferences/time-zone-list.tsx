'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList
} from '@/core/components/common/command';
import { SelectedMark } from '@/core/components/common/selected-mark';
import { timeZoneOptions } from '@/core/lib/utils/settings-time-zone';

type TimeZoneListProps = {
	currentZone: string | null;
	onPick: (zone: string) => void;
};

export default function TimeZoneList({ currentZone, onPick }: Readonly<TimeZoneListProps>) {
	const t = useTranslations();
	const options = useMemo(() => timeZoneOptions(currentZone), [currentZone]);

	return (
		<Command>
			<CommandInput placeholder={t('settings.preferences.TIME_ZONE_SEARCH')} />
			<CommandList className="max-h-72">
				<CommandEmpty>{t('settings.preferences.TIME_ZONE_EMPTY')}</CommandEmpty>
				<CommandGroup>
					{options.map((option) => {
						const isCurrent = option.zone === currentZone;
						return (
							<CommandItem
								key={option.zone}
								value={option.zone}
								keywords={[option.label, `UTC${option.offset}`]}
								onSelect={() => onPick(option.zone)}
							>
								<span className="min-w-0 flex-1 truncate">{option.label}</span>
								<span className="shrink-0 text-xs text-muted-foreground tabular-nums">
									{t('settings.preferences.UTC_OFFSET', { offset: option.offset })}
								</span>
								{isCurrent && <SelectedMark />}
							</CommandItem>
						);
					})}
				</CommandGroup>
			</CommandList>
		</Command>
	);
}
