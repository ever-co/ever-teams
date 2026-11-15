import { EEmployeeNotificationType } from '@/core/types/interfaces/common/employee-notification';
import { notificationMessageOf } from './task-due-copy';

/** A translator that shows the key and its values, so the test reads what the reader is told. */
const t = ((key: string, values?: Record<string, unknown>) => `${key} ${JSON.stringify(values ?? {})}`) as never;

describe('notificationMessageOf (#5022)', () => {
	it("tells when a day-only due date's task is due, as the reader writes a day", () => {
		const message = notificationMessageOf(t, 'en-US', {
			type: EEmployeeNotificationType.TaskDueReminder,
			message: 'Due by the end of 2026-11-20.'
		});
		expect(message).toBe('notifications.TASK_DUE.BY_END_OF_DAY {"date":"Nov 20, 2026"}');
		expect(
			notificationMessageOf(t, 'fr', {
				type: EEmployeeNotificationType.TaskDueReminder,
				message: 'Due by the end of 2026-11-20.'
			})
		).toBe('notifications.TASK_DUE.BY_END_OF_DAY {"date":"20 nov. 2026"}');
	});

	it('tells the moment a due date names', () => {
		const message = notificationMessageOf(t, 'en-US', {
			type: EEmployeeNotificationType.TaskDueReminder,
			message: 'Due at 2026-11-19 17:00 (Europe/Paris).'
		});
		// In the reader's own zone, whatever zone the test runs in
		const date = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(
			new Date('2026-11-19T16:00:00.000Z')
		);
		expect(message).toBe(`notifications.TASK_DUE.AT ${JSON.stringify({ date })}`);
	});

	it("keeps the platform's text of any other kind, or of a message it cannot read", () => {
		expect(
			notificationMessageOf(t, 'en', {
				type: EEmployeeNotificationType.TaskUpdate,
				message: 'Status: open → done.'
			})
		).toBe('Status: open → done.');
		expect(
			notificationMessageOf(t, 'en', { type: EEmployeeNotificationType.TaskDueReminder, message: 'Soon.' })
		).toBe('Soon.');
		expect(notificationMessageOf(t, 'en', { type: null, message: null })).toBeNull();
	});
});
