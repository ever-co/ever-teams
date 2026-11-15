'use client';

import { useTranslations } from 'next-intl';
import { TIMER_REMINDER_HOUR_CHOICES } from '@/core/lib/notifications/timer-reminders';
import { EEmployeeNotificationType } from '@/core/types/interfaces/common/employee-notification';
import { EmailModeChoice } from './notification-channel-rows';
import { ReminderChoiceRow } from './reminder-choice-row';

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
	return (
		<ReminderChoiceRow
			type={EEmployeeNotificationType.TimerReminder}
			label={t('notifications.SETTINGS_PAGE.TIMER.LABEL')}
			description={t('notifications.SETTINGS_PAGE.TIMER.TEXT')}
			value={value}
			choices={TIMER_REMINDER_HOUR_CHOICES}
			labelOf={(hours) =>
				hours === null
					? t('notifications.SETTINGS_PAGE.TIMER.OFF')
					: t('notifications.SETTINGS_PAGE.TIMER.AFTER_HOURS', { hours })
			}
			disabled={disabled}
			onChange={onChange}
			emailMode={emailMode}
			onEmailMode={onEmailMode}
		/>
	);
}
