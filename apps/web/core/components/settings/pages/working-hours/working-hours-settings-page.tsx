'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Notice } from '@/core/components/common/notice';
import { Button } from '@/core/components/duplicated-components/_button';
import { Copy } from '@/core/components/icons';
import { SettingsPage, SettingsSection, SettingsSurface } from '@/core/components/settings/kit/settings-page';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { useWorkingHours } from '@/core/hooks/settings/use-working-hours';
import { timeZoneDisplayOf } from '@/core/lib/utils/settings-time-zone';
import { Weekday } from '@/core/lib/utils/settings-working-hours';
import { WorkingDayRow } from './working-day-row';
import { WorkingWeekSkeleton } from './working-hours-settings-skeleton';

const DAY_LABEL_KEYS = {
	monday: 'common.DAYOFWEEK.Monday',
	tuesday: 'common.DAYOFWEEK.Tuesday',
	wednesday: 'common.DAYOFWEEK.Wednesday',
	thursday: 'common.DAYOFWEEK.Thursday',
	friday: 'common.DAYOFWEEK.Friday',
	saturday: 'common.DAYOFWEEK.Saturday',
	sunday: 'common.DAYOFWEEK.Sunday'
} as const satisfies Record<Weekday, string>;

const PREFERENCES_HREF = '/settings/personal/preferences';

function TimeZoneNote() {
	const t = useTranslations();
	const { data: user } = useUserQuery();
	const display = timeZoneDisplayOf(user?.timeZone);
	if (!display) {
		return null;
	}
	return (
		<p className="px-1 text-xs text-muted-foreground">
			{t('settings.workingHours.TIME_ZONE_NOTE', { zone: display.label })}{' '}
			<Link
				href={PREFERENCES_HREF}
				className="rounded-sm font-medium text-primary-ink underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
			>
				{t('settings.workingHours.TIME_ZONE_CHANGE')}
			</Link>
		</p>
	);
}

function WorkingWeekEditor({ userId }: Readonly<{ userId: string }>) {
	const t = useTranslations();
	const { week, saveFailed, setDayWorking, addSlot, removeSlot, changeSlot, copyMondayToWeekdays } =
		useWorkingHours(userId);
	const [status, setStatus] = useState('');

	const copyMonday = () => {
		copyMondayToWeekdays();
		const message = t('settings.workingHours.COPIED_MONDAY');
		setStatus(message);
	};

	return (
		<SettingsSection
			id="working-hours"
			title={t('settings.workingHours.SECTION_WEEK')}
			description={t('settings.workingHours.SECTION_WEEK_DESCRIPTION')}
			actions={
				<Button type="button" variant="ghost" size="sm" onClick={copyMonday}>
					<Copy />
					{t('settings.workingHours.COPY_MONDAY')}
				</Button>
			}
		>
			{saveFailed && (
				<Notice
					tone="error"
					title={t('settings.workingHours.SAVE_FAILED_TITLE')}
					description={t('settings.workingHours.SAVE_FAILED_TEXT')}
				/>
			)}
			<SettingsSurface>
				{week.map((day) => (
					<WorkingDayRow
						key={day.day}
						day={day}
						dayLabel={t(DAY_LABEL_KEYS[day.day])}
						onWorkingChange={setDayWorking}
						onSlotChange={changeSlot}
						onSlotAdd={addSlot}
						onSlotRemove={removeSlot}
					/>
				))}
			</SettingsSurface>
			<TimeZoneNote />
			<p aria-live="polite" className="sr-only">
				{status}
			</p>
		</SettingsSection>
	);
}

export function WorkingHoursSettingsPage() {
	const t = useTranslations();
	const { data: user } = useUserQuery();
	const userId = user?.id;

	return (
		<SettingsPage
			title={t('settings.entries.workingHours.TITLE')}
			description={t('settings.entries.workingHours.DESCRIPTION')}
		>
			{!userId && <WorkingWeekSkeleton />}
			{userId && <WorkingWeekEditor key={userId} userId={userId} />}
		</SettingsPage>
	);
}
