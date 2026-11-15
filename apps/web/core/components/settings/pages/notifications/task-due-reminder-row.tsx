'use client';

import { useTranslations } from 'next-intl';
import { TASK_DUE_REMINDER_HOUR_CHOICES } from '@/core/lib/notifications/task-due-reminders';
import { EEmployeeNotificationType } from '@/core/types/interfaces/common/employee-notification';
import { ReminderThresholdRow, ReminderThresholdRowProps } from './reminder-threshold-row';

/**
 * How long before a task's due date its assignees are reminded of it (#5022): off, or a number of hours; and, while it
 * is on, the email mode of the reminders.
 */
export function TaskDueReminderRow(props: Readonly<ReminderThresholdRowProps>) {
	const t = useTranslations();

	return (
		<ReminderThresholdRow
			{...props}
			type={EEmployeeNotificationType.TaskDueReminder}
			choices={TASK_DUE_REMINDER_HOUR_CHOICES}
			label={t('notifications.SETTINGS_PAGE.TASK_DUE.LABEL')}
			description={t('notifications.SETTINGS_PAGE.TASK_DUE.TEXT')}
			labelOf={(hours) =>
				hours === null
					? t('notifications.SETTINGS_PAGE.TASK_DUE.OFF')
					: t('notifications.SETTINGS_PAGE.TASK_DUE.BEFORE_HOURS', { hours })
			}
		/>
	);
}
