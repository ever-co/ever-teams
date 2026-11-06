'use client';

import { useTranslations } from 'next-intl';
import {
	SETTINGS_SKELETON_BAR,
	SettingsPageSkeleton,
	SettingsSection,
	SettingsSurface
} from '@/core/components/settings/kit/settings-page';
import { cn } from '@/core/lib/helpers';

const DAY_KEYS = [0, 1, 2, 3, 4, 5, 6];

const DAY_BAR_WIDTHS = ['w-14', 'w-16', 'w-20', 'w-16', 'w-12', 'w-16', 'w-14'];

function WorkingDayRowSkeleton({ index }: Readonly<{ index: number }>) {
	return (
		<div aria-hidden="true" className="flex min-h-14 flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:gap-4">
			<div className="flex items-center gap-3 sm:h-8 sm:w-36 sm:shrink-0">
				<span className="h-6 w-10.5 rounded-full bg-foreground/[0.07]" />
				<span className={cn(SETTINGS_SKELETON_BAR, 'h-2.5', DAY_BAR_WIDTHS[index])} />
			</div>
			<div className="flex flex-1 items-center gap-2">
				<span className="h-8 w-[6.75rem] rounded-md hairline-ring ring-border" />
				<span className="size-3.5" />
				<span className="h-8 w-[6.75rem] rounded-md hairline-ring ring-border" />
			</div>
			<span className="hidden h-8 w-14 items-center justify-end sm:flex">
				<span className={cn(SETTINGS_SKELETON_BAR, 'h-2.5 w-6')} />
			</span>
		</div>
	);
}

export function WorkingWeekSkeleton() {
	const t = useTranslations();
	return (
		<SettingsSection
			title={t('settings.workingHours.SECTION_WEEK')}
			description={t('settings.workingHours.SECTION_WEEK_DESCRIPTION')}
			actions={<span aria-hidden="true" className="h-7 w-44" />}
		>
			<SettingsSurface>
				{DAY_KEYS.map((key) => (
					<WorkingDayRowSkeleton key={key} index={key} />
				))}
			</SettingsSurface>
		</SettingsSection>
	);
}

export function WorkingHoursSettingsSkeleton() {
	const t = useTranslations();
	return (
		<SettingsPageSkeleton
			title={t('settings.entries.workingHours.TITLE')}
			description={t('settings.entries.workingHours.DESCRIPTION')}
		>
			<WorkingWeekSkeleton />
		</SettingsPageSkeleton>
	);
}
