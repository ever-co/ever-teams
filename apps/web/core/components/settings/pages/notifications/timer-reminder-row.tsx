'use client';

import { useId } from 'react';
import { useTranslations } from 'next-intl';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/core/components/common/select';
import { NotificationTypeBadge } from '@/core/components/notifications/notification-type-badge';
import { SettingsRow } from '@/core/components/settings/kit/settings-page';
import { TIMER_REMINDER_HOUR_CHOICES } from '@/core/lib/notifications/timer-reminders';
import { EEmployeeNotificationType } from '@/core/types/interfaces/common/employee-notification';
import { EmailModeChoice, EmailModeSelect } from './notification-channel-rows';

const OFF = 'off';

interface TimerReminderRowProps {
	/** The threshold in hours, null for no reminder. */
	value: number | null;
	disabled?: boolean;
	onChange: (hours: number | null) => void;
	/** How the reminders reach the employee by email, as every other kind's row offers it. */
	emailMode: EmailModeChoice;
	onEmailMode: (mode: EmailModeChoice) => void;
}

/**
 * After how long a running timer is worth a reminder (#5022): off, or a number of hours; and, while it is on, the email
 * mode of the reminders the platform sends when no tab of the app shows them, as each kind's row of the page has it.
 */
export function TimerReminderRow({
	value,
	disabled,
	onChange,
	emailMode,
	onEmailMode
}: Readonly<TimerReminderRowProps>) {
	const t = useTranslations();
	const triggerId = useId();
	const label = t('notifications.SETTINGS_PAGE.TIMER.LABEL');
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
			label={label}
			description={t('notifications.SETTINGS_PAGE.TIMER.TEXT')}
			leading={<NotificationTypeBadge type={EEmployeeNotificationType.TimerReminder} size="md" />}
			htmlFor={triggerId}
			controlClassName="flex-wrap"
		>
			{value !== null && (
				<EmailModeSelect
					value={emailMode}
					allowDefault
					disabled={disabled}
					ariaLabel={`${t('notifications.SETTINGS_PAGE.CHANNELS.MODE_LABEL')}: ${label}`}
					className="w-full sm:w-40"
					onChange={onEmailMode}
				/>
			)}
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
