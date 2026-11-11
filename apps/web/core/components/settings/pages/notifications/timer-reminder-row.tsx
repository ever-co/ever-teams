'use client';

import { useId } from 'react';
import { useTranslations } from 'next-intl';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/core/components/common/select';
import { SettingsRow } from '@/core/components/settings/kit/settings-page';
import { TIMER_REMINDER_HOUR_CHOICES } from '@/core/lib/notifications/timer-reminders';

const OFF = 'off';

interface TimerReminderRowProps {
	/** The threshold in hours, null for no reminder. */
	value: number | null;
	disabled?: boolean;
	onChange: (hours: number | null) => void;
}

/** After how long a running timer is worth a reminder (#5022): off, or a number of hours. */
export function TimerReminderRow({ value, disabled, onChange }: Readonly<TimerReminderRowProps>) {
	const t = useTranslations();
	const triggerId = useId();
	// A threshold saved elsewhere that the list does not offer is still shown as chosen
	const choices =
		value === null || TIMER_REMINDER_HOUR_CHOICES.includes(value)
			? TIMER_REMINDER_HOUR_CHOICES
			: [...TIMER_REMINDER_HOUR_CHOICES, value].sort((a, b) => a - b);
	const labelOf = (hours: number | null) =>
		hours === null
			? t('notifications.SETTINGS_PAGE.TIMER.OFF')
			: t('notifications.SETTINGS_PAGE.TIMER.AFTER_HOURS', { hours });

	return (
		<SettingsRow
			label={t('notifications.SETTINGS_PAGE.TIMER.LABEL')}
			description={t('notifications.SETTINGS_PAGE.TIMER.TEXT')}
			htmlFor={triggerId}
		>
			<Select
				value={value === null ? OFF : String(value)}
				onValueChange={(next) => onChange(next === OFF ? null : Number(next))}
				disabled={disabled}
			>
				<SelectTrigger id={triggerId} className="h-8 w-full text-[13px] sm:w-40">
					<SelectValue>{labelOf(value)}</SelectValue>
				</SelectTrigger>
				<SelectContent>
					{choices.map((hours) => (
						<SelectItem key={hours} value={String(hours)} className="text-[13px]">
							{labelOf(hours)}
						</SelectItem>
					))}
					<SelectItem value={OFF} className="text-[13px]">
						{labelOf(null)}
					</SelectItem>
				</SelectContent>
			</Select>
		</SettingsRow>
	);
}
