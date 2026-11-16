'use client';

import { useTranslations } from 'next-intl';
import { TIMER_REMINDER_HOUR_CHOICES } from '@/core/lib/notifications/timer-reminders';
import { EEmployeeNotificationType } from '@/core/types/interfaces/common/employee-notification';
import { ReminderThresholdRow, ReminderThresholdRowProps } from './reminder-threshold-row';

/**
 * After how long a running timer is worth a reminder (#5022): off, or a number of hours; and, while it is on, the email
 * mode of the reminders the platform sends when no tab of the app shows them, as each kind's row of the page has it.
 */
export function TimerReminderRow(props: Readonly<ReminderThresholdRowProps>) {
	const t = useTranslations();

	return (
		<ReminderThresholdRow
			{...props}
			type={EEmployeeNotificationType.TimerReminder}
			choices={TIMER_REMINDER_HOUR_CHOICES}
			label={t('notifications.SETTINGS_PAGE.TIMER.LABEL')}
			description={t('notifications.SETTINGS_PAGE.TIMER.TEXT')}
			labelOf={(hours) =>
				hours === null
					? t('notifications.SETTINGS_PAGE.TIMER.OFF')
					: t('notifications.SETTINGS_PAGE.TIMER.AFTER_HOURS', { hours })
			}
		/>
	);
}
